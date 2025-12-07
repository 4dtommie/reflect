# Background AI Buffering

## Overview
To address the latency of AI categorization (which can take 2-5 seconds per transaction), we implemented a **Background Buffering** system. This system pre-fetches AI suggestions for the top transactions in the list, ensuring that when a user clicks on a transaction, the suggestions are available instantly.

## How It Works
1.  **Batch API**: A new endpoint `/api/transactions/categorize-batch` accepts a list of transaction IDs and processes them in parallel using Gemini.
2.  **Frontend Buffer**: The `categorize/+page.svelte` component maintains a `Map<number, AIResult>` called `aiBuffer`.
3.  **Pre-loading**:
    -   On page load, the frontend identifies the first 5 uncategorized transactions.
    -   It sends a background request to the batch API.
    -   Results are stored in the `aiBuffer`.
4.  **Instant Access**: When a user clicks a transaction, the modal checks the buffer. If a result exists, it's applied immediately (0ms wait). If not, it falls back to the on-demand fetch.
5.  **Auto-Refill**: After a transaction is categorized and removed from the list, the buffer logic triggers again to fetch the next batch, keeping the buffer full.

## Benefits
-   **Zero Latency**: Users perceive the AI as "instant".
-   **Smoother Workflow**: Eliminates the "click -> wait -> review" friction.
-   **Efficiency**: Batch processing is more token-efficient and faster than individual requests.

## Technical Details
-   **Batch Size**: 5 transactions (configurable).
-   **Model**: Uses `gemini-3-pro-preview` for high-quality reasoning.
-   **State Management**: Uses Svelte 5 runes (`$state`) for reactive buffer management.

---

# AI Function Calling (Penny Chat)

## Overview
Penny can query user financial data dynamically using OpenAI function calling. Questions like "How much did I spend on groceries?" trigger database queries and return accurate answers.

## Available Functions

| Function | Description |
|----------|-------------|
| `get_spending` | Spending totals by category/month/merchant |
| `get_transactions` | List transactions with filters |
| `get_stats` | Summary stats, comparisons, and **yearly trends** |
| `search_transactions` | Free-text search |
| `get_categories` | List available category names |

## How It Works
1. User sends message via `/api/chat`
2. OpenAI receives message + function definitions
3. AI returns `tool_call` if data needed
4. Server executes function against database
5. Results sent back to OpenAI for natural language response
6. Loop continues (max 3 rounds) until text response

## Architecture Note
> **Why Function Calling?**
> We deliberately chose specific function calling (tools) over generic "Text-to-SQL". While Text-to-SQL offers more flexibility, it poses risks for accuracy and security in a fintech context.
>
> **Strategy:**
> *   **Reliability:** Math/aggregation is handled by trusted code, not the LLM.
> *   **Scalability:** We build generic data-fetching functions (like `get_stats(type='monthly_trend')`) rather than specific hardcoded queries.

## Insight Display System
Insights are now visually distinct in the chat with "Badges":

| Category | Badge | Icon | Color |
|----------|-------|------|-------|
| `urgent` | Heads up! | ⚠️ | Red (Error) |
| `action` | Action needed | ⚡ | Amber (Warning) |
| `insight` | Insight | 💡 | Blue (Info) |
| `celebration` | Nice! | 🎉 | Green (Success) |
| `tip` | Tip | ✨ | Primary |

## Files
- `src/lib/server/insights/chatFunctions.ts` - Function definitions & handlers
- `src/routes/api/chat/+server.ts` - Function calling loop
- `src/lib/components/ChatWidget.svelte` - UI rendering & badges

## Contextual CTAs
- `[view_category:X]` → `/transactions?category=X`
- `[view_merchant:X]` → `/transactions?merchant=X`
- `[view_month:X]` → `/transactions?month=X`

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
