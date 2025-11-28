# AI Prompt & Batching Refinement

## Summary

We've refined the AI categorization prompt and batching strategy. Here's what was implemented:

## Prompt Design

### Structure

The prompt is organized into clear sections:

1. **Category Organization**
   - Categories grouped by type (Income, Essential Expenses, Lifestyle, Financial, Other)
   - Parent categories marked as "organizational - use subcategories below"
   - Subcategories clearly indented under parents
   - Each category shows: ID, Name, Description

2. **Transaction Format**
   - Numbered list for easy reference
   - Includes: Description, Merchant, Amount, Type
   - Truncates very long descriptions (200 chars) and merchant names (100 chars)
   - Shows transaction type (expense/income) clearly

3. **Instructions**
   - Clear rules about using subcategories
   - Income vs expense category restrictions
   - Confidence scoring guidelines
   - Keyword suggestion requirements

### Example Prompt Structure

```
You are a financial transaction categorizer. Categorize each transaction into the most appropriate category.

INCOME CATEGORIES:
  1. Salary - Regular employment income
  2. Freelance/Contract - Freelance or contract work income
  ...

ESSENTIAL EXPENSES:
  7. Food & Groceries (organizational - use subcategories below)
     Food & Groceries - Parent category description
     7a. Supermarket - Large grocery stores...
     7b. Butcher - Butcher shops...
  ...

Transactions to categorize:
1. Transaction ID 123
   Description: Payment at Albert Heijn store
   Merchant: ALBERT HEIJN 1234 AMSTERDAM
   Amount: €45.67 (expense)
   Type: Payment

2. Transaction ID 124
   ...
```

### Response Format

The AI returns a JSON object with this structure:

```json
{
  "results": [
    {
      "transactionId": 123,
      "categoryId": 45,
      "confidence": 0.85,
      "suggestedKeywords": ["albert heijn", "supermarket", "groceries"],
      "reasoning": "Albert Heijn is a Dutch supermarket chain"
    }
  ]
}
```

## Batching Strategy

### Current Implementation

- **Fixed Batch Size:** 10 transactions per API call (configurable via `OPENAI_BATCH_SIZE`, default reduced from 15)
- **Sequential Processing:** Batches processed one at a time
- **Token Management:** Descriptions truncated if >200 chars, merchant names if >100 chars

### Why 10 Transactions? (Reduced from 15)

- **Accuracy:** Larger batches (>12 transactions) cause AI to make mistakes, mix up transaction IDs, or lose track of details
- **Token Efficiency:** ~1500 tokens per batch (well under limits)
- **Cost Effective:** Still cost-efficient with smaller batches
- **Speed:** Good balance between speed and accuracy
- **Model-Specific Recommendations:**
  - GPT-5 Nano: 12 transactions (newest, economical)
  - GPT-5 Mini: 15 transactions (newest, recommended)
  - GPT-5: 18 transactions (newest, highest accuracy)
  - GPT-3.5 Turbo: 8 transactions (older model)
  - GPT-4o Mini: 10 transactions (previous gen)
  - GPT-4o: 12 transactions (previous gen)
  - GPT-4: 15 transactions (previous gen)

**Important:** The prompt includes a warning when batch size > 12 to remind the AI to be extra careful with transaction IDs.

### Future Enhancements

1. **Dynamic Batching:** Estimate tokens and adjust batch size
2. **Parallel Processing:** Process multiple batches concurrently (with rate limit handling)
   - See `PARALLEL_PROCESSING_AND_API_LIMITS.md` for details
3. **Smart Truncation:** Keep important parts of long descriptions

## Error Handling

### Retry Logic

- **Exponential Backoff:** Waits 1s, 2s, 4s between retries
- **Retryable Errors:** Rate limits (429), server errors (5xx), network errors
- **Max Retries:** 3 attempts (configurable)

### Response Validation

- **JSON Parsing:** Validates response is valid JSON
- **Structure Validation:** Ensures "results" array exists
- **Field Validation:** Validates each result has required fields
- **Transaction Matching:** Verifies all transactions got results
- **Error Collection:** Collects errors for transactions that failed

## Token Management

### Current Approach

- **Truncation:** Long descriptions/merchants are truncated
- **Category List:** Full category list included (one-time cost per batch)
- **Token Tracking:** Logs prompt, completion, and total tokens

### Token Estimates

- **Categories:** ~500-800 tokens (depends on number of categories)
- **Per Transaction:** ~50-100 tokens (depends on description length)
- **Batch of 15:** ~1500-2500 tokens total
- **Response:** ~300-500 tokens (15 categorizations)

## Cost Optimization

### Current Settings

- **Model:** `gpt-4o-mini` (previous gen, cheapest option)
- **Temperature:** 0.3 (consistent results)
- **Max Tokens:** 2000 (sufficient for responses)

### Cost Estimates

**GPT-5 Models (Newest):**
- **GPT-5 Nano:** Check OpenAI pricing (most economical)
- **GPT-5 Mini:** Check OpenAI pricing (best balance)
- **GPT-5:** Check OpenAI pricing (highest accuracy)

**Previous Generation:**
With `gpt-4o-mini`:
- **Input:** ~$0.15 per 1M tokens
- **Output:** ~$0.60 per 1M tokens
- **Per Batch (10 transactions):** ~$0.0003
- **Per 1000 transactions:** ~$0.03

**Note:** GPT-5 pricing may be more competitive. Check https://openai.com/api/pricing/ for current rates.

## Testing the Prompt

### Test Cases to Consider

1. **Clear Matches:** Transactions with obvious categories
2. **Edge Cases:** Unusual merchants, ambiguous descriptions
3. **Subcategories:** Verify AI uses subcategories, not parents
4. **Income vs Expense:** Verify correct category type is used
5. **Uncategorizable:** Transactions that don't fit any category
6. **Keyword Quality:** Check if suggested keywords are useful

### Manual Testing

1. Create a small batch (5-10 transactions)
2. Run categorization
3. Check:
   - Are categories correct?
   - Are subcategories used (not parents)?
   - Are confidence scores reasonable?
   - Are keywords useful?
   - Is reasoning helpful?

## Next Steps

1. **Test with Real Data:** Run on actual transactions
2. **Refine Based on Results:** Adjust prompt if needed
3. **Monitor Costs:** Track actual token usage
4. **Collect Feedback:** See which categorizations are wrong
5. **Iterate:** Improve prompt based on errors

## Files Modified

- `src/lib/server/categorization/aiCategorizer.ts` - Main implementation
- `src/lib/server/categorization/config.ts` - Configuration

## Configuration Options

All configurable via environment variables:

```env
OPENAI_API_KEY=sk-...              # Required
OPENAI_MODEL=gpt-5-mini             # Default (newest, best balance)
# Options: gpt-5-nano (most economical), gpt-5-mini (recommended), gpt-5 (highest accuracy)
# Previous gen: gpt-4o-mini, gpt-4o, gpt-4, gpt-3.5-turbo
OPENAI_MAX_TOKENS=2000             # Default
OPENAI_TEMPERATURE=0.3             # Default
OPENAI_BATCH_SIZE=15               # Default
OPENAI_MAX_RETRIES=3               # Default
OPENAI_RETRY_DELAY=1000            # Default (ms)
```

