# Reflect - Personal Finance Assistant

## Product Overview
Reflect is an AI-powered personal finance application that helps users understand and improve their financial habits. Users import bank transactions via CSV, get AI-assisted categorization, discover recurring payments/subscriptions, and receive personalized insights through "Penny" - an AI chat assistant.

### Key Features
- **Transaction Import** - Upload CSV files from any bank with automatic column mapping
- **AI Categorization** - Gemini-powered suggestions for transaction categories
- **Subscription Detection** - Automatically find recurring payments and subscriptions
- **Penny Chat** - AI assistant that answers financial questions using real data
- **Insight Engine** - Proactive tips, alerts, and celebrations based on user behavior
- **Actions Hub** - Gamified financial improvement goals

---

## Table of Contents
- [Transaction Import (CSV)](#transaction-import-csv)
- [Transaction Categorization](#transaction-categorization)
- [Subscription Detection](#subscription-detection)
- [Penny - AI Chat Assistant](#penny---ai-chat-assistant)
- [Insight Engine](#insight-engine)
- [Actions Page](#actions-page)
- [Transactions Page](#transactions-page)

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

### Data Cleaning
During preview and import:
- Merchant names are cleaned (remove transaction codes, standardize formatting)
- Descriptions are normalized (remove excess whitespace, special characters)
- Amounts are parsed (handles comma/period decimals, currency symbols)
- Dates support multiple formats (DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY, etc.)

## Files
- `src/routes/(protected)/upload-transactions/+page.svelte` - Upload page
- `src/routes/(protected)/upload-transactions/map/+page.svelte` - Column mapping
- `src/routes/(protected)/upload-transactions/import/+page.svelte` - Import execution
- `src/lib/utils/csvParser.ts` - CSV parsing logic
- `src/lib/utils/transactionMapper.ts` - Column detection & mapping

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
│  1. KEYWORD MATCHING (exact merchant name → category)           │
│     ↓ Unmatched transactions                                    │
│  2. IBAN MATCHING (counterparty bank account → merchant)        │
│     ↓ Unmatched transactions                                    │
│  3. MERCHANT NAME MATCHING (similar to previously categorized)  │
│     ↓ Unmatched transactions                                    │
│  4. AI BATCH CATEGORIZATION (Gemini inference)                  │
│     ↓ After each AI batch                                       │
│  5. REMATCH: Re-run steps 1-3 with newly learned keywords       │
│     ↓ Repeat until all done or max iterations                   │
└─────────────────────────────────────────────────────────────────┘
```

## Matching Stages

### 1. Keyword Matching
- Fastest and most reliable method
- Matches cleaned merchant names against a keyword database
- Keywords are linked to categories (e.g., "albert heijn" → Groceries)
- **Merchant name cleaning**: Removes transaction codes, normalizes formatting
- Confidence: 100% (exact match)

### 2. IBAN Matching
- Matches the counterparty's bank account (IBAN) to known merchants
- If a merchant has a known IBAN, all transactions to that IBAN get the merchant's default category
- Useful for: Recurring payments, business accounts
- Confidence: 100% (exact match)

### 3. Merchant Name Matching
- Learns from previously categorized transactions
- If a transaction has the same cleaned merchant name as a previously categorized one, inherit the category
- Prioritizes **manually categorized** transactions (user-confirmed)
- Tracks match count for confidence (e.g., "Albert Heijn → Groceries (12 matches)")
- Confidence: High (based on historical patterns)

### 4. AI Batch Categorization
- Uses Gemini 2.5 Flash for inference
- Processes transactions in batches (default: 10 per batch)
- For each transaction, AI receives: merchant name, description, amount, date
- Returns: suggested category ID + confidence score (0.0-1.0)

## Confidence Thresholds

| Threshold | Behavior |
|-----------|----------|
| ≥ 0.5 (50%) | Auto-assign category |
| < 0.5 | Leave uncategorized for manual review |

Transactions below threshold are flagged for the user to review on the manual categorize page.

## Rematching (Iterative Learning)

After each AI batch:
1. **Reload keywords** from database (may have new entries)
2. **Re-run keyword matching** on remaining uncategorized transactions
3. **Re-run merchant name matching** (new categories may match more transactions)
4. Repeat until: all categorized, no progress, or max iterations (default: 10)

This iterative approach means:
- One AI categorization can "unlock" many keyword matches
- Newly categorized merchants help match similar transactions

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
- `src/lib/server/categorization/geminiCategorizer.ts` - Gemini AI integration
- `src/routes/(protected)/categorize/+page.svelte` - Manual categorization UI
- `src/routes/api/transactions/categorize-batch/+server.ts` - Batch categorization API

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

## Key Files
- `prisma/seedInsights.ts` - Insight definitions seeded to DB
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
The Transactions page (`/transactions`) displays all user transactions with filtering, search, and visualization capabilities.

## Features

### Category Filtering
- URL parameter support: `/transactions?category=5` pre-selects category
- Dropdown filter populated from user's categories
- Integrates with insights - "View category" links from spending insights navigate here with filter applied

### Search & Filters
- Free-text search across merchant names and descriptions
- Date range filtering
- Category dropdown filter
- Amount range filtering

### Visualization
- Spending chart showing trends over time
- Uses shared color configuration from `src/lib/chartColors.ts`

## URL Parameters
| Parameter | Description |
|-----------|-------------|
| `category` | Category ID to pre-select in filter |

## Files
- `src/routes/(protected)/transactions/+page.svelte` - Main page
- `src/routes/(protected)/transactions/+page.ts` - Load function (handles URL params)
