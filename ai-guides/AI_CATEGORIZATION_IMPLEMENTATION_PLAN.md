# AI Categorization Implementation Plan

## Overview

Integrate OpenAI API to categorize transactions that couldn't be matched via keywords. This creates a two-stage categorization system:
1. **Stage 1:** Fast, free keyword matching (already implemented ✅)
2. **Stage 2:** AI categorization for unmatched transactions (to be implemented)

The AI will also suggest keywords that are automatically added to categories, improving keyword matching over time.

---

## Architecture

### Processing Flow

```
1. Load all transactions (filtered by options)
   ↓
2. First Pass: Keyword Matching
   - Match transactions using existing keywords
   - Mark matched transactions
   ↓
3. Second Pass: AI Categorization (NEW)
   - Group unmatched transactions into batches (10-20 per API call)
   - Send each batch to OpenAI
   - Process AI responses
   - Auto-add suggested keywords to database
   ↓
4. Update Database
   - Batch update transactions with categories
   - Store confidence scores
   - Link suggested keywords to transactions
   ↓
5. Return Results
   - Track: keyword matches, AI matches, skipped, errors
```

---

## Step 1: Install OpenAI Package

### Task 1.1: Add OpenAI SDK

**File:** `package.json`

```bash
npm install openai
```

**Dependencies to add:**
- `openai` - Official OpenAI Node.js SDK

---

## Step 2: Environment Configuration

### Task 2.1: Environment Variables

**File:** `.env` (or `.env.local`)

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-...                    # Required: Your OpenAI API key
OPENAI_MODEL=gpt-4o-mini                 # Optional: Model to use (default: gpt-4o-mini)
OPENAI_MAX_TOKENS=2000                   # Optional: Max tokens per request (default: 2000)
OPENAI_TEMPERATURE=0.3                   # Optional: Temperature (0-1, lower = more consistent)
OPENAI_BATCH_SIZE=15                     # Optional: Transactions per API call (default: 15)
OPENAI_MAX_RETRIES=3                     # Optional: Max retries on failure (default: 3)
OPENAI_RETRY_DELAY=1000                  # Optional: Delay between retries in ms (default: 1000)
```

**Notes:**
- `gpt-4o-mini` is recommended for cost-effectiveness (much cheaper than `gpt-4`, still very accurate)
- `gpt-4` can be used for higher accuracy but costs more
- Batch size of 15 balances cost, speed, and token limits

### Task 2.2: Environment Variable Validation

**File:** `src/lib/server/categorization/config.ts` (NEW)

```typescript
export const aiConfig = {
  apiKey: process.env.OPENAI_API_KEY || '',
  model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000'),
  temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.3'),
  batchSize: parseInt(process.env.OPENAI_BATCH_SIZE || '15'),
  maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES || '3'),
  retryDelay: parseInt(process.env.OPENAI_RETRY_DELAY || '1000'),
  enabled: !!process.env.OPENAI_API_KEY // Only enable if API key is set
};

export function validateAIConfig(): void {
  if (!aiConfig.apiKey) {
    throw new Error('OPENAI_API_KEY is not set. AI categorization is disabled.');
  }
}
```

---

## Step 3: Create AI Categorizer Service

### Task 3.1: AI Categorizer Service

**File:** `src/lib/server/categorization/aiCategorizer.ts` (NEW)

**Key Functions:**

1. **`loadCategoriesForAI()`** - Load all categories with descriptions for AI prompt
2. **`createCategorizationPrompt()`** - Build the prompt with categories and transactions
3. **`categorizeBatchWithAI()`** - Send batch to OpenAI and parse response
4. **`addSuggestedKeywords()`** - Auto-add AI-suggested keywords to database

**Interface:**

```typescript
export interface AICategorizationRequest {
  transactionId: number;
  description: string;
  merchantName: string;
  amount: number;
  type: string;
  date: string;
}

export interface AICategorizationResult {
  transactionId: number;
  categoryId: number | null;
  confidence: number; // 0.0 - 1.0
  suggestedKeywords: string[]; // 1-3 keywords suggested by AI
  reasoning?: string; // Optional: Why this category was chosen
}

export interface AICategorizationBatchResult {
  results: AICategorizationResult[];
  errors: Array<{
    transactionId: number;
    error: string;
  }>;
  tokensUsed?: number;
  cost?: number; // Estimated cost in USD
}
```

**Implementation Details:**

1. **Category Loading:**
   - Load all categories (system + user's) with descriptions
   - Format as JSON array for prompt
   - Include category groups for context

2. **Prompt Design:**
   ```
   You are a financial transaction categorizer. Your task is to categorize transactions into the most appropriate category.

   Available Categories:
   [JSON array of categories with id, name, description, group]

   Transaction Data:
   [JSON array of transactions with id, description, merchantName, amount, type, date]

   For each transaction, return:
   - categoryId: The ID of the most appropriate category (or null if truly uncategorizable)
   - confidence: Your confidence level (0.0 to 1.0)
   - suggestedKeywords: 1-3 keywords that would help match similar transactions in the future
   - reasoning: Brief explanation of why this category was chosen

   Return a JSON array with one object per transaction, in the same order as input.
   ```

3. **Structured Output:**
   - Use OpenAI's structured outputs (JSON mode) for consistent responses
   - Validate response format with Zod schema
   - Handle malformed responses gracefully

4. **Error Handling:**
   - Retry on rate limits (with exponential backoff)
   - Retry on network errors
   - Skip individual transactions on parsing errors
   - Log all errors for debugging

5. **Cost Tracking:**
   - Estimate cost based on tokens used
   - Log costs for monitoring
   - Consider cost limits (future enhancement)

---

## Step 4: Integrate AI into Categorization Service

### Task 4.1: Update Categorization Service

**File:** `src/lib/server/categorization/categorizationService.ts`

**Changes:**

1. **Add AI categorization option:**
   ```typescript
   export interface CategorizationOptions {
     // ... existing options
     useAI?: boolean; // Enable AI categorization (default: true if API key is set)
     aiBatchSize?: number; // Override default batch size
   }
   ```

2. **Update `categorizeTransactionsBatch()` function:**
   - After keyword matching, collect unmatched transactions
   - If `useAI !== false` and API key is set:
     - Group unmatched transactions into AI batches
     - Process each batch with AI
     - Merge AI results with keyword results
   - Track AI categorization count separately

3. **Update result tracking:**
   ```typescript
   export interface CategorizationBatchResult {
     total: number;
     processed: number;
     categorized: number; // Total categorized (keyword + AI)
     keywordCategorized: number; // Categorized via keywords
     aiCategorized: number; // Categorized via AI
     skipped: number;
     results: CategorizationResult[];
   }
   ```

4. **Update progress callbacks:**
   - Include `aiCategorized` count in progress updates
   - Show AI processing status in messages

---

## Step 5: Update API Endpoint

### Task 5.1: Update Stream Endpoint

**File:** `src/routes/api/transactions/categorize/stream/+server.ts`

**Changes:**

1. **Add AI categorization option to request:**
   ```typescript
   {
     useAI?: boolean; // Default: true if API key is set
     aiBatchSize?: number; // Optional override
   }
   ```

2. **Update progress messages:**
   - Include `aiCategorized` in progress updates
   - Show AI processing status: "Processing with AI...", "AI categorization complete"

3. **Update final result:**
   - Include `aiCategorized` count
   - Show breakdown: "X categorized with keywords, Y with AI"

---

## Step 6: Update UI

### Task 6.1: Update Progress Display

**File:** `src/routes/(protected)/enrich/categorize/+page.svelte`

**Changes:**

1. **Update progress state:**
   ```typescript
   let progress = $state<{
     processed: number;
     total: number;
     categorized: number;
     keywordCategorized: number; // NEW
     aiCategorized: number; // NEW
     skipped: number;
     notCategorized: number;
     message?: string;
   } | null>(null);
   ```

2. **Update stats display:**
   - Show "Keyword categorized" count (existing "Categorized")
   - Show "AI categorized" count (currently hardcoded to 0)
   - Update to use actual `aiCategorized` value

3. **Add AI status indicator:**
   - Show "AI processing..." when AI is active
   - Show estimated cost (optional, if tracked)

---

## Step 7: Auto-Add Suggested Keywords

### Task 7.1: Keyword Auto-Add Logic

**File:** `src/lib/server/categorization/aiCategorizer.ts`

**Function:** `addSuggestedKeywords()`

**Logic:**

1. For each AI result with `suggestedKeywords`:
   - Check if keyword already exists for that category
   - If not, create new `category_keywords` entry with:
     - `source: "ai"`
     - `source_transaction_id: transactionId`
     - `confidence: result.confidence`
   - Handle duplicates gracefully (skip if exists)

2. **Batch insert keywords:**
   - Collect all new keywords
   - Use `createMany()` with `skipDuplicates: true`
   - Log keywords added

3. **Validation:**
   - Filter out empty keywords
   - Normalize keywords (lowercase, trim)
   - Limit to 3 keywords per transaction (as suggested by AI)

---

## Step 8: Error Handling & Retries

### Task 8.1: Robust Error Handling

**File:** `src/lib/server/categorization/aiCategorizer.ts`

**Error Scenarios:**

1. **API Key Missing:**
   - Log warning
   - Skip AI categorization
   - Continue with keyword matching only

2. **Rate Limits:**
   - Detect 429 status code
   - Wait with exponential backoff
   - Retry up to `maxRetries` times
   - See `PARALLEL_PROCESSING_AND_API_LIMITS.md` for rate limit details and parallel processing options

3. **Network Errors:**
   - Retry with exponential backoff
   - Log error but continue processing

4. **Invalid Responses:**
   - Validate response format
   - Skip malformed transactions
   - Log errors for debugging
   - Continue with remaining transactions

5. **Token Limits:**
   - Monitor token usage
   - Reduce batch size if needed
   - Log warnings

**Retry Logic:**

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  delay: number
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // Check if it's a rate limit error
      if (error.status === 429) {
        const waitTime = delay * Math.pow(2, i); // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        throw error; // Don't retry non-rate-limit errors
      }
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

## Step 9: Testing Strategy

### Task 9.1: Unit Tests (Optional but Recommended)

**Test Cases:**

1. **Prompt Generation:**
   - Test `createCategorizationPrompt()` with various inputs
   - Verify category list is included
   - Verify transaction data is formatted correctly

2. **Response Parsing:**
   - Test parsing of valid AI responses
   - Test handling of malformed responses
   - Test handling of missing fields

3. **Keyword Auto-Add:**
   - Test adding new keywords
   - Test skipping duplicate keywords
   - Test handling invalid keywords

### Task 9.2: Integration Tests

**Test Scenarios:**

1. **Full Categorization Flow:**
   - Upload test transactions
   - Run categorization (keyword + AI)
   - Verify results
   - Verify keywords were added

2. **Error Handling:**
   - Test with invalid API key
   - Test with rate limits (mock)
   - Test with network errors (mock)

3. **Cost Tracking:**
   - Verify cost estimates are reasonable
   - Test with different batch sizes

### Task 9.3: Manual Testing

**Test Cases:**

1. **Small Batch (5-10 transactions):**
   - Verify AI categorization works
   - Check suggested keywords are added
   - Verify confidence scores are stored

2. **Large Batch (100+ transactions):**
   - Verify batching works correctly
   - Check progress updates
   - Verify all transactions are processed

3. **Edge Cases:**
   - Transactions with unusual descriptions
   - Transactions that don't fit any category
   - Very long descriptions
   - Special characters in descriptions

---

## Step 10: Cost Optimization

### Task 10.1: Cost Monitoring

**Strategies:**

1. **Use `gpt-4o-mini`:**
   - Much cheaper than `gpt-4` (~$0.15 per 1M input tokens vs ~$5)
   - Still very accurate for categorization

2. **Batch Size:**
   - 15 transactions per batch balances cost and accuracy
   - Larger batches = fewer API calls = lower cost
   - But larger batches = more tokens per call

3. **Token Optimization:**
   - Only include essential category info in prompt
   - Truncate very long descriptions if needed
   - Use concise category descriptions

4. **Skip AI for Obvious Cases:**
   - If keyword matching already categorizes most transactions, AI is only for edge cases
   - Consider confidence threshold: only use AI if keyword confidence is low (future)

5. **Cost Tracking:**
   - Log estimated costs
   - Consider adding cost limits (future)
   - Monitor usage over time

**Estimated Costs:**
- `gpt-4o-mini`: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- Average prompt: ~2000 tokens (15 transactions + categories)
- Average response: ~500 tokens (15 categorizations)
- Cost per batch: ~$0.0005 (very cheap!)
- 1000 transactions: ~67 batches = ~$0.03

---

## Implementation Order

### Phase 1: Foundation (Steps 1-3)
1. Install OpenAI package
2. Set up environment variables
3. Create AI categorizer service with basic functionality

### Phase 2: Integration (Steps 4-5)
4. Integrate AI into categorization service
5. Update API endpoint

### Phase 3: UI & Features (Steps 6-7)
6. Update UI to show AI categorization
7. Implement auto-add suggested keywords

### Phase 4: Polish (Steps 8-10)
8. Add robust error handling and retries
9. Testing
10. Cost optimization

---

## Success Criteria

✅ AI categorization works for unmatched transactions  
✅ Suggested keywords are automatically added to categories  
✅ Confidence scores are stored in transactions  
✅ Progress updates show AI categorization count  
✅ Error handling gracefully handles API failures  
✅ Cost is reasonable (< $0.10 per 1000 transactions)  
✅ System falls back to keyword-only if API key is missing  

---

## Future Enhancements

1. **Confidence-Based Review:**
   - Flag low-confidence AI categorizations for user review
   - Allow users to approve/reject AI suggestions

2. **Learning from User Corrections:**
   - When user changes AI-suggested category, learn from it
   - Update keywords based on user corrections

3. **Cost Limits:**
   - Set monthly cost limits
   - Pause AI categorization if limit reached

4. **Model Selection:**
   - Allow users to choose model (gpt-4o-mini vs gpt-4)
   - Balance cost vs accuracy

5. **Batch Size Optimization:**
   - Automatically adjust batch size based on token usage
   - Optimize for cost or speed

6. **Caching:**
   - Cache category lists (they don't change often)
   - Reduce token usage

---

## Notes

- **Start Simple:** Begin with basic AI integration, add features incrementally
- **Monitor Costs:** Track API usage and costs from the start
- **Fallback Gracefully:** System should work without AI (keyword-only mode)
- **User Control:** Allow users to enable/disable AI categorization
- **Privacy:** Transaction data is sent to OpenAI - ensure users are aware (add to privacy policy if needed)

---

## Files to Create/Modify

### New Files:
1. `src/lib/server/categorization/aiCategorizer.ts` - AI categorization service
2. `src/lib/server/categorization/config.ts` - Configuration management

### Modified Files:
1. `package.json` - Add `openai` dependency
2. `.env` - Add OpenAI environment variables
3. `src/lib/server/categorization/categorizationService.ts` - Integrate AI
4. `src/routes/api/transactions/categorize/stream/+server.ts` - Update API
5. `src/routes/(protected)/enrich/categorize/+page.svelte` - Update UI

---

**Status:** Ready for implementation  
**Estimated Time:** 4-6 hours  
**Priority:** High (completes core categorization feature)

