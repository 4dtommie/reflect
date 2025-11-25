# Keyword Matching Engine - Implementation Plan

## Overview

Simple keyword matching engine that runs every transaction against all category keywords to automatically assign categories. This is Phase 5.2 from the Category Management Plan.

## Goals

1. **Match transactions to categories** using keywords from `category_keywords` table
2. **Match against** transaction `description` and `merchantName` fields
3. **Skip manual assignments** - don't override transactions where `is_category_manual = true`
4. **Case-insensitive matching** with word boundaries (avoid partial matches)
5. **Handle multiple matches** - use first match or most specific keyword
6. **Update transactions** with matched `category_id`

---

## Step 1: Create Keyword Matching Service

### File: `src/lib/server/categorization/keywordMatcher.ts`

### 1.1 Core Matching Function

**Function:** `matchTransactionToCategory()`

**Input:**
```typescript
{
  description: string;
  merchantName: string;
  keywords: Array<{ category_id: number; keyword: string }>;
}
```

**Output:**
```typescript
{
  categoryId: number | null;
  matchedKeyword: string | null;
  matchType: 'description' | 'merchant' | null;
} | null
```

**Logic:**
1. Normalize input: lowercase both description and merchantName
2. For each keyword:
   - Normalize keyword (lowercase, trim)
   - Check if keyword matches in description (word boundary)
   - Check if keyword matches in merchantName (word boundary)
   - Return first match found
3. Return null if no match

**Word Boundary Matching:**
- Use regex: `\b${escapedKeyword}\b` (case-insensitive)
- Escape special regex characters in keyword
- Match whole words only (not partial)

**Example:**
- Keyword: "coffee" matches "Starbucks coffee shop" ✅
- Keyword: "coffee" does NOT match "coffeemaker" ❌
- Keyword: "ah" matches "AH Supermarket" ✅
- Keyword: "ah" does NOT match "shah" ❌

### 1.2 Helper Functions

**`escapeRegex(str: string): string`**
- Escape special regex characters: `[.*+?^${}()|[\]\\]`
- Return escaped string for safe regex use

**`normalizeText(text: string): string`**
- Convert to lowercase
- Trim whitespace
- Return normalized string

**`createWordBoundaryRegex(keyword: string): RegExp`**
- Escape keyword
- Create regex: `/\b${escapedKeyword}\b/i`
- Return regex for matching

### 1.3 Implementation Tasks

- [ ] Create file `src/lib/server/categorization/keywordMatcher.ts`
- [ ] Implement `escapeRegex()` helper
- [ ] Implement `normalizeText()` helper
- [ ] Implement `createWordBoundaryRegex()` helper
- [ ] Implement `matchTransactionToCategory()` main function
- [ ] Add JSDoc comments
- [ ] Test with various transaction examples

---

## Step 2: Create Categorization Service

### File: `src/lib/server/categorization/categorizationService.ts`

### 2.1 Load Keywords Function

**Function:** `loadAllKeywords()`

**Purpose:** Load all keywords from database once (efficient for batch processing)

**Implementation:**
```typescript
async function loadAllKeywords() {
  const keywords = await db.category_keywords.findMany({
    select: {
      category_id: true,
      keyword: true
    }
  });
  
  return keywords;
}
```

### 2.2 Process Single Transaction

**Function:** `categorizeTransaction(transaction, keywords)`

**Input:**
- Transaction object with `id`, `description`, `merchantName`, `category_id`, `is_category_manual`
- Keywords array from `loadAllKeywords()`

**Logic:**
1. Skip if `is_category_manual === true` (user override)
2. Skip if already has `category_id` (optional - or allow re-categorization)
3. Call `matchTransactionToCategory()` with transaction description/merchant and keywords
4. If match found, return `{ transactionId, categoryId, matchedKeyword, matchType }`
5. If no match, return `{ transactionId, categoryId: null }`

### 2.3 Batch Process Transactions

**Function:** `categorizeTransactionsBatch(userId, options?)`

**Options:**
```typescript
{
  skipManual?: boolean;        // default: true - skip is_category_manual = true
  skipCategorized?: boolean;   // default: false - re-categorize existing
  limit?: number;              // optional: limit number of transactions
  transactionIds?: number[];    // optional: specific transactions to process
}
```

**Logic:**
1. Load all keywords once (efficient)
2. Query transactions for user:
   - Filter: `user_id = userId`
   - Filter: `is_category_manual = false` (if skipManual = true)
   - Filter: `category_id IS NULL` (if skipCategorized = true)
   - Filter: `id IN transactionIds` (if provided)
   - Limit if provided
3. Process each transaction:
   - Call `categorizeTransaction()` for each
   - Collect results
4. Batch update database:
   - Group updates by category_id
   - Use `updateMany()` for efficiency
5. Return results:
```typescript
{
  total: number;
  processed: number;
  categorized: number;
  skipped: number;
  results: Array<{
    transactionId: number;
    categoryId: number | null;
    matchedKeyword: string | null;
    matchType: 'description' | 'merchant' | null;
  }>;
}
```

### 2.4 Implementation Tasks

- [ ] Create file `src/lib/server/categorization/categorizationService.ts`
- [ ] Implement `loadAllKeywords()` function
- [ ] Implement `categorizeTransaction()` function
- [ ] Implement `categorizeTransactionsBatch()` function
- [ ] Add error handling
- [ ] Add logging for debugging
- [ ] Export functions

---

## Step 3: Create API Endpoint

### File: `src/routes/api/transactions/categorize/+server.ts`

### 3.1 POST Handler

**Endpoint:** `POST /api/transactions/categorize`

**Request Body:**
```typescript
{
  skipManual?: boolean;        // default: true
  skipCategorized?: boolean;  // default: false
  limit?: number;              // optional
  transactionIds?: number[];   // optional
}
```

**Response:**
```typescript
{
  success: boolean;
  total: number;
  processed: number;
  categorized: number;
  skipped: number;
  message: string;
  results?: Array<{
    transactionId: number;
    categoryId: number | null;
    matchedKeyword: string | null;
    matchType: 'description' | 'merchant' | null;
  }>;
}
```

**Logic:**
1. Authenticate user
2. Validate request body (optional - all fields optional)
3. Call `categorizeTransactionsBatch()` with userId and options
4. Return results

### 3.2 Implementation Tasks

- [ ] Create file `src/routes/api/transactions/categorize/+server.ts`
- [ ] Implement POST handler
- [ ] Add authentication check
- [ ] Add request validation (optional schema)
- [ ] Call categorization service
- [ ] Return formatted response
- [ ] Add error handling

---

## Step 4: Testing

### 4.1 Unit Tests (Optional but Recommended)

**Test Cases:**
1. Word boundary matching (exact word, not partial)
2. Case-insensitive matching
3. Special characters in keywords
4. Multiple matches (first match wins)
5. No match found
6. Empty description/merchantName
7. Skip manual assignments
8. Skip already categorized

### 4.2 Manual Testing

**Test Scenarios:**
1. Run on transactions with known keywords (e.g., "AH" → Supermarket)
2. Run on transactions without matches (should remain uncategorized)
3. Run on transactions with `is_category_manual = true` (should be skipped)
4. Run on large batch (100+ transactions)
5. Verify database updates correctly

### 4.3 Testing Tasks

- [ ] Test word boundary matching with various keywords
- [ ] Test case-insensitive matching
- [ ] Test special characters (e.g., "C&A", "H&M")
- [ ] Test with real transaction data
- [ ] Test batch processing performance
- [ ] Verify database updates

---

## Implementation Order

### Phase A: Core Matching Logic
1. Create `keywordMatcher.ts` with matching functions
2. Test matching logic with sample data
3. Verify word boundary matching works correctly

### Phase B: Service Layer
1. Create `categorizationService.ts`
2. Implement keyword loading
3. Implement transaction processing
4. Implement batch updates

### Phase C: API Endpoint
1. Create API endpoint
2. Connect to service
3. Test with real requests

### Phase D: Testing & Refinement
1. Test with real transaction data
2. Fix edge cases
3. Optimize performance if needed

---

## Edge Cases to Handle

1. **Empty/null values:**
   - Empty description or merchantName → skip matching
   - Null keywords → handle gracefully

2. **Special characters:**
   - Keywords with regex special chars (e.g., "C&A", "H&M")
   - Escape properly in regex

3. **Multiple matches:**
   - Same keyword in multiple categories → use first match
   - Different keywords match → use first match found
   - Consider: prioritize longer/more specific keywords (future enhancement)

4. **Performance:**
   - Large keyword lists (1000+ keywords)
   - Large transaction batches (1000+ transactions)
   - Consider: index keywords, cache keyword list

5. **Database updates:**
   - Transaction failures → rollback or continue?
   - Partial updates → track failures

---

## Future Enhancements (Post-MVP)

1. **Priority matching:**
   - Longer keywords match first
   - More specific keywords (e.g., "AH Supermarket" vs "AH")
   - Category priority/confidence scores

2. **Performance optimizations:**
   - Cache keywords in memory
   - Use database full-text search
   - Batch keyword queries

3. **Better matching:**
   - Fuzzy matching (typos)
   - Partial word matching (configurable)
   - Multi-word keyword matching

4. **Analytics:**
   - Track match success rate
   - Track most used keywords
   - Track categories with no matches

---

## Notes

- **Simple first:** Start with basic word-boundary matching, optimize later
- **Skip manual:** Always respect `is_category_manual = true`
- **Case-insensitive:** Match "AH" and "ah" the same way
- **Word boundaries:** Avoid false positives (e.g., "car" in "careful")
- **First match wins:** Simple rule for now, can improve later
- **Batch updates:** Use `updateMany()` for efficiency when possible

---

## Success Criteria

✅ Transactions are matched to categories based on keywords
✅ Word boundary matching prevents false positives
✅ Manual assignments are never overridden
✅ API endpoint works and returns results
✅ Database updates are correct
✅ Performance is acceptable (< 1 second for 100 transactions)

