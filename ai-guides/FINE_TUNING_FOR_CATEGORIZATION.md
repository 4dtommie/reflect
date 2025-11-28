# Fine-Tuning for Transaction Categorization

## What is Fine-Tuning?

**Fine-tuning** is training a pre-existing OpenAI model (like `gpt-3.5-turbo`, `gpt-4o-mini`, or `gpt-5-mini`) on your specific data to make it better at your particular task. Instead of relying on prompt engineering alone, you provide hundreds or thousands of examples, and the model learns patterns from your data.

### Key Concept

**Regular API (Prompt Engineering):**
```
Prompt: "Categorize this transaction..."
  ↓
Model uses general knowledge
  ↓
Response (may need complex prompts)
```

**Fine-Tuned Model:**
```
Model trained on 1000+ examples of YOUR transactions
  ↓
Model learns YOUR patterns, categories, merchant names
  ↓
Response (simpler prompts, better accuracy)
```

## How Fine-Tuning Could Help

### 1. **Better Accuracy**
- Model learns your specific merchant names, patterns, and category preferences
- Understands your domain-specific language (Dutch merchants, local stores, etc.)
- Can improve accuracy from ~85% to ~95% in some cases

### 2. **Simpler Prompts**
- Current: Long prompt with all categories, instructions, examples
- Fine-tuned: Shorter prompt, model already knows your categories
- **Result:** Fewer tokens = lower cost per request

### 3. **Better Batch Handling**
- Model trained on your data structure
- Better at handling multiple transactions in one request
- Potentially can handle larger batches without accuracy loss

### 4. **Consistent Output Format**
- Model learns your exact JSON format
- Less parsing errors
- More reliable responses

### 5. **Domain-Specific Knowledge**
- Learns Dutch merchant names (Albert Heijn, Jumbo, etc.)
- Understands local payment patterns
- Recognizes recurring transactions

## Training Data Format

### JSONL Format (JSON Lines)

Each line is a training example:

```jsonl
{"messages": [{"role": "system", "content": "You are a financial transaction categorizer. Return JSON only."}, {"role": "user", "content": "Transaction ID 123\nDate: Jan 15, 2024 at 14:30\nDescription: Payment at Albert Heijn store\nMerchant: ALBERT HEIJN 1234 AMSTERDAM\nAmount: €45.67 (expense)\nType: Payment\n\nCategories:\n1. Supermarket - Large grocery stores\n2. Butcher - Butcher shops\n..."}, {"role": "assistant", "content": "{\"results\": [{\"transactionId\": 123, \"categoryId\": 1, \"confidence\": 0.9, \"suggestedKeywords\": [\"albert heijn\", \"ah\"], \"reasoning\": \"Albert Heijn is a Dutch supermarket chain\"}]}"}]}
{"messages": [{"role": "system", "content": "You are a financial transaction categorizer. Return JSON only."}, {"role": "user", "content": "Transaction ID 124\nDate: Jan 15, 2024 at 19:00\nDescription: Restaurant payment\nMerchant: DE BURGER BAR AMSTERDAM\nAmount: €28.50 (expense)\nType: Payment\n\nCategories:\n1. Eating Out - Restaurants and cafes\n2. Fast Food - Quick service restaurants\n..."}, {"role": "assistant", "content": "{\"results\": [{\"transactionId\": 124, \"categoryId\": 1, \"confidence\": 0.85, \"suggestedKeywords\": [\"burger bar\"], \"reasoning\": \"Restaurant payment in evening\"}]}"}]}
```

### Structure

Each training example has:
- **System message:** Role definition (can be simplified after fine-tuning)
- **User message:** Transaction data + categories (same format as current prompt)
- **Assistant message:** Expected JSON response (what you want the model to return)

### Generating Training Data

You can generate training data from:
1. **Manually categorized transactions** (gold standard)
2. **AI-categorized transactions** (after review/correction)
3. **Historical data** (transactions you've already categorized)

**Example script to generate training data:**

```typescript
import fs from 'fs';
import { db } from '$lib/server/db';

interface TrainingExample {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
}

async function generateTrainingData(userId: number, outputPath: string) {
  // Get manually categorized transactions (with high confidence)
  const transactions = await db.transactions.findMany({
    where: {
      user_id: userId,
      category_id: { not: null },
      // Only use transactions you're confident about
      // Maybe add a confidence_score field or use reviewed transactions
    },
    include: {
      categories: true
    },
    take: 1000 // Start with 1000 examples
  });

  const examples: TrainingExample[] = [];

  for (const tx of transactions) {
    // Load categories (same as current prompt)
    const categories = await loadCategoriesForAI(userId);
    
    // Create user message (transaction + categories)
    const userMessage = createCategorizationPrompt(
      categories,
      [{
        id: tx.id,
        description: tx.description,
        merchantName: tx.merchant_name || '',
        amount: tx.amount,
        type: tx.type,
        is_debit: tx.is_debit,
        date: tx.date.toISOString()
      }]
    );

    // Create assistant message (expected response)
    const assistantMessage = JSON.stringify({
      results: [{
        transactionId: tx.id,
        categoryId: tx.category_id,
        confidence: 0.9, // High confidence for training data
        suggestedKeywords: [], // Can extract from existing keywords
        reasoning: `Categorized as ${tx.categories?.name}`
      }]
    });

    examples.push({
      messages: [
        {
          role: 'system',
          content: 'You are a financial transaction categorizer. Return JSON only.'
        },
        {
          role: 'user',
          content: userMessage
        },
        {
          role: 'assistant',
          content: assistantMessage
        }
      ]
    });
  }

  // Write to JSONL file
  const lines = examples.map(ex => JSON.stringify(ex));
  fs.writeFileSync(outputPath, lines.join('\n'));

  console.log(`✅ Generated ${examples.length} training examples`);
}
```

## Cost Comparison

### Fine-Tuning Costs

**Training (One-time):**
- **GPT-3.5 Turbo:** $8.00 per 1M tokens
- **GPT-4o Mini:** Not currently available for fine-tuning
- **GPT-4:** Not available for fine-tuning
- **GPT-5 models:** Check OpenAI documentation for fine-tuning availability

**Usage (After Training):**
- **GPT-3.5 Turbo (Fine-tuned):** 
  - Input: $3.00 per 1M tokens
  - Output: $6.00 per 1M tokens
- **Regular GPT-3.5 Turbo:**
  - Input: $0.50 per 1M tokens
  - Output: $1.50 per 1M tokens
- **GPT-5 models:** Check OpenAI pricing for fine-tuned model costs

**Wait, fine-tuned is MORE expensive?** Yes, but:
- You use **fewer tokens** (simpler prompts)
- Better accuracy = fewer retries
- Potentially larger batches = fewer API calls

### Cost Analysis

**Example: 10,000 transactions**

**Regular API (gpt-5-mini or gpt-4o-mini):**
- Batch size: 10 transactions
- Batches: 1,000 API calls
- Tokens per batch: ~1,500 (input) + ~300 (output) = 1,800
- Total tokens: 1,800,000
- Cost: ~$0.27 (input) + ~$1.08 (output) = **$1.35**

**Fine-Tuned GPT-3.5 Turbo:**
- Simpler prompt: ~800 tokens (input) + ~300 (output) = 1,100 per batch
- Total tokens: 1,100,000
- Cost: ~$3.30 (input) + ~$6.60 (output) = **$9.90**
- **But:** Training cost: ~$50-100 (one-time)

**Break-even point:**
- If you process 100,000+ transactions, fine-tuning becomes cost-effective
- If you process fewer, regular API is cheaper

## Pros and Cons

### ✅ Pros

1. **Better Accuracy**
   - Learns your specific patterns
   - Understands domain-specific language
   - Can improve from 85% to 95% accuracy

2. **Simpler Prompts**
   - Fewer tokens per request
   - Less prompt engineering needed
   - Model "remembers" your categories

3. **Consistent Format**
   - Less parsing errors
   - More reliable JSON output
   - Better batch handling

4. **Domain Knowledge**
   - Learns merchant names
   - Understands local patterns
   - Recognizes recurring transactions

5. **Potentially Larger Batches**
   - Model trained on your format
   - May handle 15-20 transactions per batch
   - Better accuracy with larger batches

### ❌ Cons

1. **Higher Usage Costs**
   - Fine-tuned models cost more per token
   - Need significant volume to break even

2. **Training Costs**
   - One-time cost: $50-200+ for training
   - Need quality training data (1000+ examples)

3. **Training Data Requirements**
   - Need 1000+ high-quality examples
   - Must be manually reviewed/corrected
   - Time-consuming to prepare

4. **Model Updates**
   - If categories change, need to retrain
   - If format changes, need to retrain
   - Less flexible than prompt engineering

5. **Limited Model Options**
   - Only GPT-3.5 Turbo available for fine-tuning (as of 2025)
   - Can't fine-tune GPT-4o-mini or GPT-5 models (check OpenAI docs for updates)
   - May be slower than newer models like gpt-5-mini

6. **Maintenance**
   - Need to track model versions
   - Need to retrain periodically
   - More complex deployment

## When Fine-Tuning Makes Sense

### ✅ Use Fine-Tuning When:

1. **Large Volume**
   - Processing 100,000+ transactions per year
   - High enough volume to justify training costs

2. **Consistent Patterns**
   - Similar transaction types
   - Recurring merchants
   - Stable category structure

3. **Quality Training Data**
   - Have 1000+ manually reviewed transactions
   - High confidence in categorization
   - Can generate quality examples

4. **Accuracy Critical**
   - Need 95%+ accuracy
   - Current accuracy insufficient
   - Errors are costly

5. **Domain-Specific**
   - Unique merchant names
   - Local patterns
   - Specialized categories

### ❌ Don't Use Fine-Tuning When:

1. **Small Volume**
   - <10,000 transactions per year
   - Training costs don't justify

2. **Frequently Changing**
   - Categories change often
   - New merchants constantly
   - Format evolves

3. **Limited Training Data**
   - <500 quality examples
   - Unclear patterns
   - Inconsistent categorization

4. **Cost-Sensitive**
   - Need cheapest option
   - Can't afford training costs
   - Volume too low

5. **Experimental**
   - Still refining categories
   - Testing different approaches
   - Not ready to commit

## Implementation Strategy

### Phase 1: Evaluate (Current)

**Questions to answer:**
1. How many transactions do you process per year?
2. What's your current accuracy?
3. Do you have 1000+ quality examples?
4. Are categories stable?
5. Is cost or accuracy more important?

### Phase 2: Collect Training Data

**If proceeding:**
1. Export manually categorized transactions
2. Review and correct AI-categorized transactions
3. Generate 1000+ training examples
4. Validate data quality

### Phase 3: Fine-Tune

**Steps:**
1. Prepare JSONL file
2. Upload to OpenAI
3. Create fine-tuning job
4. Monitor training (can take hours)
5. Test fine-tuned model

### Phase 4: Deploy

**Integration:**
1. Update code to use fine-tuned model
2. Simplify prompts
3. Test accuracy
4. Monitor costs
5. Compare with regular API

## Code Example: Fine-Tuning Integration

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Fine-tuned model ID (after training)
const FINE_TUNED_MODEL = 'ft:gpt-3.5-turbo-1106:your-org:model-name:xxxxx';

/**
 * Categorize with fine-tuned model (simpler prompt)
 */
async function categorizeWithFineTunedModel(
  userId: number,
  transactions: TransactionForAI[]
): Promise<AICategorizationBatchResult> {
  // Load categories (still needed, but simpler format)
  const categories = await loadCategoriesForAI(userId);
  
  // Simplified prompt (model already knows the format)
  const prompt = createSimplifiedPrompt(categories, transactions);
  
  const response = await openai.chat.completions.create({
    model: FINE_TUNED_MODEL, // Use fine-tuned model
    messages: [
      {
        role: 'system',
        content: 'Categorize transactions. Return JSON only.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.3,
    max_tokens: 2000,
    response_format: { type: 'json_object' }
  });
  
  // Parse response (same as before)
  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from fine-tuned model');
  }
  
  const result = JSON.parse(content);
  return {
    results: result.results || [],
    errors: [],
    tokensUsed: {
      prompt: response.usage?.prompt_tokens || 0,
      completion: response.usage?.completion_tokens || 0,
      total: response.usage?.total_tokens || 0
    }
  };
}

/**
 * Simplified prompt (fewer tokens needed)
 */
function createSimplifiedPrompt(
  categories: CategoryForAI[],
  transactions: TransactionForAI[]
): string {
  // Model already knows the format, so we can be more concise
  const categoriesText = categories
    .map(cat => `${cat.id}. ${cat.name}${cat.description ? ` - ${cat.description}` : ''}`)
    .join('\n');
  
  const transactionsText = transactions
    .map(t => `ID ${t.id}: ${t.merchantName} - ${t.description} - €${t.amount} (${t.is_debit ? 'expense' : 'income'})`)
    .join('\n');
  
  return `Categories:\n${categoriesText}\n\nTransactions:\n${transactionsText}\n\nCategorize each transaction. Return JSON with transactionId, categoryId, confidence, suggestedKeywords.`;
}
```

## Hybrid Approach

**Best of both worlds:**

1. **Use fine-tuned model** for:
   - Bulk categorization
   - Known patterns
   - High-volume operations

2. **Use regular API** for:
   - New transaction types
   - Edge cases
   - Real-time categorization

3. **Switch dynamically:**
```typescript
function shouldUseFineTunedModel(transactionCount: number): boolean {
  // Use fine-tuned for large batches
  return transactionCount >= 50;
}

async function categorizeTransactions(
  userId: number,
  transactions: TransactionForAI[]
): Promise<AICategorizationResult[]> {
  if (shouldUseFineTunedModel(transactions.length)) {
    return await categorizeWithFineTunedModel(userId, transactions);
  } else {
    return await categorizeWithRegularAPI(userId, transactions);
  }
}
```

## Training Data Quality Tips

1. **Diversity:** Include examples from all categories
2. **Accuracy:** Only use examples you're confident about
3. **Balance:** Similar number of examples per category
4. **Edge Cases:** Include difficult/ambiguous transactions
5. **Format Consistency:** All examples use same format
6. **Validation:** Review training data before uploading

## Resources

- **Fine-Tuning Guide:** https://platform.openai.com/docs/guides/fine-tuning
- **Fine-Tuning API:** https://platform.openai.com/docs/api-reference/fine-tuning
- **Best Practices:** https://platform.openai.com/docs/guides/fine-tuning-best-practices
- **Pricing:** https://openai.com/api/pricing/

## Recommendation

**For your use case (transaction categorization):**

**Start with regular API because:**
- ✅ Lower cost (gpt-4o-mini is very cheap)
- ✅ More flexible (easy to update prompts)
- ✅ Good enough accuracy (85-90%)
- ✅ No training data needed
- ✅ Works immediately

**Consider fine-tuning later if:**
- You process 100,000+ transactions/year
- You have 1000+ quality training examples
- Accuracy becomes critical
- You want to optimize for larger batches
- Categories are stable

**Alternative: Assisted Fine-Tuning**
- OpenAI offers assisted fine-tuning for complex cases
- They help with training data preparation
- Better for enterprise use cases
- Contact OpenAI for details

## Summary

**Fine-tuning can help, but:**
- Requires significant volume to justify costs
- Needs quality training data (1000+ examples)
- Higher per-token costs (but fewer tokens needed)
- Less flexible than prompt engineering

**For now:**
- ✅ Stick with regular API (gpt-5-mini recommended, or gpt-4o-mini)
- ✅ Focus on prompt optimization
- ✅ Collect training data as you go
- ✅ Revisit fine-tuning when volume justifies it

**Future consideration:**
- Monitor transaction volume
- Track accuracy improvements needed
- Collect quality training examples
- Evaluate fine-tuning when ready

