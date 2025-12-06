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
| `get_stats` | Summary stats (top categories, comparisons) |
| `search_transactions` | Free-text search |
| `get_categories` | List available category names |

## How It Works
1. User sends message via `/api/chat`
2. OpenAI receives message + function definitions
3. AI returns `tool_call` if data needed
4. Server executes function against database
5. Results sent back to OpenAI for natural language response
6. Loop continues (max 3 rounds) until text response

## Files
- `src/lib/server/insights/chatFunctions.ts` - Function definitions & handlers
- `src/routes/api/chat/+server.ts` - Function calling loop

## Contextual CTAs
- `[view_category:X]` → `/transactions?category=X`
- `[view_merchant:X]` → `/transactions?merchant=X`
- `[view_month:X]` → `/transactions?month=X`
