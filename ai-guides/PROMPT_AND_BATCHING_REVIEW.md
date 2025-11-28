# Prompt & Batching Strategy Review

## Part 1: Prompt Structure Review

### Current Prompt Structure

The prompt is divided into clear sections:

#### 1. System Message (to OpenAI)
```
You are a financial transaction categorizer. Always respond with valid JSON only. 
Return a JSON object with a "results" array.
```

#### 2. Category List Section

**Organization:**
- Categories grouped by type (Income, Essential, Lifestyle, Financial, Other)
- Parent categories marked as "organizational - use subcategories below"
- Subcategories indented under parents
- Each category shows: ID, Name, Description

**Example Output:**
```
INCOME CATEGORIES:
  1. Salary - Regular employment income
  2. Freelance/Contract - Freelance or contract work income
  3. Investment Returns - Dividends, interest, capital gains
  ...

ESSENTIAL EXPENSES:
  7. Food & Groceries (organizational - use subcategories below)
     Food & Groceries - Parent category description
     7a. Supermarket - Large grocery stores, supermarkets...
     7b. Butcher - Butcher shops and meat stores
     7c. Baker - Bakeries and bread shops
  ...
```

**Key Features:**
- ✅ Clear hierarchy (parents → subcategories)
- ✅ Group organization helps AI understand context
- ✅ IDs are prominent for easy reference
- ✅ Descriptions provide context

#### 3. Transaction List Section

**Format:**
```
Transactions to categorize:
1. Transaction ID 123
   Description: Payment at Albert Heijn store
   Merchant: ALBERT HEIJN 1234 AMSTERDAM
   Amount: €45.67 (expense)
   Type: Payment

2. Transaction ID 124
   Description: Starbucks coffee purchase
   Merchant: STARBUCKS COFFEE NL
   Amount: €4.50 (expense)
   Type: Payment
```

**Truncation Rules:**
- Descriptions: Truncated to 200 chars (keeps important info, saves tokens)
- Merchant names: Truncated to 100 chars
- Amount: Always shown with 2 decimals
- Type: Shows expense/income clearly

#### 4. Instructions Section

**Current Instructions:**
1. Choose most appropriate category ID (or null)
2. Use SUBcategories when available (not parent categories)
3. Income transactions → only INCOME categories
4. Expense transactions → only EXPENSE categories
5. Confidence scoring guidelines (0.5 = unsure, 0.7 = confident, 0.9+ = very certain)
6. Keyword generation:
   - Generate 1-2 keywords
   - Specific words from merchant/description
   - Examples provided
   - Focus on unique identifiers

#### 5. Response Format

**Required JSON Structure:**
```json
{
  "results": [
    {
      "transactionId": 123,
      "categoryId": 45,
      "confidence": 0.85,
      "suggestedKeywords": ["albert heijn", "supermarket"],
      "reasoning": "Albert Heijn is a Dutch supermarket chain"
    }
  ]
}
```

### Prompt Analysis

**Strengths:**
- ✅ Clear structure and organization
- ✅ Explicit instructions about subcategories
- ✅ Income/expense separation prevents errors
- ✅ Keyword examples help AI understand expectations
- ✅ Token-efficient (truncation, concise format)

**Potential Improvements:**
- Could add examples of good categorizations
- Could specify confidence thresholds more clearly
- Could add guidance for edge cases (uncategorizable transactions)

---

## Part 2: Current Batching Implementation

### How It Works Now

**Function:** `batchTransactions()`

```typescript
export function batchTransactions(
  transactions: TransactionForAI[],
  batchSize?: number
): TransactionForAI[][] {
  const size = batchSize || aiConfig.batchSize; // Default: 15
  const batches: TransactionForAI[][] = [];

  for (let i = 0; i < transactions.length; i += size) {
    batches.push(transactions.slice(i, i + size));
  }

  return batches;
}
```

**Current Strategy: Fixed Batch Size**

- **Batch Size:** 15 transactions per API call (configurable)
- **Method:** Simple sequential splitting
- **Processing:** One batch at a time, sequentially
- **Token Management:** Fixed truncation (200 chars description, 100 chars merchant)

**Example:**
- 47 transactions → 4 batches: [15, 15, 15, 2]
- Each batch sent to OpenAI separately
- Results collected and merged

**Pros:**
- ✅ Simple and predictable
- ✅ Easy to understand and debug
- ✅ Consistent token usage per batch
- ✅ Good balance of cost and speed

**Cons:**
- ⚠️ Doesn't adapt to transaction complexity
- ⚠️ May waste tokens on small batches
- ⚠️ May exceed token limits if descriptions are very long

---

## Part 3: Alternative Batching Strategies

### Strategy 1: Fixed Batch Size (Current) ✅

**How it works:**
- Always use same batch size (e.g., 15 transactions)
- Simple sequential processing

**Best for:**
- Predictable token usage
- Simple implementation
- Consistent performance

**Trade-offs:**
- ✅ Simple
- ✅ Predictable
- ⚠️ May waste tokens on small batches
- ⚠️ May fail if batch is too large

---

### Strategy 2: Dynamic Token-Based Batching

**How it works:**
- Estimate tokens per transaction
- Fill batches until token limit (e.g., 1500 tokens)
- Adjust batch size based on transaction complexity

**Implementation:**
```typescript
function estimateTokens(transaction: TransactionForAI): number {
  // Rough estimate: ~4 tokens per character
  const descriptionTokens = Math.ceil(transaction.description.length / 4);
  const merchantTokens = Math.ceil(transaction.merchantName.length / 4);
  const baseTokens = 50; // Formatting, IDs, etc.
  return descriptionTokens + merchantTokens + baseTokens;
}

function batchByTokens(
  transactions: TransactionForAI[],
  maxTokens: number = 1500
): TransactionForAI[][] {
  const batches: TransactionForAI[][] = [];
  let currentBatch: TransactionForAI[] = [];
  let currentTokens = 0;
  
  // Add category tokens (one-time per batch)
  const categoryTokens = 800; // Estimated
  
  for (const transaction of transactions) {
    const transactionTokens = estimateTokens(transaction);
    
    if (currentTokens + transactionTokens + categoryTokens > maxTokens && currentBatch.length > 0) {
      // Start new batch
      batches.push(currentBatch);
      currentBatch = [transaction];
      currentTokens = transactionTokens;
    } else {
      currentBatch.push(transaction);
      currentTokens += transactionTokens;
    }
  }
  
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }
  
  return batches;
}
```

**Best for:**
- Maximizing token usage
- Handling variable transaction complexity
- Cost optimization

**Trade-offs:**
- ✅ More efficient token usage
- ✅ Adapts to complexity
- ⚠️ More complex implementation
- ⚠️ Token estimation may be inaccurate

---

### Strategy 3: Adaptive Batch Size

**How it works:**
- Start with initial batch size (e.g., 15)
- Monitor token usage
- Adjust batch size based on actual usage
- If batch uses < 50% of tokens, increase size
- If batch exceeds limit, decrease size

**Implementation:**
```typescript
let currentBatchSize = 15;
const minBatchSize = 5;
const maxBatchSize = 30;

async function processWithAdaptiveBatching(
  transactions: TransactionForAI[]
): Promise<AICategorizationBatchResult[]> {
  const batches = batchTransactions(transactions, currentBatchSize);
  const results: AICategorizationBatchResult[] = [];
  
  for (const batch of batches) {
    const result = await categorizeBatchWithAI(userId, batch);
    
    // Adjust batch size based on token usage
    if (result.tokensUsed) {
      const tokenRatio = result.tokensUsed.total / aiConfig.maxTokens;
      
      if (tokenRatio < 0.5 && currentBatchSize < maxBatchSize) {
        // Using less than 50% of tokens, can increase batch size
        currentBatchSize = Math.min(currentBatchSize + 2, maxBatchSize);
      } else if (tokenRatio > 0.9 && currentBatchSize > minBatchSize) {
        // Using >90% of tokens, decrease batch size
        currentBatchSize = Math.max(currentBatchSize - 2, minBatchSize);
      }
    }
    
    results.push(result);
  }
  
  return results;
}
```

**Best for:**
- Learning optimal batch size over time
- Adapting to different transaction types
- Balancing efficiency and safety

**Trade-offs:**
- ✅ Self-optimizing
- ✅ Adapts to data
- ⚠️ More complex
- ⚠️ May take time to stabilize

---

### Strategy 4: Parallel Batching (with Rate Limiting)

**How it works:**
- Process multiple batches concurrently
- Respect rate limits (requests per minute)
- Use queue to manage concurrent requests

**Implementation:**
```typescript
async function processBatchesInParallel(
  batches: TransactionForAI[][],
  maxConcurrent: number = 3
): Promise<AICategorizationBatchResult[]> {
  const results: AICategorizationBatchResult[] = [];
  const queue: Promise<AICategorizationBatchResult>[] = [];
  
  for (const batch of batches) {
    const promise = categorizeBatchWithAI(userId, batch);
    queue.push(promise);
    
    if (queue.length >= maxConcurrent) {
      // Wait for one to complete
      const result = await Promise.race(queue);
      results.push(result);
      queue.splice(queue.indexOf(Promise.resolve(result)), 1);
    }
  }
  
  // Wait for remaining
  const remaining = await Promise.all(queue);
  results.push(...remaining);
  
  return results;
}
```

**Best for:**
- Large transaction sets
- When speed is priority
- When rate limits allow

**Trade-offs:**
- ✅ Much faster for large sets
- ✅ Better resource utilization
- ⚠️ More complex error handling
- ⚠️ Risk of hitting rate limits
- ⚠️ Harder to track progress

---

### Strategy 5: Smart Grouping

**How it works:**
- Group similar transactions together (same merchant, similar amounts)
- Process similar transactions in same batch
- May improve AI accuracy (context helps)

**Implementation:**
```typescript
function groupSimilarTransactions(
  transactions: TransactionForAI[]
): TransactionForAI[][] {
  // Group by merchant (normalized)
  const groups = new Map<string, TransactionForAI[]>();
  
  for (const transaction of transactions) {
    const merchantKey = transaction.merchantName.toLowerCase().trim();
    if (!groups.has(merchantKey)) {
      groups.set(merchantKey, []);
    }
    groups.get(merchantKey)!.push(transaction);
  }
  
  // Split large groups into batches
  const batches: TransactionForAI[][] = [];
  for (const [merchant, group] of groups.entries()) {
    if (group.length <= 15) {
      batches.push(group);
    } else {
      // Split large groups
      batches.push(...batchTransactions(group, 15));
    }
  }
  
  return batches;
}
```

**Best for:**
- Improving categorization accuracy
- When similar transactions benefit from context
- Reducing redundant processing

**Trade-offs:**
- ✅ May improve accuracy
- ✅ Better context for AI
- ⚠️ More complex grouping logic
- ⚠️ May create uneven batch sizes

---

## Comparison Table

| Strategy | Speed | Cost | Complexity | Accuracy | Best For |
|----------|-------|------|------------|----------|----------|
| **Fixed Size** (Current) | Medium | Medium | Low | Good | General use |
| **Token-Based** | Medium | Low | Medium | Good | Cost optimization |
| **Adaptive** | Medium | Low | High | Good | Long-term use |
| **Parallel** | High | Medium | High | Good | Large datasets |
| **Smart Grouping** | Medium | Medium | High | Better | Accuracy priority |

---

## Recommendations

### For MVP (Current): Fixed Batch Size ✅

**Why:**
- Simple to implement and debug
- Predictable behavior
- Good balance of cost and speed
- Easy to understand

**Current Settings:**
- Batch size: 15 transactions
- Sequential processing
- Fixed truncation

### For Future Optimization: Token-Based + Adaptive

**Why:**
- Better cost efficiency
- Adapts to transaction complexity
- Self-optimizing over time

**When to implement:**
- After MVP is working
- When processing large volumes
- When cost becomes a concern

### For Speed: Parallel Processing

**Why:**
- Much faster for large datasets
- Better resource utilization

**When to implement:**
- When processing 1000+ transactions regularly
- When rate limits allow
- When speed is critical

---

## Current Implementation Details

### Batch Processing Flow

```
1. Keyword matching completes
   ↓
2. Collect unmatched transactions
   ↓
3. Split into batches (15 per batch)
   ↓
4. For each batch:
   a. Load categories (once per batch)
   b. Create prompt
   c. Call OpenAI API
   d. Parse response
   e. Validate results
   f. Add suggested keywords
   ↓
5. Merge all results
   ↓
6. Update database
```

### Token Usage Per Batch

**Estimated:**
- Categories: ~500-800 tokens (one-time per batch)
- Per transaction: ~50-100 tokens
- Batch of 15: ~1500-2500 tokens total
- Response: ~300-500 tokens

**With max_tokens: 2000:**
- Safe margin for responses
- Room for growth

### Cost Per Batch

**With gpt-4o-mini:**
- Input: ~2000 tokens × $0.15/1M = $0.0003
- Output: ~400 tokens × $0.60/1M = $0.0002
- **Total: ~$0.0005 per batch**
- **15 transactions = $0.0005**
- **1000 transactions = ~$0.03**

---

## Questions to Consider

1. **Should we switch to token-based batching?**
   - Pro: More efficient
   - Con: More complex
   - **Recommendation:** Keep fixed for now, optimize later

2. **Should we add parallel processing?**
   - Pro: Much faster
   - Con: Rate limit risk
   - **Recommendation:** Add after MVP, with rate limiting

3. **Should we group similar transactions?**
   - Pro: Better accuracy
   - Con: More complex
   - **Recommendation:** Test later, may not be necessary

4. **Should we add adaptive batch sizing?**
   - Pro: Self-optimizing
   - Con: Complex
   - **Recommendation:** Future enhancement

---

## Next Steps

1. **Keep current fixed batching** for MVP
2. **Monitor token usage** in production
3. **Consider token-based batching** if we see waste
4. **Add parallel processing** if speed becomes issue
5. **Test smart grouping** if accuracy needs improvement

---

**Current Status:** Fixed batch size (15) is working well for MVP. Can optimize later based on real-world usage.

