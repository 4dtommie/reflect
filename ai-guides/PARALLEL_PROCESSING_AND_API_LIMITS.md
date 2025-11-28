# Parallel Processing & OpenAI API Limits

## Overview

This document explains the parallel processing alternative for AI categorization and where to find OpenAI API limits.

## Parallel Processing Alternative

### Current Implementation: Sequential Processing

**How it works:**
- Process batches one at a time, sequentially
- Wait for each batch to complete before starting the next
- Simple and predictable

**Example with 50 transactions (batch size 10):**
```
Batch 1 (10 transactions) → Wait 8s → Complete
Batch 2 (10 transactions) → Wait 8s → Complete
Batch 3 (10 transactions) → Wait 8s → Complete
Batch 4 (10 transactions) → Wait 8s → Complete
Batch 5 (10 transactions) → Wait 8s → Complete
Total: ~40 seconds
```

### Alternative: Parallel Processing

**How it works:**
- Process multiple batches concurrently
- Use a queue to manage concurrent requests
- Respect rate limits to avoid errors

**Example with 50 transactions (batch size 10, max 3 concurrent):**
```
Batch 1, 2, 3 start simultaneously
  → Batch 1 completes (8s)
  → Batch 4 starts
  → Batch 2 completes (8s)
  → Batch 5 starts
  → Batch 3 completes (8s)
Total: ~16 seconds (2.5x faster)
```

### Implementation Example

```typescript
async function processBatchesInParallel(
  userId: number,
  batches: TransactionForAI[][],
  maxConcurrent: number = 3
): Promise<AICategorizationBatchResult[]> {
  const results: AICategorizationBatchResult[] = [];
  const queue: Promise<AICategorizationBatchResult>[] = [];
  
  for (const batch of batches) {
    // Add batch to queue
    const promise = categorizeBatchWithAI(userId, batch);
    queue.push(promise);
    
    // If queue is full, wait for one to complete
    if (queue.length >= maxConcurrent) {
      const result = await Promise.race(queue);
      results.push(result);
      
      // Remove completed promise from queue
      const index = queue.findIndex(p => p === Promise.resolve(result));
      if (index !== -1) {
        queue.splice(index, 1);
      }
    }
  }
  
  // Wait for remaining batches
  const remaining = await Promise.all(queue);
  results.push(...remaining);
  
  return results;
}
```

### Benefits

- ✅ **Much faster** for large transaction sets (2-5x speedup)
- ✅ **Better resource utilization** (doesn't wait idly)
- ✅ **Scalable** (can adjust `maxConcurrent` based on rate limits)

### Trade-offs

- ⚠️ **More complex** error handling (need to track multiple concurrent requests)
- ⚠️ **Rate limit risk** (must respect OpenAI's limits)
- ⚠️ **Harder to track progress** (multiple batches in flight)
- ⚠️ **Higher memory usage** (multiple requests in progress)

### When to Use

**Use parallel processing when:**
- Processing large datasets (100+ transactions)
- Speed is important
- Rate limits allow (check your tier)
- You can handle increased complexity

**Stick with sequential when:**
- Small datasets (<50 transactions)
- Simplicity is priority
- Rate limits are restrictive
- Debugging is important

## OpenAI API Limits

### Where to Find Your Limits

1. **OpenAI Platform Dashboard:**
   - Go to: https://platform.openai.com/account/limits
   - Shows your current tier and limits
   - Updates in real-time

2. **API Response Headers:**
   - `x-ratelimit-limit-requests`: Max requests per minute
   - `x-ratelimit-limit-tokens`: Max tokens per minute
   - `x-ratelimit-remaining-requests`: Remaining requests
   - `x-ratelimit-remaining-tokens`: Remaining tokens
   - `x-ratelimit-reset-requests`: When request limit resets
   - `x-ratelimit-reset-tokens`: When token limit resets

3. **Rate Limit Errors:**
   - HTTP 429 status code
   - Error message includes retry-after time
   - Check `retry_after` field in error response

### Typical Rate Limits (Tier 1 - Default)

**For GPT-5 models:**
- **GPT-5 Nano:**
  - **Requests per minute (RPM):** 5,000
  - **Tokens per minute (TPM):** 2,000,000
  - **Requests per day (RPD):** 10,000
- **GPT-5 Mini:**
  - **Requests per minute (RPM):** 5,000
  - **Tokens per minute (TPM):** 2,000,000
  - **Requests per day (RPD):** 10,000
- **GPT-5:**
  - **Requests per minute (RPM):** 5,000
  - **Tokens per minute (TPM):** 2,000,000
  - **Requests per day (RPD):** 10,000

**For `gpt-4o-mini` and `gpt-3.5-turbo`:**
- **Requests per minute (RPM):** 3,500
- **Tokens per minute (TPM):** 1,000,000
- **Requests per day (RPD):** 10,000

**For `gpt-4o`:**
- **Requests per minute (RPM):** 5,000
- **Tokens per minute (TPM):** 10,000,000
- **Requests per day (RPD):** 10,000

**For `gpt-4`:**
- **Requests per minute (RPM):** 10,000
- **Tokens per minute (TPM):** 1,000,000
- **Requests per day (RPD):** 10,000

### Higher Tiers

**Tier 2:**
- Higher limits (varies by account)
- Usually 2-5x Tier 1 limits

**Tier 3+:**
- Even higher limits
- Custom limits for enterprise

**To increase limits:**
- Request limit increase: https://platform.openai.com/account/limits
- Fill out form with use case
- Usually approved within 1-2 business days

### Calculating Safe Parallel Limits

**Example calculation for `gpt-5-mini` (Tier 1):**

1. **Request limit:** 5,000 RPM = ~83 requests/second
2. **Token limit:** 2,000,000 TPM = ~33,333 tokens/second
3. **Our batch size:** 15 transactions ≈ 1,500 tokens
4. **Safe concurrent requests:** 
   - By requests: 83 requests/second × 6s per request = ~498 concurrent (theoretical)
   - By tokens: 33,333 tokens/second ÷ 1,500 tokens = ~22 requests/second
   - **Practical limit:** 5-8 concurrent requests (safe margin)

**Example calculation for `gpt-4o-mini` (Tier 1):**

1. **Request limit:** 3,500 RPM = ~58 requests/second
2. **Token limit:** 1,000,000 TPM = ~16,667 tokens/second
3. **Our batch size:** 10 transactions ≈ 1,500 tokens
4. **Safe concurrent requests:** 
   - By requests: 58 requests/second × 8s per request = ~464 concurrent (theoretical)
   - By tokens: 16,667 tokens/second ÷ 1,500 tokens = ~11 requests/second
   - **Practical limit:** 3-5 concurrent requests (safe margin)

**Recommendation:**
- Start with `maxConcurrent: 3`
- Monitor rate limit headers
- Increase gradually if no errors
- Back off if you hit 429 errors

### Rate Limit Handling

**Current implementation already handles:**
- ✅ Retry on 429 errors (rate limit exceeded)
- ✅ Exponential backoff (1s, 2s, 4s)
- ✅ Max 3 retries

**For parallel processing, add:**
- Queue management (don't exceed `maxConcurrent`)
- Rate limit header monitoring
- Automatic backoff when approaching limits
- Request throttling

## Implementation Strategy

### Phase 1: Sequential (Current)
- ✅ Simple and reliable
- ✅ Easy to debug
- ✅ Works for most use cases

### Phase 2: Add Parallel Processing (Optional)
- Add `maxConcurrent` parameter
- Implement queue management
- Monitor rate limits
- Add progress tracking

### Phase 3: Advanced (Future)
- Dynamic concurrency (adjust based on rate limits)
- Batch API for very large datasets (50% cost discount)
- Smart grouping (similar transactions together)

## Code Example: Parallel Processing with Rate Limiting

```typescript
interface RateLimitInfo {
  remainingRequests: number;
  remainingTokens: number;
  resetTime: Date;
}

async function processBatchesInParallel(
  userId: number,
  batches: TransactionForAI[][],
  maxConcurrent: number = 3
): Promise<AICategorizationBatchResult[]> {
  const results: AICategorizationBatchResult[] = [];
  const queue: Promise<AICategorizationBatchResult>[] = [];
  let rateLimitInfo: RateLimitInfo | null = null;
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    
    // Check rate limits before adding to queue
    if (rateLimitInfo && rateLimitInfo.remainingRequests < 10) {
      // Wait until rate limit resets
      const waitTime = rateLimitInfo.resetTime.getTime() - Date.now();
      if (waitTime > 0) {
        console.log(`⏳ Rate limit low, waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    // Add batch to queue
    const promise = categorizeBatchWithAI(userId, batch).then(result => {
      // Update rate limit info from response headers (if available)
      // This would need to be extracted from the API response
      return result;
    });
    
    queue.push(promise);
    
    // If queue is full, wait for one to complete
    if (queue.length >= maxConcurrent) {
      const result = await Promise.race(queue);
      results.push(result);
      
      // Remove completed promise from queue
      const index = queue.findIndex(p => p === Promise.resolve(result));
      if (index !== -1) {
        queue.splice(index, 1);
      }
    }
  }
  
  // Wait for remaining batches
  const remaining = await Promise.all(queue);
  results.push(...remaining);
  
  return results;
}
```

## Testing Parallel Processing

### Test Plan

1. **Small test (10 transactions, 2 batches):**
   - Sequential: ~16s
   - Parallel (2 concurrent): ~8s
   - Verify results match

2. **Medium test (50 transactions, 5 batches):**
   - Sequential: ~40s
   - Parallel (3 concurrent): ~16s
   - Monitor rate limits

3. **Large test (200 transactions, 20 batches):**
   - Sequential: ~160s (2.7 min)
   - Parallel (5 concurrent): ~32s
   - Watch for rate limit errors

### Monitoring

- Track time per batch
- Monitor rate limit headers
- Log any 429 errors
- Compare accuracy (should be same)

## Resources

- **OpenAI Rate Limits:** https://platform.openai.com/account/limits
- **OpenAI Batch API:** https://platform.openai.com/docs/guides/batch
- **Latency Optimization:** https://platform.openai.com/docs/guides/latency-optimization
- **Rate Limit Errors:** https://platform.openai.com/docs/guides/rate-limits

## Recommendation

**For now:**
- ✅ Keep sequential processing (simple, reliable)
- ✅ Monitor rate limits in production
- ✅ Track processing times

**Consider parallel processing when:**
- Users have 100+ uncategorized transactions
- Speed becomes a bottleneck
- Rate limits allow (Tier 2+ or low usage)
- You have time to implement and test properly

**Alternative: OpenAI Batch API**
- For very large datasets (1000+ transactions)
- 50% cost discount
- 24-hour turnaround
- Asynchronous processing
- Best for bulk operations, not real-time

