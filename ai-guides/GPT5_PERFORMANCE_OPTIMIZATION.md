# GPT-5 Performance Optimization

## The Latency Issue

**GPT-5 Mini is slower than GPT-4o-mini:**
- **GPT-5 Mini:** ~30 seconds for 8 transactions (3.75s per transaction)
- **GPT-4o-mini:** ~8-10 seconds for 10 transactions (0.8-1s per transaction)
- **GPT-5 Mini is 3-4x slower** than GPT-4o-mini

## Why Is GPT-5 Mini Slower?

### 1. **Time to First Token (TTFT)**
- GPT-5 Mini has a **TTFT of ~14.6 seconds**
- This is the time before the model starts generating output
- Much longer than GPT-4o-mini (~1-2 seconds)

### 2. **Enhanced Reasoning**
- GPT-5 models use more advanced reasoning
- This takes more computation time
- Better accuracy, but slower responses

### 3. **Model Architecture**
- Newer architecture optimized for quality over speed
- More complex processing = slower responses

## Performance Comparison

| Model | 8 Transactions | 10 Transactions | Per Transaction |
|-------|----------------|------------------|-----------------|
| **GPT-5 Mini** | ~30s | ~37s | ~3.75s |
| **GPT-4o-mini** | ~6-8s | ~8-10s | ~0.8-1s |
| **GPT-3.5 Turbo** | ~4-6s | ~5-8s | ~0.5-0.8s |

**GPT-5 Mini is 3-4x slower than GPT-4o-mini.**

## Optimization Options

### 1. **Use `reasoning_effort` Parameter** ⚡

GPT-5 models support a `reasoning_effort` parameter that can reduce latency:

```typescript
// Minimal reasoning (faster, less thorough)
requestParams.reasoning_effort = 'minimal';

// Low reasoning (balanced)
requestParams.reasoning_effort = 'low';

// Medium reasoning (default)
requestParams.reasoning_effort = 'medium';

// High reasoning (slower, more thorough)
requestParams.reasoning_effort = 'high';
```

**Impact:**
- `minimal`: Can reduce latency by 30-50%
- `low`: Can reduce latency by 20-30%
- Trade-off: Slightly less thorough reasoning, but still very accurate

### 2. **Use `verbosity` Parameter** 📝

Controls how verbose the model is:

```typescript
// Low verbosity (faster, less explanation)
requestParams.verbosity = 'low';

// Medium verbosity (default)
requestParams.verbosity = 'medium';

// High verbosity (slower, more explanation)
requestParams.verbosity = 'high';
```

**Impact:**
- `low`: Can reduce response size and generation time
- Less detailed reasoning, but still accurate categorization

### 3. **Priority Processing** 🚀

OpenAI offers Priority Processing for API customers:
- **Predictably low latency**
- **Higher throughput**
- **Faster response times** even during peak demand
- **Cost:** Additional fee (check OpenAI pricing)

**When to use:**
- Speed is critical
- Processing large volumes
- Real-time categorization needed

### 4. **Use GPT-4o-mini for Speed** ⚡

If speed is more important than the latest model:
- **GPT-4o-mini:** 3-4x faster than GPT-5 Mini
- Still very accurate for categorization
- Lower cost
- Better for real-time processing

### 5. **Parallel Processing** 🔄

Process multiple batches concurrently:
- Can reduce total time by 2-3x
- Especially effective with Priority Processing
- See `PARALLEL_PROCESSING_AND_API_LIMITS.md`

## Implementation: Add Reasoning Effort

Let's add support for `reasoning_effort` to optimize GPT-5 performance:

```typescript
// In aiCategorizer.ts
if (isGPT5) {
  requestParams.max_completion_tokens = aiConfig.maxTokens;
  
  // Add reasoning_effort for GPT-5 models to reduce latency
  // Options: 'minimal', 'low', 'medium', 'high'
  // 'minimal' = fastest, 'medium' = default, 'high' = most thorough
  requestParams.reasoning_effort = process.env.OPENAI_REASONING_EFFORT || 'low';
  
  // Optional: reduce verbosity for faster responses
  requestParams.verbosity = process.env.OPENAI_VERBOSITY || 'low';
} else {
  requestParams.max_tokens = aiConfig.maxTokens;
}
```

**Environment variable:**
```env
OPENAI_REASONING_EFFORT=low  # minimal, low, medium, high
OPENAI_VERBOSITY=low          # low, medium, high
```

## Expected Performance Improvements

**With `reasoning_effort: 'low'` and `verbosity: 'low'`:**
- **Current:** ~30s for 8 transactions
- **Optimized:** ~18-22s for 8 transactions (25-40% faster)
- **Still slower than GPT-4o-mini**, but more acceptable

**With `reasoning_effort: 'minimal'`:**
- **Current:** ~30s for 8 transactions
- **Optimized:** ~15-18s for 8 transactions (40-50% faster)
- **Trade-off:** Slightly less thorough reasoning

## Recommendations

### For Speed-Critical Applications:
1. **Use GPT-4o-mini** (3-4x faster)
2. Or use **GPT-5 Mini with `reasoning_effort: 'minimal'`**
3. Consider **Priority Processing** if budget allows

### For Accuracy-Critical Applications:
1. **Use GPT-5 Mini** with default settings
2. Accept the slower speed for better accuracy
3. Use **parallel processing** to reduce total time

### For Balanced Applications:
1. **Use GPT-5 Mini** with `reasoning_effort: 'low'`
2. Good balance of speed and accuracy
3. Still better accuracy than GPT-4o-mini

## Cost vs Speed Trade-off

| Model | Speed | Accuracy | Cost | Best For |
|-------|-------|----------|------|----------|
| **GPT-5 Mini (minimal)** | Medium | High | Medium | Speed + Accuracy |
| **GPT-5 Mini (default)** | Slow | Very High | Medium | Accuracy priority |
| **GPT-4o-mini** | Fast | High | Low | Speed priority |
| **GPT-3.5 Turbo** | Fastest | Medium | Very Low | Budget priority |

## Summary

**30 seconds for 8 transactions is unfortunately normal for GPT-5 Mini.**

**Options:**
1. ✅ **Accept the slower speed** (better accuracy)
2. ✅ **Use `reasoning_effort: 'low'`** (25-40% faster)
3. ✅ **Use `reasoning_effort: 'minimal'`** (40-50% faster)
4. ✅ **Switch to GPT-4o-mini** (3-4x faster, still accurate)
5. ✅ **Use Priority Processing** (faster, costs more)

**Recommendation:** For transaction categorization, **GPT-4o-mini might be better** if speed matters, or use **GPT-5 Mini with `reasoning_effort: 'low'`** for a good balance.

