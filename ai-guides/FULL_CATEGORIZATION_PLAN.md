# Full Categorization Implementation Plan

## Overview
Implement a comprehensive categorization system that uses keyword matching first, then AI, with iterative rounds until all transactions are categorized.

## Current State
- ✅ Keyword matching (merchant name only, 1-2 keywords)
- ✅ IBAN matching (priority over keywords)
- ✅ AI categorization (batch processing)
- ✅ Dutch-only prompts (focused expert style)
- ✅ Minimal reasoning/verbosity defaults

## Goal
Create a full categorization flow that:
1. Starts with keyword matching
2. Falls back to AI for unmatched transactions
3. After each AI batch, runs keyword matching again (to catch newly added keywords)
4. Continues iteratively until all transactions are categorized or no progress is made

## Implementation Plan

### Phase 1: Core Categorization Flow

#### 1.1 Create Full Categorization Service
**File**: `src/lib/server/categorization/fullCategorizationService.ts`

**Function**: `categorizeAllTransactions(userId, options?)`

**Flow**:
```typescript
async function categorizeAllTransactions(userId: number, options?: {
  maxIterations?: number; // Default: 10
  batchSize?: number; // Default: from config
  skipManual?: boolean; // Default: true
  skipCategorized?: boolean; // Default: false (we want to recategorize)
  minConfidence?: number; // Default: 0.5
}) {
  let iteration = 0;
  let previousUncategorizedCount = Infinity;
  let uncategorizedCount = 0;
  
  do {
    iteration++;
    console.log(`\n🔄 Iteration ${iteration}`);
    
    // Step 1: Load uncategorized transactions
    const transactions = await loadUncategorizedTransactions(userId, options);
    uncategorizedCount = transactions.length;
    
    if (uncategorizedCount === 0) {
      console.log('✅ All transactions categorized!');
      break;
    }
    
    console.log(`   📊 Found ${uncategorizedCount} uncategorized transactions`);
    
    // Step 2: Keyword matching round
    console.log('   🔍 Running keyword matching...');
    const keywordResults = await categorizeWithKeywords(transactions, userId);
    const keywordMatched = keywordResults.filter(r => r.categoryId !== null).length;
    console.log(`   ✅ Keyword matched: ${keywordMatched} transactions`);
    
    // Step 3: IBAN matching for remaining
    const remainingAfterKeywords = transactions.filter(t => 
      !keywordResults.find(r => r.transactionId === t.id && r.categoryId !== null)
    );
    
    if (remainingAfterKeywords.length > 0) {
      console.log('   🏦 Running IBAN matching...');
      const ibanResults = await categorizeWithIBAN(remainingAfterKeywords, userId);
      const ibanMatched = ibanResults.filter(r => r.categoryId !== null).length;
      console.log(`   ✅ IBAN matched: ${ibanMatched} transactions`);
    }
    
    // Step 4: AI categorization for remaining
    const remainingAfterIBAN = remainingAfterKeywords.filter(t =>
      !ibanResults.find(r => r.transactionId === t.id && r.categoryId !== null)
    );
    
    if (remainingAfterIBAN.length > 0) {
      console.log(`   🤖 Running AI categorization on ${remainingAfterIBAN.length} transactions...`);
      const aiResults = await categorizeWithAI(remainingAfterIBAN, userId, options);
      const aiMatched = aiResults.filter(r => r.categoryId !== null).length;
      console.log(`   ✅ AI matched: ${aiMatched} transactions`);
      
      // Step 5: Add AI-suggested keywords to database
      await addSuggestedKeywords(aiResults);
      console.log('   📝 Added AI-suggested keywords to database');
    }
    
    // Check if we made progress
    if (uncategorizedCount >= previousUncategorizedCount) {
      console.log('   ⚠️  No progress made, stopping iteration');
      break;
    }
    
    previousUncategorizedCount = uncategorizedCount;
    
  } while (iteration < (options?.maxIterations || 10));
  
  return {
    totalIterations: iteration,
    finalUncategorizedCount: uncategorizedCount,
    categorized: previousUncategorizedCount - uncategorizedCount
  };
}
```

#### 1.2 Helper Functions

**Load Uncategorized Transactions**:
```typescript
async function loadUncategorizedTransactions(
  userId: number,
  options?: { skipManual?: boolean }
): Promise<Transaction[]> {
  return await db.transactions.findMany({
    where: {
      user_id: userId,
      category_id: null,
      ...(options?.skipManual !== false ? { is_category_manual: false } : {})
    },
    orderBy: { date: 'desc' }
  });
}
```

**Categorize with Keywords** (reuse existing):
- Use `categorizationService.categorizeTransaction()` with keyword matching
- Filter for transactions that get matched

**Categorize with IBAN** (reuse existing):
- Use `categorizationService.categorizeTransaction()` with IBAN matching
- Filter for transactions that get matched

**Categorize with AI** (reuse existing):
- Use `aiCategorizer.categorizeBatchWithAI()`
- Process in batches
- Apply minimum confidence threshold

### Phase 2: API Endpoint

#### 2.1 Create Full Categorization Endpoint
**File**: `src/routes/api/categorize-all/+server.ts`

**Endpoint**: `POST /api/categorize-all`

**Request Body**:
```typescript
{
  maxIterations?: number;
  batchSize?: number;
  skipManual?: boolean;
  minConfidence?: number;
}
```

**Response**:
```typescript
{
  success: boolean;
  totalIterations: number;
  finalUncategorizedCount: number;
  categorized: number;
  errors?: string[];
}
```

### Phase 3: UI Integration

#### 3.1 Add Categorize All Button
**File**: `src/routes/(protected)/transactions/+page.svelte` (or appropriate page)

**Features**:
- Button: "Categorize all transactions"
- Progress indicator during categorization
- Show results (how many categorized, how many remain)
- Option to run in background (for large datasets)

#### 3.2 Progress Tracking
- Show current iteration
- Show transactions processed
- Show matches per method (keyword, IBAN, AI)
- Show estimated time remaining

### Phase 4: Optimization & Safety

#### 4.1 Rate Limiting
- Limit AI API calls per minute
- Add delays between batches if needed
- Respect OpenAI rate limits

#### 4.2 Error Handling
- Continue on individual transaction errors
- Log errors but don't stop entire process
- Return error summary at end

#### 4.3 Progress Persistence
- Optionally save progress to database
- Allow resuming from last checkpoint
- Track which transactions were processed

#### 4.4 Confidence Thresholds
- Only apply AI results above confidence threshold
- Lower threshold for keyword matching (exact match = high confidence)
- Different thresholds for different methods

### Phase 5: Monitoring & Reporting

#### 5.1 Statistics
- Track categorization success rate
- Track method effectiveness (keyword vs IBAN vs AI)
- Track iteration efficiency
- Track keyword learning (how many new keywords added)

#### 5.2 Logging
- Detailed logs for debugging
- Performance metrics
- Cost tracking (AI API usage)

## Implementation Steps

### Step 1: Create Full Categorization Service
1. Create `fullCategorizationService.ts`
2. Implement `categorizeAllTransactions()` function
3. Implement helper functions
4. Add unit tests

### Step 2: Create API Endpoint
1. Create `/api/categorize-all` endpoint
2. Add authentication check
3. Add request validation
4. Add error handling

### Step 3: Integrate with UI
1. Add button to transactions page
2. Add progress modal/indicator
3. Add results display
4. Add error handling UI

### Step 4: Testing
1. Test with small dataset (10-20 transactions)
2. Test with medium dataset (100-200 transactions)
3. Test with large dataset (1000+ transactions)
4. Test error scenarios
5. Test edge cases (all already categorized, all uncategorizable)

### Step 5: Optimization
1. Optimize database queries
2. Add caching where appropriate
3. Optimize batch sizes
4. Add rate limiting
5. Add progress persistence

## Key Considerations

### Performance
- Process in batches to avoid memory issues
- Use database transactions for consistency
- Consider background job processing for large datasets

### Cost
- AI API calls are the main cost
- Keyword matching is free
- IBAN matching is free
- Minimize AI calls by maximizing keyword/IBAN matches first

### Accuracy
- Keyword matching is most accurate (exact match)
- IBAN matching is very accurate (exact match)
- AI matching varies by confidence
- Iterative approach improves accuracy over time (learns from AI suggestions)

### User Experience
- Show progress clearly
- Allow cancellation
- Show results summary
- Allow manual review of AI-suggested categories

## Future Enhancements

1. **Background Jobs**: Use queue system (e.g., BullMQ) for large datasets
2. **Incremental Updates**: Only process new transactions
3. **Learning System**: Track which keywords work best, prioritize them
4. **User Feedback**: Allow users to correct AI suggestions, learn from corrections
5. **Category Suggestions**: Suggest new categories based on uncategorized transactions
6. **Merchant Normalization**: Improve merchant name cleaning based on patterns
7. **Time-based Rules**: Use transaction time more effectively (e.g., lunch at 12:00)

## Success Metrics

- **Categorization Rate**: % of transactions successfully categorized
- **Accuracy**: % of categorizations that are correct (user feedback)
- **Efficiency**: Average iterations needed to categorize all transactions
- **Cost**: Average cost per transaction categorized
- **Speed**: Time to categorize 1000 transactions

