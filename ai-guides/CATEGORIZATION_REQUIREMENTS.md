# Transaction Categorization Service - Requirements & Implementation Plan

## Overview

This document defines the requirements and implementation plan for a hybrid transaction categorization system that combines multiple matching strategies in a prioritized order to maximize accuracy, speed, and cost-efficiency.

## Architecture: Hybrid Multi-Strategy Approach

The system uses a **priority-based matching cascade** where transactions are matched using the fastest, most reliable method first, falling back to more expensive methods only when needed.

### Matching Priority Order

1. **Keyword Matching** (Priority 1 - Fastest, Most Reliable)
   - Uses only manually-added keywords (no AI-generated keywords)
   - Instant matching, zero API costs
   - Word boundary matching on cleaned merchant names
   - Highest confidence (100% when matched)

2. **IBAN Matching** (Priority 2 - Exact, Reliable)
   - Exact match on counterparty IBAN
   - Uses merchant's default category
   - Very fast, zero API costs
   - High confidence (100% when matched)

3. **Vector Similarity Search** (Priority 3 - Semantic Matching)
   - Uses OpenAI embeddings API (cheaper than chat completions)
   - Semantic understanding of transaction context
   - PostgreSQL pgvector for fast similarity search
   - Configurable confidence threshold (default: 0.75)

4. **AI Categorization** (Priority 4 - Fallback)
   - OpenAI chat completions API (most expensive)
   - Only for transactions that couldn't be matched by other methods
   - No keyword suggestions (removed from flow)
   - Configurable confidence threshold (default: 0.5)

## Functional Requirements

### FR1: Matching Priority System

The system MUST attempt matching in the exact priority order specified above. Each method should only process transactions that were NOT matched by higher-priority methods.

#### FR1.1: Keyword Matching (Priority 1)
- **Source**: Only keywords with `source = 'manual'` from `category_keywords` table
- **Matching**: Word boundary matching (case-insensitive) on cleaned merchant names
- **Merchant Name Cleaning**: MUST use `cleanMerchantName()` before matching
     - Removes store numbers, cities, dates, transaction IDs
     - Normalizes to Title Case
     - Handles special cases (e.g., "NOTPROVIDED" → "ING Spaarrekening")
- **Performance**: Instant, no API calls, no database queries per transaction
- **Confidence**: 100% (manual keywords are trusted)

#### FR1.2: IBAN Matching (Priority 2)
- **Source**: `merchants` table with `is_active = true` and non-empty `ibans[]` array
- **Matching**: Exact match on normalized counterparty IBAN
- **Result**: Use merchant's `default_category_id`
- **Performance**: Very fast, no API calls
- **Confidence**: 100% (IBAN is exact identifier)

#### FR1.3: Vector Similarity Search (Priority 3)
- **Embedding Model**: OpenAI `text-embedding-3-small` or `text-embedding-3-large`
- **Storage**: PostgreSQL with pgvector extension
- **Search Method**: Cosine similarity search
- **Input**: Transaction text = `merchantName + " " + description`
- **Comparison**: Category embeddings (name + description)
- **Top N Results**: Return top 3 similar categories
- **Confidence Threshold**: Default 0.75 (configurable)
- **Performance**: Fast database query, single API call per transaction (or batch)
- **Confidence**: Based on similarity score (0.0 - 1.0)

#### FR1.4: AI Categorization (Priority 4)
- **Model**: OpenAI chat completions (configurable model)
- **Input**: Transaction details + category list
- **Output**: Category ID + confidence score
- **Confidence Threshold**: Default 0.5 (configurable)
- **Performance**: Slower, expensive API calls
- **Keyword Suggestions**: **REMOVED** - No longer generates or stores keywords
- **Confidence**: AI-provided confidence score (0.0 - 1.0)

### FR2: Transaction Filtering

- **Skip Manual**: Transactions with `is_category_manual = true` are skipped (unless option disabled)
- **Skip Categorized**: Only process transactions with `category_id = null`
- **User Filtering**: All operations filtered by `user_id`
- **Date Filtering**: Optional date range filtering

### FR3: Batch Processing

- **Keyword Matching**: Process all transactions in memory (fast)
- **IBAN Matching**: Process all transactions in memory (fast)
- **Vector Search**: Can batch embedding generation (e.g., 100 transactions at once)
- **AI Categorization**: Process in configurable batches (default: 10 transactions)

### FR4: Iterative Processing

- **Iterations**: System supports multiple iterations until all transactions are categorized or no progress is made
- **Maximum Iterations**: Configurable (default: 10)
- **Stop Condition**: No new categorizations in an iteration
- **Progress Tracking**: Track matches per method per iteration

### FR5: Progress Tracking

Track progress at multiple levels:
- **Per Iteration**:
  - Keyword matches count
  - IBAN matches count
  - Vector matches count
  - AI matches count
  - Transactions remaining
  - Total processed
- **Per Batch** (for AI/Vector):
  - Current batch / total batches
  - Transactions processed
  - Results received
  - Results above/below threshold

## Technical Requirements

### TR1: Database Schema Changes

#### TR1.1: pgvector Extension
- Enable `pgvector` extension in PostgreSQL
- Required for vector similarity search

#### TR1.2: Category Embeddings Storage
- Add `embedding` column to `categories` table
  - Type: `vector(1536)` for `text-embedding-3-small` or `vector(3072)` for `text-embedding-3-large`
  - Nullable (categories without embeddings won't be used in vector search)
- Add `embedding_updated_at` timestamp to track when embedding was generated
- Add index for similarity search: `CREATE INDEX ON categories USING ivfflat (embedding vector_cosine_ops)`

#### TR1.3: Transaction Data Cleaning Columns
- Add `cleaned_merchant_name` String? column to `transactions` table
- Add `normalized_description` String? column to `transactions` table
- Add `amount_category` String? column (enum: 'tiny', 'small', 'medium', 'large', 'huge')
- **Purpose**: Store cleaned/normalized data for embedding generation
- **When to Populate**: During transaction upload/import (preferred) or on-demand during categorization
- **Benefits**: 
  - Avoid re-cleaning on every categorization attempt
  - Consistent cleaning across all categorization methods
  - Faster embedding generation

#### TR1.4: Transaction Embeddings (Optional)
- Option 1: Generate on-demand (no storage)
- Option 2: Add `embedding` vector column to `transactions` table for caching
- Option 3: Add `embedding_updated_at` timestamp to track when embedding was generated
- Recommendation: Start with on-demand, add caching later if needed

#### TR1.5: Keyword Source Filtering
- No schema changes needed
- Filter keywords by `source = 'manual'` in queries
- AI-generated keywords (`source = 'ai'`) are ignored in matching

### TR2: Vector Embeddings - Detailed Implementation

#### TR2.1: Transaction Data Cleaning & Normalization

**Database Storage**
- Add `cleaned_merchant_name` column to `transactions` table
- Add `normalized_description` column to `transactions` table
- Add `amount_category` column (enum: 'tiny', 'small', 'medium', 'large', 'huge')
- **When to Clean**: During transaction upload/import (preferred) or on-demand during categorization
- **Storage Benefit**: Avoid re-cleaning on every categorization attempt

**Cleaning Process**
1. **Merchant Name Cleaning** (enhanced version of existing `cleanMerchantName()`)
   - Remove transaction IDs: `TRX123456`, `TXN789`, `REF-ABC123`
   - Remove dates: `2024-01-15`, `15/01/2024`, `15-01-24`
   - Remove store numbers: `Albert Heijn 1595` → `Albert Heijn`
   - Remove location codes: `NL1234AB`, `AMSTERDAM`, `ROTTERDAM`
   - Remove postal codes: `1234 AB`, `1234AB`
   - Remove business suffixes: `BV`, `NV`, `B.V.`, `LTD`, `LLC` (at end only)
   - Normalize capitalization: Title Case with proper name handling
   - Remove extra whitespace and trim

2. **Description Cleaning** (aggressive noise stripping)
   - Remove transaction references: `TXN: ABC123`, `REF: XYZ789`
   - Remove timestamps: `14:30:25`, `14:30`
   - Remove dates: Same patterns as merchant name
   - Remove IBANs: `NL91ABNA0417164300` (already stored separately)
   - Remove account numbers: Long numeric sequences (10+ digits)
   - Remove common prefixes: `BETALING`, `PAYMENT`, `OVERBOEKING`, `TRANSFER`
   - Remove common suffixes: `BETALINGSKENMERK`, `PAYMENT REF`, `REFERENCE`
   - Normalize whitespace: Multiple spaces to single space
   - Trim and clean

3. **Merchant-Specific Pattern Detection**
   - Use existing merchant keywords to detect patterns
   - For each merchant with keywords:
     - Extract common patterns from merchant name variations
     - Create regex patterns based on keywords
     - Apply pattern-based cleaning before general cleaning
   - Example: If merchant "Albert Heijn" has keyword "albert heijn", detect pattern `ALBERT HEIJN \d+ [A-Z]+` and normalize

4. **Fuzzy Matching & Levenshtein Distance**
   - **Purpose**: Normalize merchant names to known merchant names
   - **Process**:
     - Load all active merchant names from database
     - For each transaction merchant name:
       - Calculate Levenshtein distance to all known merchants
       - If distance ≤ 2 (configurable) and similarity > 0.85:
         - Replace with known merchant name
         - Store original in `raw_merchant_name` (if column exists)
   - **Benefits**:
     - Normalizes typos: "Alber Heijn" → "Albert Heijn"
     - Handles variations: "AH" → "Albert Heijn" (if in merchant DB)
     - Improves embedding consistency
   - **Performance**: Use efficient algorithm (Wagner-Fischer or optimized version)
   - **Caching**: Cache fuzzy matches per merchant name to avoid recalculation

#### TR2.2: Amount Categorization

**Amount Categories**
- **tiny**: < €5 (small purchases, fees)
- **small**: €5 - €25 (coffee, snacks, small items)
- **medium**: €25 - €100 (groceries, meals, moderate purchases)
- **large**: €100 - €500 (shopping, bills, larger purchases)
- **huge**: > €500 (major purchases, rent, large bills)

**Calculation**
- Use absolute amount (ignore credit/debit for size)
- Consider transaction type context:
  - Refunds: Use original amount category (if known)
  - Fees: Usually tiny/small
  - Subscriptions: Usually small/medium
  - Rent/Mortgage: Usually huge

#### TR2.3: Enhanced Transaction Embedding Text

**Input Text Construction**
```
Format: "{merchant_name} {description} {amount_category} {transaction_type} {credit_debit}"
```

**Components**:
1. **Merchant Name**: `cleaned_merchant_name` (from database)
2. **Description**: `normalized_description` (from database)
3. **Amount Category**: `amount_category` (tiny/small/medium/large/huge)
4. **Transaction Type**: `type` (Payment/Transfer/DirectDebit/Deposit/Withdrawal/Refund/Fee/Interest/Other)
5. **Credit/Debit**: `is_debit ? "debit" : "credit"`

**Example**:
```
Input: "Albert Heijn Groceries medium Payment debit"
```

**Why Include These Fields**:
- **Amount Category**: Helps distinguish similar merchants (e.g., "Starbucks small" vs "Starbucks large" = different contexts)
- **Transaction Type**: Important context (e.g., "Refund" should match expense categories)
- **Credit/Debit**: Critical for income vs expense categorization

#### TR2.4: Category Embeddings

**Generation**: One-time generation for all categories
**Update Trigger**: Regenerate when category name or description changes
**Input Text**: `category.name + " " + (category.description || "")`
**Model**: `text-embedding-3-small` (1536 dimensions) or `text-embedding-3-large` (3072 dimensions)
**Batch Size**: Can generate all at once (categories are limited)

**Note**: Category embeddings don't include amount/type because categories are general concepts, not transaction-specific.

#### TR2.5: Embedding Generation Service

**Service Interface**
```typescript
interface EmbeddingService {
  // Basic embedding generation
  generateEmbedding(text: string): Promise<number[]>;
  generateEmbeddingsBatch(texts: string[]): Promise<number[][]>;
  
  // Category embeddings
  generateCategoryEmbeddings(categories: Category[]): Promise<void>;
  
  // Transaction embeddings (with enhanced text)
  generateTransactionEmbeddings(transactions: Transaction[]): Promise<number[][]>;
  
  // Data preparation
  prepareTransactionText(transaction: Transaction): string;
  categorizeAmount(amount: number, type: TransactionType, isDebit: boolean): 'tiny' | 'small' | 'medium' | 'large' | 'huge';
}

interface Transaction {
  id: number;
  cleaned_merchant_name: string;
  normalized_description: string;
  amount: number;
  amount_category: 'tiny' | 'small' | 'medium' | 'large' | 'huge';
  type: TransactionType;
  is_debit: boolean;
}
```

**Transaction Text Preparation**
```typescript
function prepareTransactionText(transaction: Transaction): string {
  const parts = [
    transaction.cleaned_merchant_name,
    transaction.normalized_description,
    transaction.amount_category,
    transaction.type.toLowerCase(),
    transaction.is_debit ? 'debit' : 'credit'
  ];
  
  return parts.filter(p => p && p.length > 0).join(' ');
}
```

#### TR2.6: Database Schema Updates

**New Columns for Transactions Table**
```prisma
model transactions {
  // ... existing fields ...
  
  cleaned_merchant_name    String?  // Cleaned merchant name (for embeddings)
  normalized_description  String?  // Normalized description (for embeddings)
  amount_category         String?   // 'tiny' | 'small' | 'medium' | 'large' | 'huge'
  embedding               Unsupported("vector(1536)")?  // Optional: cache embeddings
  embedding_updated_at    DateTime? // When embedding was generated
  
  // ... rest of fields ...
}
```

**Migration Strategy**
1. Add new columns (nullable initially)
2. Backfill existing transactions:
   - Clean merchant names
   - Normalize descriptions
   - Calculate amount categories
3. Update transaction upload/import to populate these fields immediately
4. Optional: Add embedding column for caching (can be added later)

#### TR2.7: Fuzzy Matching Implementation

**Library**: Use `fast-levenshtein` (lightweight, fast) or custom implementation

**Fuzzy Matching Service**
```typescript
interface FuzzyMatchingService {
  findClosestMerchant(
    merchantName: string,
    knownMerchants: string[],
    options?: {
      maxDistance?: number;      // Default: 2
      minSimilarity?: number;    // Default: 0.85
      preFilter?: boolean;       // Default: true
    }
  ): { merchant: string; distance: number; similarity: number } | null;
  
  normalizeMerchantName(
    rawName: string,
    knownMerchants: string[]
  ): string;
  
  // Batch processing
  normalizeMerchantNamesBatch(
    merchantNames: string[],
    knownMerchants: string[]
  ): Map<string, string>; // rawName -> normalizedName
}
```

**Implementation Algorithm**:

```typescript
function findClosestMerchant(
  merchantName: string,
  knownMerchants: string[],
  options = { maxDistance: 2, minSimilarity: 0.85, preFilter: true }
): { merchant: string; distance: number; similarity: number } | null {
  const normalized = merchantName.trim().toLowerCase();
  
  // Step 1: Pre-filtering (if enabled)
  let candidates = knownMerchants;
  if (options.preFilter) {
    const firstLetter = normalized[0];
    const length = normalized.length;
    
    candidates = knownMerchants.filter(m => {
      const mNormalized = m.trim().toLowerCase();
      // Same first letter
      if (mNormalized[0] !== firstLetter) return false;
      // Similar length (within 50% difference)
      const lengthDiff = Math.abs(mNormalized.length - length);
      const maxLength = Math.max(mNormalized.length, length);
      if (lengthDiff / maxLength > 0.5) return false;
      return true;
    });
  }
  
  // Step 2: Early exit - check for exact match
  const exactMatch = candidates.find(m => 
    m.trim().toLowerCase() === normalized
  );
  if (exactMatch) {
    return {
      merchant: exactMatch,
      distance: 0,
      similarity: 1.0
    };
  }
  
  // Step 3: Calculate Levenshtein distance to all candidates
  let bestMatch: { merchant: string; distance: number; similarity: number } | null = null;
  
  for (const candidate of candidates) {
    const candidateNormalized = candidate.trim().toLowerCase();
    const distance = levenshteinDistance(normalized, candidateNormalized);
    
    // Skip if distance too large
    if (distance > options.maxDistance) continue;
    
    // Calculate similarity
    const maxLength = Math.max(normalized.length, candidateNormalized.length);
    const similarity = 1 - (distance / maxLength);
    
    // Update best match if better
    if (!bestMatch || similarity > bestMatch.similarity) {
      bestMatch = {
        merchant: candidate,
        distance,
        similarity
      };
    }
    
    // Early exit if perfect match found
    if (distance === 0) break;
  }
  
  // Step 4: Return best match if similarity threshold met
  if (bestMatch && bestMatch.similarity >= options.minSimilarity) {
    return bestMatch;
  }
  
  return null;
}
```

**How Fuzzy Matching is Applied**:

1. **During Upload (Optional - Can Skip)**:
   ```typescript
   // Option 1: Skip during upload (recommended)
   // Just store cleaned merchant name from step 1
   cleaned_merchant_name = cleanMerchantName(rawName, description);
   ```

2. **After Upload (Asynchronous - Recommended)**:
   ```typescript
   // Background job processes transactions
   const knownMerchants = await loadAllMerchantNames(); // Load once
   
   for (const transaction of transactions) {
     const fuzzyMatch = fuzzyMatchingService.findClosestMerchant(
       transaction.cleaned_merchant_name, // Use already-cleaned name
       knownMerchants
     );
     
     if (fuzzyMatch) {
       // Update cleaned_merchant_name with better match
       await updateTransaction(transaction.id, {
         cleaned_merchant_name: fuzzyMatch.merchant
       });
       
       // Optionally link to merchant record
       const merchant = await findMerchantByName(fuzzyMatch.merchant);
       if (merchant) {
         await linkTransactionToMerchant(transaction.id, merchant.id);
       }
     }
   }
   ```

3. **During Categorization (On-Demand)**:
   ```typescript
   // If fuzzy matching wasn't done during upload
   // Apply it on-demand during categorization
   const cleanedName = transaction.cleaned_merchant_name || 
                      cleanMerchantName(transaction.merchantName, transaction.description);
   
   // Try fuzzy matching if no exact merchant match found
   if (!transaction.merchant_id) {
     const fuzzyMatch = fuzzyMatchingService.findClosestMerchant(
       cleanedName,
       knownMerchants
     );
     
     if (fuzzyMatch) {
       cleanedName = fuzzyMatch.merchant;
       // Cache result for future use
     }
   }
   ```

**Performance Optimization Details**:

1. **Pre-filtering**:
   - Reduces candidates from 1000s to 10-20 per transaction
   - Uses first letter and length similarity
   - **Speedup**: ~50-100x faster

2. **Early Exit**:
   - Stops immediately if exact match found
   - Stops if very close match found (distance <= 1)
   - **Speedup**: ~2-5x faster for common merchants

3. **Caching**:
   ```typescript
   // Cache structure
   const fuzzyMatchCache = new Map<string, {
     normalized: string;
     distance: number;
     similarity: number;
     timestamp: number;
   }>();
   
   // TTL: 24 hours (merchants don't change often)
   const CACHE_TTL = 24 * 60 * 60 * 1000;
   ```

4. **Batch Processing**:
   ```typescript
   // Load merchants once, use for all transactions
   const knownMerchants = await loadAllMerchantNames(); // ~50ms
   
   // Process all transactions with same merchant list
   const results = transactions.map(t => 
     findClosestMerchant(t.cleaned_merchant_name, knownMerchants)
   );
   ```

**Performance Estimates**:
- **Without optimization**: O(n * m) = 100 × 1000 = 100,000 comparisons ≈ 10-20 seconds ❌
- **With pre-filtering**: O(n * m_filtered) = 100 × 15 = 1,500 comparisons ≈ 500-1000ms ✅
- **With caching**: O(n * m_filtered * cache_hit_rate) ≈ 200-500ms ✅✅

#### TR2.8: Merchant Pattern Detection

**Pattern Detection Service**
```typescript
interface PatternDetectionService {
  detectMerchantPatterns(merchants: Merchant[]): Map<string, RegExp[]>;
  applyPatternCleaning(merchantName: string, patterns: RegExp[]): string;
}

// Process:
// 1. For each merchant with keywords, analyze merchant name variations
// 2. Extract common patterns (store numbers, locations, etc.)
// 3. Create regex patterns
// 4. Apply patterns before general cleaning
```

**Example Pattern Detection**
- Merchant: "Albert Heijn" with keyword "albert heijn"
- Variations seen: "ALBERT HEIJN 1595 AMSTERDAM", "ALBERT HEIJN 1234"
- Detected pattern: `ALBERT HEIJN \d+ [A-Z\s]+`
- Applied cleaning: Remove `\d+ [A-Z\s]+` after "ALBERT HEIJN"

### TR3: Vector Similarity Search

#### TR3.1: PostgreSQL Query
- Use pgvector's cosine similarity operator (`<=>`)
- Query format:
```sql
SELECT 
  id,
  name,
  1 - (embedding <=> $1::vector) AS similarity
FROM categories
WHERE embedding IS NOT NULL
  AND (user_id = $2 OR is_default = true)
ORDER BY embedding <=> $1::vector
LIMIT 3;
```

#### TR3.2: Similarity Scoring
- Cosine similarity returns values 0.0 - 1.0
- 1.0 = identical, 0.0 = completely different
- Threshold: 0.75 = 75% similarity required for match

#### TR3.3: Multiple Category Results
- Return top 3 similar categories
- Use highest similarity if above threshold
- If multiple above threshold, use highest
- If none above threshold, no match (fallback to AI)

### TR4: AI Categorization Updates

#### TR4.1: Remove Keyword Generation
- Remove `suggestedKeywords` field from AI response interface
- Remove keyword addition logic from AI categorization service
- Update prompts to not request keywords

#### TR4.2: Simplified AI Response
```typescript
interface AICategorizationResult {
  transactionId: number;
  categoryId: number | null;
  confidence: number; // 0.0 - 1.0
  reasoning?: string; // Optional explanation
}
```

### TR5: Performance Requirements

#### PR1: Speed
- Keyword matching: < 1ms per transaction (in-memory)
- IBAN matching: < 1ms per transaction (in-memory)
- Vector search: < 50ms per transaction (database query)
- AI categorization: 500ms - 2000ms per batch (API call)

#### PR2: Cost Efficiency
- Keyword/IBAN: $0 (no API calls)
- Vector embeddings: ~$0.0001 per 1K tokens (very cheap)
- AI categorization: ~$0.01 - $0.10 per batch (expensive)
- Goal: Minimize AI API calls by catching transactions earlier

#### PR3: Scalability
- Keyword matching: O(n * k) where n = transactions, k = keywords (very fast)
- IBAN matching: O(n * m) where n = transactions, m = merchants (very fast)
- Vector search: O(n * log(c)) where n = transactions, c = categories (fast with index)
- AI categorization: O(n / b) where n = transactions, b = batch size (slowest)

## Implementation Plan

### Phase 1: Database Setup & Schema Changes

#### Step 1.1: Install pgvector Extension
- Add pgvector extension to PostgreSQL database
- Create migration to enable extension
- Verify extension is available

#### Step 1.2: Add Transaction Cleaning Columns
- Add `cleaned_merchant_name` String? column to `transactions` table
- Add `normalized_description` String? column to `transactions` table
- Add `amount_category` String? column (enum: 'tiny', 'small', 'medium', 'large', 'huge')
- Create Prisma migration
- Backfill existing transactions (run cleaning on all existing data)

#### Step 1.3: Add Vector Columns to Schema
- Add `embedding` vector column to `categories` table
- Add `embedding_updated_at` timestamp column
- Add optional `embedding` vector column to `transactions` table (for caching)
- Add optional `embedding_updated_at` timestamp to `transactions` table
- Create Prisma migration
- Add index for similarity search on categories

#### Step 1.4: Update Prisma Schema
- Add vector fields to categories model
- Add cleaning columns to transactions model
- Note: Prisma doesn't natively support vector type, may need raw SQL
- Consider using `Unsupported` type or custom migration

### Phase 2: Data Cleaning & Normalization

#### Step 2.1: Enhance Merchant Name Cleaning
- Enhance existing `cleanMerchantName()` function
- Add aggressive noise stripping
- Add merchant-specific pattern detection
- Test with real transaction data
- **Performance**: < 1ms per transaction (regex operations, very fast)

#### Step 2.2: Implement Description Cleaning
- Create `normalizeDescription()` function
- Remove transaction references, timestamps, dates
- Remove IBANs, account numbers
- Remove common prefixes/suffixes
- Normalize whitespace
- **Performance**: < 1ms per transaction (regex operations, very fast)

#### Step 2.3: Implement Amount Categorization
- Create `amountCategorizer.ts`
- Implement amount category calculation
- Consider transaction type context
- Handle edge cases (refunds, fees, etc.)
- **Performance**: < 0.1ms per transaction (simple math, instant)

#### Step 2.4: Implement Fuzzy Matching (Optimized)
- Create `fuzzyMatchingService.ts`
- Implement Levenshtein distance calculation
- **Performance Optimization Strategy**:
  - **Option A: During Upload (Optimized)**
    - Load all merchants once per batch (not per transaction)
    - Cache merchant list in memory
    - Use early exit optimizations (first letter matching, length filtering)
    - Only check merchants with similar first letter
    - Limit distance calculation to top candidates
    - **Performance**: ~5-10ms per transaction (with optimizations)
  - **Option B: Asynchronous After Upload** (Recommended for large batches)
    - Do steps 1, 2, 4 during upload (very fast)
    - Queue fuzzy matching for background processing
    - Process in batches asynchronously
    - Update database when complete
    - **Performance**: Non-blocking, can process over time
  - **Option C: On-Demand During Categorization**
    - Skip fuzzy matching during upload
    - Apply fuzzy matching only when needed for categorization
    - Cache results for future use
    - **Performance**: Only when needed, cached for reuse

#### Step 2.5: Integrate Cleaning into Upload Flow

**Recommended Approach: Hybrid (Fast Steps During Upload, Fuzzy Matching Async)**

1. **During Upload (Synchronous - Steps 1, 2, 4)**:
   ```typescript
   // For each transaction in batch:
   - Clean merchant name: ~1ms
   - Normalize description: ~1ms
   - Calculate amount category: ~0.1ms
   - Total: ~2.1ms per transaction
   - For 100 transactions: ~210ms (acceptable)
   ```

2. **After Upload (Asynchronous - Step 3: Fuzzy Matching)**:
   ```typescript
   // Background job:
   - Load all merchants once: ~50ms (one-time)
   - For each transaction:
     - Fuzzy match: ~5-10ms (with optimizations)
   - For 100 transactions: ~500-1000ms (non-blocking)
   - Update database with fuzzy-matched merchant names
   ```

**Implementation Strategy**:
- **Immediate (During Upload)**: Steps 1, 2, 4
  - Populate `cleaned_merchant_name`, `normalized_description`, `amount_category`
  - Store raw merchant name in `merchantName` (for reference)
  - Store cleaned data immediately
- **Asynchronous (After Upload)**: Step 3 (Fuzzy Matching)
  - Queue transactions for fuzzy matching
  - Process in background
  - Update `cleaned_merchant_name` with fuzzy-matched result if better match found
  - Link to merchant record if exact match

#### Step 2.6: Fuzzy Matching Optimization Details

**Optimization Techniques**:

1. **Pre-filtering**:
   ```typescript
   // Only check merchants that:
   - Start with same first letter (case-insensitive)
   - Have similar length (within 50% difference)
   - This reduces candidates from 1000s to 10s
   ```

2. **Early Exit**:
   ```typescript
   // Stop if exact match found
   if (distance === 0) return merchant;
   
   // Stop if very close match found (distance <= 1)
   if (distance <= 1 && similarity > 0.9) return merchant;
   ```

3. **Caching**:
   ```typescript
   // Cache fuzzy match results
   // Key: raw merchant name
   // Value: matched merchant name + distance
   // TTL: 24 hours (merchants don't change often)
   ```

4. **Batch Processing**:
   ```typescript
   // Process multiple transactions against same merchant list
   // Load merchants once, use for all transactions in batch
   ```

5. **Database Indexing**:
   ```sql
   -- Index on merchant name first letter for fast filtering
   CREATE INDEX idx_merchants_first_letter ON merchants (LOWER(SUBSTRING(name, 1, 1)));
   ```

**Performance Estimates**:
- **Without optimization**: O(n * m) where n=transactions, m=merchants
  - 100 transactions × 1000 merchants = 100,000 comparisons
  - ~10-20 seconds (too slow)
- **With optimization**: O(n * m_filtered) where m_filtered << m
  - Pre-filtering reduces merchants to ~10-20 per transaction
  - 100 transactions × 15 merchants = 1,500 comparisons
  - ~500-1000ms (acceptable for async processing)

#### Step 2.7: Backfill Existing Transactions
- Create migration script to clean all existing transactions
- Run cleaning on all transactions in database
- Populate new columns with cleaned data
- **For large datasets**: Process in batches (e.g., 1000 at a time)
- **Fuzzy matching**: Can be done asynchronously after initial cleaning

### Phase 3: Embedding Service Implementation

#### Step 3.1: Create Embedding Service
- Create `src/lib/server/categorization/embeddingService.ts`
- Implement OpenAI embeddings API integration
- Support batch embedding generation
- Handle rate limits and retries

#### Step 3.2: Implement Transaction Text Preparation
- Create `prepareTransactionText()` function
- Combine cleaned merchant name, normalized description, amount category, type, credit/debit
- Format consistently for embedding generation

#### Step 3.3: Category Embedding Generation
- Create script/function to generate embeddings for all categories
- Store embeddings in database
- Update `embedding_updated_at` timestamp
- Handle category updates (regenerate on change)

#### Step 3.4: Transaction Embedding Generation
- Implement on-demand embedding generation using prepared text
- Support batch processing (100 transactions at once)
- Use cleaned data from database (not raw data)
- Cache embeddings if storing in database

### Phase 4: Vector Similarity Search Implementation

#### Step 3.1: Create Vector Search Service
- Create `src/lib/server/categorization/vectorMatcher.ts`
- Implement PostgreSQL similarity search queries
- Handle pgvector syntax (may need raw SQL)
- Return top N categories with similarity scores

#### Step 3.2: Integration with Categorization Flow
- Add vector search as Priority 3 in categorization service
- Filter out already-matched transactions
- Apply confidence threshold
- Handle no-match scenarios (fallback to AI)

### Phase 5: Update Categorization Service

#### Step 4.1: Remove AI Keyword Generation
- Remove `suggestedKeywords` from AI response interface
- Update AI prompts to not request keywords
- Remove keyword addition logic
- Update `addSuggestedKeywords()` function (or remove it)

#### Step 4.2: Update Priority Order
- Ensure keyword matching runs first (manual keywords only)
- Ensure IBAN matching runs second
- Add vector search as third priority
- Keep AI categorization as fourth priority

#### Step 4.3: Update Keyword Loading
- Filter keywords by `source = 'manual'` only
- Remove AI keyword reloading logic
- Simplify keyword caching (no need to reload)

### Phase 6: Testing & Optimization

#### Step 5.1: Unit Tests
- Test embedding generation
- Test vector similarity search
- Test priority order
- Test confidence thresholds

#### Step 5.2: Integration Tests
- Test full categorization flow
- Test each priority level
- Test fallback scenarios
- Test batch processing

#### Step 5.3: Performance Testing
- Measure matching speed per method
- Measure API costs
- Optimize batch sizes
- Tune similarity thresholds

#### Step 5.4: Accuracy Testing
- Compare results with current system
- Measure match accuracy per method
- Identify edge cases
- Fine-tune thresholds

## Data Flow

### Categorization Flow

```
1. Load Data
   ├─ Load manual keywords (source = 'manual')
   ├─ Load merchants with IBANs
   ├─ Load uncategorized transactions
   └─ Load category embeddings (if not cached)

2. Data Preparation (if not already done)
   ├─ Check if transactions have cleaned_merchant_name
   ├─ If missing, clean merchant names (enhanced cleaning)
   ├─ Check if transactions have normalized_description
   ├─ If missing, normalize descriptions
   ├─ Check if transactions have amount_category
   ├─ If missing, calculate amount categories
   ├─ Apply fuzzy matching to merchant names
   ├─ Store cleaned data in database
   └─ Use cleaned data for all subsequent steps

3. Priority 1: Keyword Matching
   ├─ Use cleaned_merchant_name (from database)
   ├─ Match against manual keywords
   ├─ Apply matches
   └─ Get remaining transactions

4. Priority 2: IBAN Matching
   ├─ Match by counterparty IBAN
   ├─ Apply matches
   └─ Get remaining transactions

5. Priority 3: Vector Similarity Search
   ├─ Prepare transaction text:
   │  ├─ cleaned_merchant_name
   │  ├─ normalized_description
   │  ├─ amount_category
   │  ├─ transaction type
   │  └─ credit/debit
   ├─ Generate embeddings for remaining transactions (batch)
   ├─ Search for similar categories using pgvector
   ├─ Filter by confidence threshold (≥ 0.75)
   ├─ Apply matches
   └─ Get remaining transactions

6. Priority 4: AI Categorization
   ├─ Process remaining transactions in batches
   ├─ Filter by confidence threshold (≥ 0.5)
   ├─ Apply matches
   └─ Get final uncategorized transactions

7. Report Results
   ├─ Total matches per method
   ├─ Remaining uncategorized
   └─ Performance metrics
```

### Transaction Upload/Import Flow

#### Immediate Processing (During Upload - Synchronous)

```
1. Receive Transaction Data
   ├─ Raw merchant name
   ├─ Raw description
   ├─ Amount, type, credit/debit
   └─ Other transaction fields

2. Fast Data Cleaning (IMMEDIATE - Steps 1, 2, 4)
   ├─ Clean merchant name (~1ms):
   │  ├─ Remove transaction IDs, dates, store numbers
   │  ├─ Remove location codes, postal codes
   │  ├─ Apply merchant-specific patterns
   │  └─ Normalize capitalization
   ├─ Normalize description (~1ms):
   │  ├─ Remove transaction references
   │  ├─ Remove timestamps, dates
   │  ├─ Remove IBANs, account numbers
   │  ├─ Remove common prefixes/suffixes
   │  └─ Normalize whitespace
   ├─ Calculate amount category (~0.1ms):
   │  └─ tiny/small/medium/large/huge
   └─ Total: ~2.1ms per transaction

3. Store Transaction
   ├─ Store raw data (merchantName, description)
   ├─ Store cleaned data (cleaned_merchant_name, normalized_description, amount_category)
   └─ Ready for categorization
```

**Performance for 100 transactions**:
- Cleaning time: ~210ms (acceptable, non-blocking)
- Database insert: ~200-500ms (batch insert)
- **Total upload time**: ~500-700ms (very fast)

#### Asynchronous Processing (After Upload - Background)

```
4. Fuzzy Matching (ASYNC - Step 3)
   ├─ Load all merchants once (~50ms)
   ├─ For each transaction (~5-10ms with optimizations):
   │  ├─ Pre-filter merchants (first letter, length)
   │  ├─ Calculate Levenshtein distance to candidates
   │  ├─ Find best match (if similarity > 0.85)
   │  └─ Update cleaned_merchant_name if better match found
   └─ For 100 transactions: ~500-1000ms (non-blocking)
```

**Performance for 100 transactions**:
- Fuzzy matching time: ~500-1000ms (background, non-blocking)
- Database updates: ~100-200ms (batch update)
- **Total async time**: ~600-1200ms (doesn't block user)

#### Complete Flow Summary

**During Upload (User Waits)**:
- Steps 1, 2, 4: ~2.1ms per transaction
- Database insert: ~2-5ms per transaction
- **Total**: ~4-7ms per transaction
- **For 100 transactions**: ~400-700ms ✅ (Fast enough)

**After Upload (Background)**:
- Step 3 (Fuzzy Matching): ~5-10ms per transaction
- Database update: ~1-2ms per transaction
- **Total**: ~6-12ms per transaction
- **For 100 transactions**: ~600-1200ms (Non-blocking) ✅

**Key Points**:
1. **Steps 1, 2, 4 happen immediately** during upload (very fast, ~2ms per transaction)
2. **Step 3 (Fuzzy Matching) happens asynchronously** after upload (non-blocking)
3. **Transactions are immediately usable** after upload (with cleaned data from steps 1, 2, 4)
4. **Fuzzy matching improves data quality** but doesn't block categorization
5. **Categorization can start immediately** using cleaned data from steps 1, 2, 4

## Configuration

### Environment Variables
```env
# OpenAI API (for embeddings and AI)
OPENAI_API_KEY=sk-...

# Embedding Model
EMBEDDING_MODEL=text-embedding-3-small  # or text-embedding-3-large

# AI Model
AI_MODEL=gpt-4o-mini  # or other model

# Vector Search Threshold
VECTOR_SIMILARITY_THRESHOLD=0.75

# AI Confidence Threshold
AI_CONFIDENCE_THRESHOLD=0.5

# Batch Sizes
EMBEDDING_BATCH_SIZE=100
AI_BATCH_SIZE=10

# Max Iterations
MAX_ITERATIONS=10
```

## Success Metrics

1. **Efficiency**: 
   - 80%+ of transactions matched by keywords/IBAN (no API calls)
   - 15%+ matched by vector search (cheap API calls)
   - <5% require AI categorization (expensive API calls)

2. **Speed**:
   - Average categorization time < 100ms per transaction
   - 90% of transactions categorized in < 50ms

3. **Cost**:
   - 90%+ reduction in AI API costs
   - Vector embeddings cost < 10% of AI costs

4. **Accuracy**:
   - Maintain or improve categorization accuracy
   - High confidence matches (>0.75) have >95% accuracy

## Migration Strategy

### Step 1: Parallel Implementation
- Implement new system alongside existing
- Test with subset of transactions
- Compare results

### Step 2: Gradual Rollout
- Enable for new transactions first
- Monitor performance and accuracy
- Gradually migrate existing transactions

### Step 3: Full Migration
- Replace old system
- Remove old code
- Update documentation

## Notes

- **No AI Keywords**: AI-generated keywords are completely removed from the flow
- **Manual Keywords Only**: Only manually-added keywords are used for matching
- **Vector Search**: New semantic matching capability using embeddings
- **Cost Optimization**: Priority order minimizes expensive API calls
- **PostgreSQL Native**: Uses pgvector extension, no external vector database needed
- **Backward Compatible**: Existing keywords and merchants continue to work
