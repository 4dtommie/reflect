# Reflect - Personal Finance Assistant

## Product Overview
Reflect is an AI-powered personal finance application that helps users understand and improve their financial habits. Users import bank transactions via CSV, get AI-assisted categorization, discover recurring payments/subscriptions, and receive personalized insights through "Penny" - an AI chat assistant.

### Key Features
- **Transaction Import** - Upload CSV files from any bank with automatic column mapping
- **AI Categorization** - Gemini-powered suggestions for transaction categories
- **Subscription Detection** - Automatically find recurring payments and subscriptions
- **Penny Chat** - AI assistant that answers financial questions using real data
- **Insight Engine** - Proactive tips, alerts, and celebrations based on user behavior
- **Transaction Insights** - Real-time per-transaction observations (refunds, patterns, spending alerts)
- **Actions Hub** - Gamified financial improvement goals
- **Merchant Logos** - Automatic logo display for recognized merchants

---

## Table of Contents
- [Transaction Import (CSV)](#transaction-import-csv)
- [Transaction Categorization](#transaction-categorization)
- [Subscription Detection](#subscription-detection)
- [Penny - AI Chat Assistant](#penny---ai-chat-assistant)
- [Insight Engine](#insight-engine)
- [Transaction Insights](#transaction-insights)
- [Actions Page](#actions-page)
- [Transactions Page](#transactions-page)
- [Merchant Logos](#merchant-logos)

---

# Transaction Import (CSV)

## Overview
Users can import transactions from any bank by uploading a CSV file. The system automatically detects column mappings and validates data before import.

## Import Flow
1. **Upload** (`/upload-transactions`) - Drag & drop or browse for CSV file
2. **Map Columns** (`/upload-transactions/map`) - Auto-detected mappings, user can adjust
3. **Preview** - See cleaned merchant names and normalized descriptions
4. **Import** (`/upload-transactions/import`) - Batch insert into database

## Column Mapping

### Supported Fields
| Field | Required | Description |
|-------|----------|-------------|
| Date | Yes | Transaction date (multiple formats supported) |
| Merchant Name | Yes | Payee/merchant name |
| IBAN | Yes | User's bank account |
| Amount | Yes | Transaction amount |
| Description | Yes | Transaction description |
| Transaction Type | No | Debit/credit indicator |
| Counterparty IBAN | No | Recipient's IBAN |
| Is Debit | No | Boolean debit indicator |
| Category ID | No | Pre-assigned category |

### Auto-Detection
The `transactionMapper.ts` detects columns by matching header names:
- **Date**: "date", "datum", "boekdatum", "transaction date"
- **Amount**: "amount", "bedrag", "value", "sum"
- **Merchant**: "name", "naam", "merchant", "description"
- **IBAN**: "iban", "account", "rekening"

### Pre-Import Data Sanitization

During preview and import, transactions are **cleaned and sanitized** before being stored. This improves categorization accuracy by normalizing merchant names and descriptions.

#### Merchant Name Cleaning (`merchantNameCleaner.ts`)
Removes noise from raw bank merchant names:
- **Transaction codes**: `AH 1234 AMSTERDAM` → `Albert Heijn`
- **PSP/Payment codes**: Removes `CCV*`, `Adyen`, `Stripe` prefixes
- **Store numbers**: `LIDL SCHILDERSW 5765` → `Lidl Schilderswijk`
- **Special mappings**: `NOTPROVIDED` → `ING Spaarrekening`
- **Title case normalization**: Handles Dutch prefixes (`van`, `de`), abbreviations (`AH`, `NS`), and names (`McDonald's`)

#### Description Normalization (`descriptionCleaner.ts`)
Strips transaction metadata from descriptions:
- Removes `Naam: X Omschrijving: Y` patterns (keeps only `Y`)
- Removes timestamps, transaction IDs, card numbers
- Removes invoice/policy/customer numbers
- Normalizes whitespace

Both cleaned values are stored on the transaction (`cleaned_merchant_name`, `normalized_description`) and used throughout the categorization pipeline.

## Files
- `src/routes/(protected)/upload-transactions/+page.svelte` - Upload page
- `src/routes/(protected)/upload-transactions/map/+page.svelte` - Column mapping
- `src/routes/(protected)/upload-transactions/import/+page.svelte` - Import execution
- `src/lib/utils/csvParser.ts` - CSV parsing logic
- `src/lib/utils/transactionMapper.ts` - Column detection & mapping
- `src/lib/server/categorization/merchantNameCleaner.ts` - Merchant name sanitization
- `src/lib/server/categorization/descriptionCleaner.ts` - Description normalization

---

# Transaction Categorization

## Overview
After transactions are imported, they need to be assigned to categories (e.g., Groceries, Transport, Entertainment). Reflect uses a multi-stage categorization pipeline that combines rule-based matching with AI inference to achieve high accuracy while minimizing API costs.

## Categorization Pipeline

The full categorization runs in **iterative rounds** until all transactions are categorized or no more progress is made:

```
┌─────────────────────────────────────────────────────────────────┐
│                     CATEGORIZATION PIPELINE                      │
├─────────────────────────────────────────────────────────────────┤
│  Step 1.5: MERCHANT DEFAULT CATEGORY                            │
│     (if transaction already linked to merchant with category)   │
│     ↓ Unmatched transactions                                    │
│  Step 2: KEYWORD MATCHING (cleaned merchant name → category)    │
│     ↓ Unmatched transactions                                    │
│  Step 2: IBAN MATCHING (counterparty bank account → merchant)   │
│     ↓ Unmatched transactions                                    │
│  Step 3: MERCHANT NAME MATCHING (same name = same category)     │
│     ↓ Unmatched transactions                                    │
│  Step 4: AI BATCH CATEGORIZATION (Gemini inference)             │
│     ↓ After each AI batch                                       │
│     Re-run merchant name matching (newly categorized unlock     │
│     other transactions with same merchant)                      │
│     ↓ Repeat AI batches until all done                          │
│  Step 5: FINAL MERCHANT NAME MATCHING                           │
│     (catch any remaining matches after all AI batches)          │
├─────────────────────────────────────────────────────────────────┤
│                     POST-PROCESSING (optional)                   │
├─────────────────────────────────────────────────────────────────┤
│  Step 6: CONTEXT REFINEMENT (time/amount rules)                 │
│  Step 7: LOW-CONFIDENCE RECATEGORIZATION (background AI review) │
└─────────────────────────────────────────────────────────────────┘
```

## Matching Stages

### Step 1.5: Merchant Default Category
- **Fastest path**: If a transaction is already linked to a merchant (via previous import or IBAN match), and that merchant has a `default_category_id`, use it directly
- Applied before keyword matching to avoid redundant lookups
- Confidence: 100%

### Step 2: Keyword & IBAN Matching
**Keyword matching**:
- Matches **cleaned** merchant names against a keyword database
- Keywords are linked to categories (e.g., `albert heijn` → Groceries)
- Confidence: 100% (exact match)

**IBAN matching**:
- Matches the counterparty's bank account (IBAN) to known merchants
- If a merchant has a known IBAN, all transactions to that IBAN get the merchant's default category
- Useful for: Recurring payments, business accounts
- Confidence: 100% (exact match)

### Step 3: Merchant Name Matching
- Learns from previously categorized transactions
- If a transaction has the same cleaned merchant name as a previously categorized one, inherit the category
- Prioritizes **manually categorized** transactions (user-confirmed)
- Tracks match count for confidence (e.g., `Albert Heijn → Groceries (12 matches)`)
- Confidence: High (based on historical patterns)

### Step 4: AI Batch Categorization
- Uses Gemini 2.5 Flash for inference
- Processes transactions in batches (default: 10 per batch)
- **Merchant deduplication**: Groups transactions by cleaned merchant name, sends 1 representative per merchant to AI, then applies result to all (saves API costs)
- For each transaction, AI receives: cleaned merchant name, description, amount, date
- Returns: suggested category ID + confidence score (0.0-1.0)

**After each AI batch**, merchant name matching is re-run on remaining uncategorized transactions. This allows newly categorized merchants from AI to "unlock" other transactions with the same merchant name.

### Step 5: Final Merchant Name Matching
After all AI batches complete, a **final pass** of merchant name matching runs. This catches edge cases where:
- AI categorized a merchant in the last batch
- Other transactions with that merchant were waiting but not in the AI queue

## Confidence Thresholds

| Threshold | Behavior |
|-----------|----------|
| ≥ 0.5 (50%) | Auto-assign category |
| < 0.5 | Leave uncategorized for manual review |

Transactions below threshold are flagged for the user to review on the manual categorize page.

## Manual Categorization Page

For transactions that couldn't be auto-categorized (or for review), users can:
- Click on a transaction to see AI suggestions
- Select a category and merchant name
- The selection is saved and creates new matching rules for future transactions

### Background Buffering (Pre-fetching)
To provide instant AI suggestions on the manual page:
- Pre-fetch suggestions for the next 5 uncategorized transactions
- Store in a client-side buffer (`aiBuffer` Map)
- When user clicks a transaction, suggestions appear instantly
- Buffer auto-refills after each categorization

## Files
- `src/lib/server/categorization/fullCategorizationService.ts` - Main pipeline orchestration
- `src/lib/server/categorization/categorizationService.ts` - Core categorization logic
- `src/lib/server/categorization/keywordMatcher.ts` - Keyword matching
- `src/lib/server/categorization/ibanMatcher.ts` - IBAN matching
- `src/lib/server/categorization/merchantNameMatcher.ts` - Merchant name matching
- `src/lib/server/categorization/merchantNameCleaner.ts` - Merchant name cleaning
- `src/lib/server/categorization/descriptionCleaner.ts` - Description normalization
- `src/lib/server/categorization/geminiCategorizer.ts` - Gemini AI integration
- `src/lib/server/categorization/contextRefinementService.ts` - Time/amount-based refinement
- `src/lib/server/categorization/lowConfidenceRecategorizationService.ts` - Background AI re-review
- `src/routes/(protected)/categorize/+page.svelte` - Manual categorization UI
- `src/routes/api/transactions/categorize-batch/+server.ts` - Batch categorization API

## Post-Processing Refinement

After the main categorization pipeline, two optional post-processing steps can further refine categories:

### Step 6: Context Refinement (Enabled by Default)

Uses **time** and **amount** to refine categories without AI. Useful for:
- **Food categories** - Same café can be Coffee or Lunch depending on time
- **Multi-category merchants** - Banks with insurance/mortgage/fees, gas stations with fuel/snacks

#### Time-Based Rules
| Rule | Target Category | Time | Amount |
|------|---------------|------|--------|
| Morning coffee | Koffie | 6-11 | €2-8 |
| Midday lunch | Lunch | 11-15 | €5-20 |
| Evening dinner | Uit eten | 17-22 | €15-150 |
| Nightlife | Uitgaan/bars | 21-04 | €5-100 |

#### Amount-Based Rules
| Rule | Target Category | Amount |
|------|---------------|--------|
| Gas station fuel | Brandstof | €25-200 |
| Gas station snack | Snacks | €0.50-5 |
| Bank mortgage | Wonen | €500-3000 |
| Bank insurance | Verzekering | €30-300 |
| Bank fees | Bankkosten | €1-30 |

**Time extraction**: Parses HH:MM patterns from transaction descriptions (e.g., `15:47` from `Pasvolgnr: 904 03-12-2025 15:47 Transactie: C00362`).

### Step 7: Low-Confidence Recategorization (Background, Disabled by Default)

Transactions with **50-65% confidence** (the "uncertain" zone) are sent to OpenAI for a detailed second opinion. This runs **in the background** after the main pipeline completes—users can navigate away and it will continue processing.

| Setting | Value |
|---------|-------|
| **Model** | `gpt-5-mini` (same as manual categorization modal) |
| **Features** | Search grounding, reasoning, cleaned merchant name |
| **Batch size** | 10 transactions |
| **Max per run** | 100 transactions |
| **Apply threshold** | Only applies changes if new confidence ≥ 75% |
| **Enable** | `enableLowConfidenceRecategorization: true` |

The background job logs progress to the console with the 🔄 prefix.

### Options
```typescript
await categorizeAllTransactions(userId, {
  enableContextRefinement: true,      // Default: true
  enableLowConfidenceRecategorization: false // Default: false
});
```

### Logging
Both refinement steps log every category change:
```
✓ [lunch_midday] Starbucks                €  12.50 12:30 : Uit eten → Lunch
```

---

# Subscription Detection

## Overview
The subscription detection system analyzes transaction history to identify recurring payments like subscriptions, bills, salary, and regular transfers. Uses rule-based detection with known merchant lists.

## Detection Methods

### 1. Known Merchant List
Matches transactions against a curated list of subscription services:
- Streaming: Netflix, Spotify, Disney+, HBO, Apple Music
- Utilities: Energy providers, internet, phone carriers
- Insurance: Health, car, home insurance
- Software: Adobe, Microsoft 365, cloud services

### 2. Interval Detection
Groups transactions by merchant/amount and analyzes payment patterns:
- **Monthly** - ~30 day intervals
- **Weekly** - ~7 day intervals
- **Quarterly** - ~90 day intervals
- **Yearly** - ~365 day intervals
- **4-Weekly** - ~28 day intervals (common for salary)

### 3. Income Detection
Special rules for salary detection:
- Minimum amount threshold (€1,000+)
- Keyword matching: "salary", "loon", "salaris", "wages"
- Regular interval patterns
- Positive amounts (credits)

## Candidate Types
| Type | Description |
|------|-------------|
| `subscription` | Streaming, software, memberships |
| `bill` | Utilities, rent, regular invoices |
| `salary` | Income from employment |
| `tax` | Tax payments/refunds |
| `transfer` | Regular transfers between accounts |
| `other` | Unclassified recurring |

## Detection UI
- **Global Modal** - Detection runs in a modal overlay, accessible from any page
- **Progress Indicator** - Loading bar with status messages
- **Results Review** - Users can confirm, edit, or reject detected items

## Files
- `src/lib/server/recurring/recurringDetectionService.ts` - Detection algorithms
- `src/lib/stores/detectionStore.ts` - Global detection state
- `src/lib/components/DetectionModal.svelte` - Progress modal
- `src/routes/(protected)/recurring/+page.svelte` - Recurring overview page
- `src/routes/api/recurring/detect/+server.ts` - Detection API

---

# Penny - AI Chat Assistant

## Overview
Penny is Reflect's AI-powered financial assistant, integrated into the dashboard. Users can ask natural language questions about their finances and receive accurate, data-driven answers. Penny uses OpenAI function calling to query the database and generate personalized responses.

## How It Works

```
User Question → OpenAI → Function Call → Database Query → Results → Natural Language Response
```

1. User sends message via `/api/chat`
2. OpenAI receives message + function definitions
3. AI returns `tool_call` if data is needed
4. Server executes function against user's database
5. Results sent back to OpenAI for natural language response
6. Loop continues (max 3 rounds) until text response

## Available Functions

| Function | Description |
|----------|-------------|
| `get_spending` | Spending totals by category/month/merchant |
| `get_transactions` | List transactions with filters |
| `get_stats` | Summary stats, comparisons, and yearly trends |
| `search_transactions` | Free-text search |
| `get_categories` | List available category names |

## Architecture

> **Why Function Calling over Text-to-SQL?**
> We chose specific function calling (tools) over generic Text-to-SQL for reliability and security in a fintech context.
>
> - **Reliability**: Math/aggregation handled by trusted code, not the LLM
> - **Scalability**: Generic data-fetching functions (like `get_stats(type='monthly_trend')`)

## Widget UI Features

### Smooth Loading
- Fade-in animation on initial load (300ms opacity transition)
- Content hidden until conversation data is fetched

### Typewriter Effect
- New AI responses type out character by character
- Adaptive speed (10-30ms per char) - longer messages type faster
- Blinking cursor (`▊`) during typing
- Action buttons appear only after typing completes
- Auto-scroll follows typing progress

### Message Bubbles
- User messages: Right-aligned, primary color tint, rounded with flat top-right
- Assistant messages: Left-aligned, subtle gray background, rounded with flat top-left
- Simple text links for actions (no button styling)

### Conversation Features
- Time-aware greeting (Good morning/afternoon/evening)
- "Show more" to expand conversation history
- Gradient fade at top when scrollable
- Scroll position tracking (doesn't auto-scroll if user scrolled up)

## Contextual CTAs
Penny can suggest actionable links that navigate to filtered views:
- `[view_category:X]` → `/transactions?category=X`
- `[view_merchant:X]` → `/transactions?merchant=X`
- `[view_month:X]` → `/transactions?month=X`

## Files
- `src/lib/components/ChatWidget.svelte` - Widget component
- `src/routes/api/chat/+server.ts` - Chat API endpoint & function calling loop
- `src/lib/server/insights/chatFunctions.ts` - Function definitions & handlers

---

# Insight Engine

## Overview
The Insight Engine is a data-driven system that evaluates user financial state and generates contextual insights, actions, and celebrations. It serves as the **single source of truth** for actionable items across the app (chat, insight cards, widgets).

## Architecture

```
InsightDefinition (DB) → TriggerEvaluator → EvaluatedInsight → UI
                            ↓
                       InsightData (user financial state)
```

## Schema Updates
The `InsightDefinition` model now includes:
- `name` (String): Human-readable title for the rule
- `description` (String): Short summary for list views

## Key Files
- `prisma/seedInsights.ts` - Insight definitions seeded to DB (now includes `name` and `description`)
- `src/lib/server/insights/insightDataCollector.ts` - Fetches user financial data
- `src/lib/server/insights/triggerEvaluators.ts` - Trigger condition logic
- `src/lib/server/insights/insightEngine.ts` - Orchestrates evaluation
- `src/lib/server/insights/chatContext.ts` - Chat integration

## Trigger Types

| Trigger | Description |
|---------|-------------|
| `no_transactions` | User has 0 transactions |
| `fresh_import` | All transactions are uncategorized (100%) |
| `uncategorized_high` | >20% transactions uncategorized |
| `categorization_complete` | 100% categorized |
| `categorization_good_progress` | 50-99% categorized |
| `payment_due_soon` | Recurring payment due within N days |
| `payment_late` | Recurring payment is overdue |
| `user_streak` | Login streak >= N days |
| `user_inactive` | User inactive for N days |
| `christmas_season` | Current month is December |
| `spending_high_early` | Spent >80% of last month early |
| `savings_positive` | Positive savings this month |
| `same_period_change` | Spending up/down vs same period last month |
| `complete_month_change` | Last month vs 2 months ago comparison |
| `top_category` | Top spending category exceeds threshold |
| `always` | Always fires (fallback tips) |

## Insight Categories
- **Urgent** (80-100 priority) - Late payments, due today
- **Action** (60-79 priority) - Upload, categorize, review
- **Insight** (40-59 priority) - Spending comparisons
- **Celebration** (20-39 priority) - Success messages, streaks
- **Tip** (1-19 priority) - Low-priority helpful hints

## Features

### Non-Exclusive Flag
Insights with `non_exclusive: true` can show alongside other insights (e.g., streak celebrations + action items).

### Login Streaks
Tracked in `hooks.server.ts` on each authenticated request:
- Updates `login_streak` once per calendar day
- Resets to 1 if user misses a day
- Triggers streak celebrations at 5, 7, 30 days

### Chat Integration
`getChatContext()` fetches active insights and includes urgent/action items in the system prompt's "ACTIONABLE RIGHT NOW" section. This ensures Penny suggests the same actions visible as insight cards.

### Related Insights
Celebration insights can link to action insights via `related_insight_id`, creating chains like:
- `no_transactions` → `first_upload_success`
- `fresh_import` → `categorization_good_progress` → `categorization_complete`

## Configuration Page
The insight rules are managed at `/insights` via a master-detail interface:

### Layout
- **List View (1/3 left)**: Scrollable list of rules sorted by priority, with quick status toggles.
- **Detail Panel (2/3 right)**: Editor for the selected rule.

### Editor Features
- **Message Template**: Full-width editor at the top with live variable preview.
- **Quick Settings**: Priority slider, category dropdown, and action buttons.
- **Advanced Settings**: Collapsible section for technical configuration (Rule ID, trigger params, cooldown, contexts).
- **Safe Deletion**: Delete button requires modal confirmation.

---

# Transaction Insights

## Overview
Transaction Insights provide **per-transaction observations** displayed inline on the Transactions page. Unlike global insights, these are evaluated for each individual transaction and highlight patterns, anomalies, and notable events.

## Architecture

```
Transactions → collectTransactionContext() → transactionTriggerEvaluators → TransactionInsight[]
                        ↓
               Context (batched queries):
               - Merchant history
               - Refund matching
               - Recurring patterns
               - Category averages
               - Merchant pairs
```

## API Endpoint
- **POST** `/api/transaction-insights` - Evaluates all visible transactions and returns insights grouped by transaction ID.

## Transaction Triggers

| Trigger | Description | Category |
|---------|-------------|----------|
| `refund_detected` | Credit matches a previous debit (within 60 days) | celebration |
| `weekend_warrior` | Friday/Saturday spending in "fun" categories | insight |
| `merchant_comeback` | First visit to a merchant after 60+ day gap | insight |
| `frequent_flyer` | 5th visit to the same merchant this month | insight |
| `category_spike` | Category spending 2x+ higher than 3-month average | action |
| `holiday_trip` | Cluster of travel/foreign transactions detected | insight |
| `merchant_pair` | Two merchants that frequently appear on the same day | insight |
| `duplicate_transaction` | Same amount + same merchant within 10 minutes | urgent |
| `new_merchant` | First transaction with a merchant | insight |
| `price_hike` | Recurring payment amount increased | action |
| `salary_detected` | Salary/income transaction detected | celebration |
| `large_expense` | Large non-recurring expense (>€500) | action |
| `round_number` | Suspiciously round amount (€50, €100) | roast |
| `late_night` | Transaction between 23:00-05:00 | roast |
| `potential_subscription` | Repeated monthly payment, not yet tracked | action |

## TransactionContext Collection

Context is collected **once** via batched database queries, then shared across all transaction evaluations:

| Context | Description |
|---------|-------------|
| `merchantFirstSeen` | Map of merchant_id → first transaction date |
| `merchantLastSeen` | Map of merchant_id → most recent transaction before current batch |
| `merchantMonthlyCount` | Map of merchant_id → visit count this month |
| `recentByMerchant` | Map of merchant_id → recent transactions (for duplicate/pattern detection) |
| `recurringLastAmount` | Map of recurring_id → last known amount |
| `creditsByAmount` | Map of amount (cents) → credit transactions |
| `debitsByAmount` | Map of amount (cents) → debit transactions |
| `categoryAvgSpending` | Map of category_id → 3-month average spending |
| `merchantPairs` | Map of "id1-id2" → count of same-day occurrences |
| `holidayTransactionIds` | Set of transaction IDs flagged as travel-related |
| `eatingOutMonthlyCount` | Count of eating out transactions this month |
| `eatingOutMonthlyAvg` | Historical average eating out per month |

## UI Display

### TransactionInsightCard Component
- **Compact Badge**: Shows icon + title on hover
- **Expanded Card**: Displays full message + action buttons
- **Category Styling**: Color-coded by insight category (urgent=red, celebration=green, etc.)
- **Actions**: Optional "Track Sub", "View Category" buttons based on insight type

### Integration on Transactions Page
- Insights appear inline next to transaction rows
- Hover reveals expanded insight card with details
- Can dismiss insights or take suggested actions

## Files
- `src/routes/api/transaction-insights/+server.ts` - API endpoint
- `src/lib/server/insights/insightDataCollector.ts` - Context collection (`collectTransactionContext`)
- `src/lib/server/insights/triggerEvaluators.ts` - Trigger evaluators (`transactionTriggerEvaluators`)
- `src/lib/server/insights/insightEngine.ts` - `getTransactionInsightsFlat()`
- `src/lib/components/TransactionInsightCard.svelte` - UI component
- `prisma/seedInsights.ts` - Transaction insight definitions (prefixed with `tx_`)

---

# Actions Page

## Overview
The Actions page (`/actions`) is a gamified hub for financial improvement actions. Users can discover new actions, track in-progress goals, and celebrate completed achievements.

## Layout
- **Header**: Page title with witty random subtitle + impact stats widget (total saved, completed/in-progress counts)
- **Two-column layout**:
  - **Left**: "Your actions" - in-progress cards with progress bars, completed "trophy case"
  - **Right**: "Discover" - filterable grid of available actions with voting

## Features

### Outcome-based Categories
Actions are grouped into 3 outcome categories:
| Category | Color | Examples |
|----------|-------|----------|
| Grow wealth | Green | Budget, savings challenge, emergency fund |
| Community | Blue | Peer comparison, squad goals, karma round-up |
| Mindset | Amber | Latte factor, money habits, future self |

### In-Progress Actions
- Thick progress bar with category-colored gradient
- Icon badge with category color
- Quick action button (e.g., "+ €18", "Add €50")
- Summary text showing current progress

### Discover Section
- Hero card for recommended action
- Category filter pills (All, Grow wealth, Community, Mindset)
- Voting system - users vote for features to build next
- "Show more" expansion for full catalog

### Trophy Case
Completed actions shown in compact list format with saved amounts (e.g., "+€47/mo").

## Files
- `src/routes/(protected)/actions/+page.svelte` - Main page component

---

# Transactions Page

## Overview
The Transactions page (`/transactions`) displays all user transactions with filtering, search, and visualization capabilities. It includes inline transaction insights and automatic internal transfer detection.

## Layout
- **Sidebar (left, 1/3 width)**:
  - Title widget
  - Statistics widget (total, shown, uncategorized counts)
  - Filters widget with search, category, account, and debit/credit filters
- **Main Content (right, 2/3 width)**:
  - Spending chart (bar chart with income/expenses/savings)
  - Transaction list grouped by month and day

## Features

### Category Filtering
- URL parameter support: `/transactions?category=5` pre-selects category
- Hierarchical category matching (parent category includes subcategories)
- `CategorySelector` component with search and grouping
- Integrates with insights - "View category" links from spending insights navigate here with filter applied

### Account Filtering
- Multi-select checkboxes for bank accounts
- Filter transactions by IBAN

### Debit/Credit Filter
- Toggle between All, Expenses only (debit), or Income only (credit)

### Search & Filters
- Free-text search across merchant names, descriptions, and categories
- "Clear all" button when any filter is active

### Internal Transfer Detection
- Automatically identifies transfers between user's own accounts
- Pairs credits and debits that match (same amount, same day, opposite signs)
- Excluded from statistics calculations to avoid double-counting

### Spending Chart
- Stacked bar chart (Income + Expenses + Savings)
- Pan & zoom support via `chartjs-plugin-zoom`
- Initial view shows last 9 months
- Responsive to container size changes
- Chart updates dynamically when filters change (preserves zoom state)

### Transaction List
- Grouped by month with month headers showing totals
- Days grouped within months
- Each transaction shows:
  - Merchant logo (if available)
  - Merchant name and category
  - Amount (color-coded: green for income, red for expenses)
  - Inline transaction insights (hover for details)
- Click transaction to open details modal (or recurring modal if linked)

### Transaction Insights Integration
- Fetches insights via POST to `/api/transaction-insights`
- Displays `TransactionInsightCard` badges inline
- Supports dismiss and action callbacks

## URL Parameters
| Parameter | Description |
|-----------|-------------|
| `category` | Category ID to pre-select in filter |

## Files
- `src/routes/(protected)/transactions/+page.svelte` - Main page
- `src/routes/(protected)/transactions/+page.ts` - Load function (handles URL params)
- `src/lib/utils/transactionAnalysis.ts` - Internal transfer detection
- `src/lib/components/CategorySelector.svelte` - Category filter dropdown

---

# Merchant Logos

## Overview
Reflect displays logos for recognized merchants using the Logo.dev API. Logos are shown in transaction lists, details modals, and recurring items.

## How It Works
1. Merchant name is normalized (lowercase, remove special chars)
2. Lookup in `merchantDomainMap` (curated list of merchant → domain mappings)
3. If found, construct Logo.dev URL with domain
4. `MerchantLogo` component displays logo with fallback to category icon

## Supported Merchants
The system includes mappings for hundreds of Dutch and international merchants:

- **Supermarkets**: Albert Heijn, Jumbo, Lidl, Aldi, Plus, Picnic
- **Retail**: HEMA, Action, Kruidvat, Bijenkorf, Primark
- **Streaming**: Netflix, Spotify, Disney+, YouTube, Viaplay
- **Tech**: Amazon, Bol.com, Coolblue, Apple, Microsoft
- **Transport**: NS, KLM, Uber, Transavia, Swapfiets
- **Telecom**: Ziggo, KPN, Vodafone, T-Mobile, Odido
- **Banks**: ING, Rabobank, ABN AMRO, Bunq
- **And many more...**

## Matching Strategy
1. **Exact match**: "albert heijn" → ah.nl
2. **Prefix match**: "Albert Heijn 1226" → ah.nl
3. **Contains match**: "Something Netflix Something" → netflix.com

## Files
- `src/lib/utils/merchantLogos.ts` - Domain mapping & URL generation
- `src/lib/components/MerchantLogo.svelte` - Logo display component with fallback
