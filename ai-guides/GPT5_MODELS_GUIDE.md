# GPT-5 Models Guide for Transaction Categorization

## Overview

OpenAI released the GPT-5 series in August 2025, representing the latest generation of language models. For transaction categorization, these models offer improved accuracy, better batch handling, and potentially better cost efficiency.

## GPT-5 Model Variants

### 1. GPT-5 Nano
**Best for:** High-volume applications, cost-sensitive use cases

- **Speed:** Very Fast
- **Cost:** Lowest (most economical)
- **Accuracy:** Good (suitable for well-defined tasks)
- **Context Window:** 400,000 tokens
- **Output Tokens:** Up to 128,000
- **Recommended Batch Size:** 12 transactions

**Use when:**
- Processing thousands of transactions
- Cost is primary concern
- Transactions are relatively straightforward
- High volume, lower accuracy tolerance

### 2. GPT-5 Mini ⭐ Recommended
**Best for:** Most transaction categorization use cases

- **Speed:** Very Fast
- **Cost:** Low (excellent balance)
- **Accuracy:** Very Good (best balance)
- **Context Window:** 400,000 tokens
- **Output Tokens:** Up to 128,000
- **Recommended Batch Size:** 15 transactions

**Use when:**
- General transaction categorization
- Need good balance of speed, cost, and accuracy
- Processing hundreds to thousands of transactions
- **This is the recommended default model**

### 3. GPT-5
**Best for:** Complex categorization, high accuracy requirements

- **Speed:** Fast
- **Cost:** Medium-High
- **Accuracy:** Highest (expert-level reasoning)
- **Context Window:** 400,000 tokens
- **Output Tokens:** Up to 128,000
- **Recommended Batch Size:** 18 transactions

**Use when:**
- Need highest accuracy
- Complex or ambiguous transactions
- Accuracy is more important than cost
- Can handle larger batches reliably

## Key Improvements Over GPT-4

### 1. **Better Batch Handling**
- Can handle larger batches without accuracy loss
- Better at tracking transaction IDs in large batches
- More reliable JSON output format

### 2. **Enhanced Reasoning**
- Better understanding of financial transactions
- Improved pattern recognition
- More consistent categorization

### 3. **Reduced Hallucinations**
- Less likely to make up categories
- More accurate keyword extraction
- Better adherence to instructions

### 4. **Improved Speed**
- Faster response times than GPT-4
- Better throughput for parallel processing
- Lower latency

### 5. **Cost Efficiency**
- GPT-5 Nano: Most economical option
- GPT-5 Mini: Better cost/performance than GPT-4o-mini
- Potentially lower cost per accurate categorization

## Important API Differences

### 1. **Temperature Parameter**
- **GPT-5 models:** Only support default temperature (1.0)
- **Previous models:** Support custom temperature (0.0-2.0)
- **Impact:** GPT-5 responses may be slightly more variable, but still very consistent for structured tasks
- **Our code:** Automatically handles this - doesn't set temperature for GPT-5 models

### 2. **Max Tokens Parameter**
- **GPT-5 models:** Use `max_completion_tokens` instead of `max_tokens`
- **Previous models:** Use `max_tokens`
- **Our code:** Automatically handles this based on model version

## Comparison with Previous Models

| Model | Speed | Cost | Accuracy | Batch Size | Best For |
|-------|-------|------|----------|------------|----------|
| **GPT-5 Nano** | ⚡⚡⚡ | 💰💰💰💰💰 | ⭐⭐⭐⭐ | 12 | High volume, cost-sensitive |
| **GPT-5 Mini** | ⚡⚡⚡ | 💰💰💰💰 | ⭐⭐⭐⭐⭐ | 15 | **Recommended default** |
| **GPT-5** | ⚡⚡ | 💰💰 | ⭐⭐⭐⭐⭐ | 18 | Highest accuracy needed |
| GPT-4o-mini | ⚡⚡⚡ | 💰💰💰💰 | ⭐⭐⭐⭐ | 10 | Previous gen, still good |
| GPT-4o | ⚡⚡ | 💰💰💰 | ⭐⭐⭐⭐⭐ | 12 | Previous gen, high accuracy |
| GPT-4 | ⚡ | 💰 | ⭐⭐⭐⭐⭐ | 15 | Previous gen, slower |

## Pricing

**Note:** Check https://openai.com/api/pricing/ for current pricing. GPT-5 models may offer better cost efficiency than previous generations.

**Estimated (verify with OpenAI):**
- GPT-5 Nano: Likely similar or lower than gpt-4o-mini
- GPT-5 Mini: Likely competitive with gpt-4o-mini
- GPT-5: Likely higher than gpt-4o-mini but better value than GPT-4

## Rate Limits

**GPT-5 Models (Tier 1 - Default):**
- **Requests per minute (RPM):** 5,000
- **Tokens per minute (TPM):** 2,000,000
- **Requests per day (RPD):** 10,000

**Benefits:**
- Higher token limits than GPT-4o-mini (2M vs 1M TPM)
- More requests per minute (5K vs 3.5K RPM)
- Better for parallel processing

## Batch Size Recommendations

### GPT-5 Nano
- **Recommended:** 12 transactions per batch
- **Max safe:** 15 transactions
- **Why:** Economical model, good for standard categorization

### GPT-5 Mini ⭐
- **Recommended:** 15 transactions per batch
- **Max safe:** 18 transactions
- **Why:** Best balance, can handle larger batches reliably

### GPT-5
- **Recommended:** 18 transactions per batch
- **Max safe:** 20 transactions
- **Why:** Highest accuracy, best at handling complex batches

**Note:** GPT-5 models show improved batch handling compared to GPT-4 models, meaning you can use larger batches without the accuracy degradation seen with older models.

## Migration from GPT-4

### Code Changes

**Minimal changes needed:**

```typescript
// Before (GPT-4o-mini)
const model = 'gpt-4o-mini';
const batchSize = 10;

// After (GPT-5 Mini)
const model = 'gpt-5-mini';
const batchSize = 15; // Can increase batch size
```

**That's it!** The API interface is the same, just change the model name.

**Note:** Our code automatically handles GPT-5 API differences:
- Uses `max_completion_tokens` instead of `max_tokens`
- Doesn't set `temperature` (GPT-5 only supports default)

### Benefits of Migration

1. **Larger batches** = Fewer API calls = Lower cost
2. **Better accuracy** = Fewer errors = Less manual correction
3. **Faster processing** = Better user experience
4. **Higher rate limits** = Better for parallel processing

## When to Use Each Model

### Use GPT-5 Nano When:
- ✅ Processing 10,000+ transactions
- ✅ Cost is primary concern
- ✅ Transactions are straightforward
- ✅ Can tolerate slightly lower accuracy

### Use GPT-5 Mini When: ⭐
- ✅ General transaction categorization
- ✅ Need good balance of all factors
- ✅ Processing hundreds to thousands of transactions
- ✅ **This should be your default choice**

### Use GPT-5 When:
- ✅ Need highest accuracy
- ✅ Complex or ambiguous transactions
- ✅ Accuracy is more important than cost
- ✅ Processing critical financial data

## Testing GPT-5 Models

### Test Plan

1. **Start with GPT-5 Mini:**
   - Test with 50-100 transactions
   - Compare accuracy with GPT-4o-mini
   - Measure speed and cost

2. **Test Batch Sizes:**
   - Try 10, 15, 18, 20 transactions per batch
   - Measure accuracy at each size
   - Find optimal batch size

3. **Compare Models:**
   - Test GPT-5 Nano vs GPT-5 Mini vs GPT-5
   - Compare accuracy, speed, cost
   - Choose best for your use case

### Test Page

Use the test page at `/test-ai-categorize` to:
- Select GPT-5 models from dropdown
- Test different batch sizes
- Compare results with previous models
- Monitor token usage and costs

## Fine-Tuning with GPT-5

**Status:** As of 2025, GPT-5 models may not be available for fine-tuning. Check OpenAI documentation for updates.

**If available:**
- Fine-tuning GPT-5 Mini could be excellent for transaction categorization
- Would learn your specific patterns and categories
- Potentially even better accuracy

## Recommendations

### For New Implementations
1. **Start with GPT-5 Mini** (best default)
2. Test with your transaction data
3. Adjust batch size based on results
4. Consider GPT-5 Nano if cost is critical
5. Consider GPT-5 if accuracy is critical

### For Existing Implementations
1. **Migrate from GPT-4o-mini to GPT-5 Mini**
2. Increase batch size from 10 to 15
3. Test accuracy and cost
4. Monitor improvements

### Cost Optimization
1. Use GPT-5 Nano for bulk operations
2. Use GPT-5 Mini for regular categorization
3. Use GPT-5 only when accuracy is critical
4. Leverage larger batch sizes to reduce API calls

## Resources

- **GPT-5 Announcement:** https://openai.com/gpt-5
- **GPT-5 API Docs:** https://platform.openai.com/docs/models/gpt-5
- **GPT-5 Mini Docs:** https://platform.openai.com/docs/models/gpt-5-mini
- **Pricing:** https://openai.com/api/pricing/
- **Rate Limits:** https://platform.openai.com/account/limits

## Summary

**GPT-5 models represent a significant improvement for transaction categorization:**

- ✅ **Better batch handling** (larger batches, better accuracy)
- ✅ **Improved reasoning** (better categorization)
- ✅ **Cost efficiency** (especially GPT-5 Nano and Mini)
- ✅ **Higher rate limits** (better for parallel processing)
- ✅ **Recommended:** Start with **GPT-5 Mini** as default

**Migration is simple:** Just change the model name and increase batch size!

