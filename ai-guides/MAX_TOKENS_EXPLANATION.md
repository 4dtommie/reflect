# Max Tokens Parameter Explained

## What is `max_tokens` / `max_completion_tokens`?

**`max_tokens`** (or `max_completion_tokens` for GPT-5 models) is a parameter that limits the **maximum number of tokens** the AI model can generate in its response.

### Key Concepts

1. **Tokens:** The basic units of text that AI models process
   - ~1 token ≈ 4 characters (roughly)
   - ~1 token ≈ 0.75 words (roughly)
   - Example: "Hello world" = 2 tokens

2. **Completion Tokens:** The tokens in the AI's response (output)
   - Different from **prompt tokens** (input)
   - You pay for both, but completion tokens are usually more expensive

3. **Max Tokens Limit:** The maximum number of tokens the AI can generate
   - If response would be longer, it gets cut off
   - Prevents runaway responses
   - Controls costs

## Why Do We Use It?

### 1. **Cost Control** 💰

**Without `max_tokens`:**
- AI could generate very long responses
- You pay for every token generated
- Unexpected costs from verbose responses

**With `max_tokens`:**
- Predictable maximum cost per request
- Prevents expensive long responses
- Better budget control

**Example:**
- Without limit: AI might generate 10,000 tokens = $0.006 (gpt-4o-mini)
- With 2000 limit: Maximum 2000 tokens = $0.0012 (gpt-4o-mini)
- **Savings:** 5x cost reduction potential

### 2. **Response Length Control** 📏

**For transaction categorization:**
- We need structured JSON responses
- Each transaction needs: `transactionId`, `categoryId`, `confidence`, `keywords`, `reasoning`
- We know roughly how long responses should be

**Example response (10 transactions):**
```json
{
  "results": [
    {
      "transactionId": 123,
      "categoryId": 45,
      "confidence": 0.85,
      "suggestedKeywords": ["albert heijn"],
      "reasoning": "Albert Heijn is a Dutch supermarket"
    },
    // ... 9 more transactions
  ]
}
```

**Token count:**
- ~50-100 tokens per transaction result
- 10 transactions = ~500-1000 tokens
- 15 transactions = ~750-1500 tokens
- **2000 tokens is a safe buffer**

### 3. **Prevents Truncation Issues** ✂️

**If `max_tokens` is too low:**
- Response gets cut off mid-JSON
- Invalid JSON = parsing errors
- Missing transaction results
- Need to retry or handle errors

**If `max_tokens` is too high:**
- No problem (just costs more if AI is verbose)
- But unnecessary if you know response size

### 4. **Performance** ⚡

- Shorter responses = faster processing
- Less data to parse
- Better user experience

## What Value Do We Use?

**Current Setting: `2000` tokens**

```typescript
// In config.ts
maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000')
```

### Why 2000?

**Calculation for transaction categorization:**

1. **Per Transaction Result:**
   - `transactionId`: ~5 tokens
   - `categoryId`: ~5 tokens
   - `confidence`: ~5 tokens
   - `suggestedKeywords`: ~10-20 tokens (array with 1-2 keywords)
   - `reasoning`: ~10-30 tokens (brief explanation)
   - **Total per transaction: ~40-65 tokens**

2. **JSON Structure:**
   - Opening/closing braces: ~5 tokens
   - Array structure: ~5 tokens
   - **Total overhead: ~10 tokens**

3. **Batch Sizes:**
   - **10 transactions:** ~400-650 tokens + 10 = **~410-660 tokens**
   - **15 transactions:** ~600-975 tokens + 10 = **~610-985 tokens**
   - **20 transactions:** ~800-1300 tokens + 10 = **~810-1310 tokens**

4. **Safety Margin:**
   - 2000 tokens provides **2-3x buffer**
   - Handles edge cases (long reasoning, many keywords)
   - Prevents truncation even with verbose responses

### Could We Use Less?

**Yes, but risky:**
- 1000 tokens: Might work for 10 transactions, but risky for 15+
- 1500 tokens: Safer, but still tight for larger batches
- **2000 tokens: Safe for all batch sizes we use**

### Could We Use More?

**Yes, but unnecessary:**
- 3000 tokens: More expensive if AI is verbose, no real benefit
- 4000 tokens: Even more expensive, definitely unnecessary
- **2000 tokens: Sweet spot for our use case**

## GPT-5 Models: `max_completion_tokens`

**Important Change:**
- GPT-5 models use `max_completion_tokens` instead of `max_tokens`
- Same concept, different parameter name
- Our code handles this automatically:

```typescript
// In aiCategorizer.ts
if (isGPT5) {
  requestParams.max_completion_tokens = aiConfig.maxTokens;
} else {
  requestParams.max_tokens = aiConfig.maxTokens;
}
```

## Real-World Example

**Batch of 10 transactions:**

**Prompt tokens (input):** ~1,500 tokens
- Categories list: ~500 tokens
- 10 transactions: ~1,000 tokens

**Completion tokens (output):** ~500-800 tokens
- JSON structure: ~10 tokens
- 10 transaction results: ~490-790 tokens

**Total:** ~2,000-2,300 tokens
- Well within limits
- 2000 max_tokens is sufficient

## What Happens If Response Exceeds Max?

**If AI tries to generate more than `max_tokens`:**

1. **Response gets truncated** mid-generation
2. **JSON might be invalid** (cut off mid-object)
3. **Parsing fails** with error like "Unexpected end of JSON"
4. **We catch the error** and retry or mark as failed

**Example of truncated response:**
```json
{
  "results": [
    {"transactionId": 123, "categoryId": 45, "confidence": 0.85, "suggestedKeywords": ["albert heijn"], "reasoning": "Albert Heijn is a Dutch superm
```
↑ Cut off mid-word! Invalid JSON.

**This is why we use a safe buffer (2000 tokens).**

## Cost Impact

**With gpt-4o-mini:**
- Input: $0.15 per 1M tokens
- Output: $0.60 per 1M tokens

**Per batch (10 transactions):**
- Input: ~1,500 tokens = $0.000225
- Output: ~500 tokens = $0.0003
- **Total: ~$0.000525 per batch**

**If `max_tokens` was 4000 instead of 2000:**
- Same input cost
- But if AI generates 3000 tokens (unlikely but possible) = $0.0018
- **3.4x more expensive** for no benefit

## Best Practices

### ✅ Do:
- Set `max_tokens` based on expected response size
- Add 2-3x buffer for safety
- Monitor actual token usage
- Adjust if you see truncation errors

### ❌ Don't:
- Set too low (risks truncation)
- Set too high (wastes money if AI is verbose)
- Forget to account for batch size
- Ignore token usage in logs

## Monitoring Token Usage

**Check token usage in:**
1. **Test page:** Shows tokens used per batch
2. **Server logs:** Logs token usage
3. **OpenAI dashboard:** Track usage over time

**Example log:**
```
🤖 Categorizing 10 transactions with AI...
   📚 Loaded 45 categories
   ✅ Categorized 10 transactions
   📊 Tokens: 1,523 prompt + 487 completion = 2,010 total
```

## Adjusting Max Tokens

**If you need to change it:**

1. **Environment variable:**
   ```env
   OPENAI_MAX_TOKENS=2000  # Default
   ```

2. **Or in code:**
   ```typescript
   // In config.ts
   maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000')
   ```

3. **When to increase:**
   - Seeing truncation errors
   - Processing larger batches (20+ transactions)
   - Adding more fields to response

4. **When to decrease:**
   - Cost optimization
   - Smaller batches only
   - Simpler responses

## Summary

**`max_tokens` / `max_completion_tokens`:**
- ✅ Limits response length
- ✅ Controls costs
- ✅ Prevents truncation
- ✅ Improves performance

**Our setting: 2000 tokens**
- ✅ Safe for batches up to 15-20 transactions
- ✅ 2-3x buffer for edge cases
- ✅ Cost-effective
- ✅ Prevents JSON truncation

**Key takeaway:** It's a safety limit that prevents expensive, long responses while ensuring we get complete JSON responses for transaction categorization.

