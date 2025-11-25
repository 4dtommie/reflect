# Merchant Name Cleaning - Implementation Plan

## Overview

Add cleaned merchant names to transactions. Since we categorize using keyword matching (fast, free), we need a strategy that doesn't require AI for every transaction.

## Options Considered

### Option 1: AI for All Transactions ❌
- **Pros:** Most accurate
- **Cons:** Expensive (AI call for every transaction), slow
- **Verdict:** Not practical for large transaction volumes

### Option 2: Simple Pattern-Based Cleaning ✅ (Recommended)
- **Pros:** Fast, free, works for common patterns
- **Cons:** Less accurate for complex cases
- **Verdict:** Good for keyword-matched transactions

### Option 3: Hybrid Approach ✅✅ (Best)
- **Pros:** Fast for most, accurate for difficult cases
- **Cons:** More complex implementation
- **Verdict:** Best balance of cost, speed, and accuracy

## Recommended Solution: Hybrid Approach

### Strategy

1. **For Keyword-Matched Transactions:**
   - Use simple pattern-based cleaning (regex rules)
   - Clean common patterns: dates, transaction IDs, location codes, etc.
   - Store cleaned name in `merchants` table
   - Link transaction to merchant record

2. **For Unmatched Transactions (AI Phase):**
   - When AI categorizes, also clean merchant name
   - AI returns both category and cleaned merchant name
   - Store in `merchants` table and link transaction

3. **Merchant Table Usage:**
   - Store cleaned merchant names
   - Link transactions via `merchant_id`
   - Reuse cleaned names for future transactions with same raw name

## Implementation Plan

### Step 1: Add Merchant Name Cleaning Service

**File:** `src/lib/server/categorization/merchantNameCleaner.ts`

**Simple Cleaning Rules:**
- Remove transaction IDs (e.g., "TRX123456")
- Remove dates (e.g., "2024-01-15")
- Remove location codes (e.g., "NL123", "AMSTERDAM")
- Remove common suffixes (e.g., "BV", "NV", "B.V.", "N.V.")
- Normalize spacing and capitalization
- Remove duplicate words
- Common patterns:
  - "ALBERT HEIJN 1234 AMSTERDAM" → "Albert Heijn"
  - "AH TO GO 5678" → "AH To Go"
  - "STARBUCKS COFFEE NL" → "Starbucks Coffee"

**Function:**
```typescript
function cleanMerchantName(rawName: string): string {
  // Apply cleaning rules
  // Return cleaned name
}
```

### Step 2: Update Keyword Matching to Clean Merchant Names

**File:** `src/lib/server/categorization/categorizationService.ts`

**Changes:**
- After keyword match, clean merchant name
- Find or create merchant record
- Link transaction to merchant
- Store cleaned name

**Flow:**
1. Match transaction to category via keywords
2. Clean merchant name using simple rules
3. Find existing merchant by cleaned name (or create new)
4. Update transaction with `merchant_id`
5. Store cleaned name in merchant record

### Step 3: Update AI Categorization to Include Merchant Cleaning

**File:** `src/lib/server/categorization/aiCategorizer.ts` (when implemented)

**Changes:**
- AI prompt includes request for cleaned merchant name
- AI returns: `{ categoryId, confidence, cleanedMerchantName, suggestedKeywords }`
- Store cleaned name in merchants table
- Link transaction to merchant

### Step 4: Update Database Schema (if needed)

**Option A: Use existing `merchants` table**
- Add `cleaned_name` field (or use `name` as cleaned name)
- Store raw name in transaction `merchantName`
- Use `merchant_id` to link to cleaned name

**Option B: Add field to transactions**
- Add `cleaned_merchant_name` field to transactions
- Simpler but less normalized

**Recommendation:** Use Option A (merchants table) - better normalization, reusable

### Step 5: Update Transaction Display

**File:** `src/routes/(protected)/transactions/+page.svelte`

**Changes:**
- Display cleaned merchant name from `merchants.name` if `merchant_id` exists
- Fallback to raw `merchantName` if no merchant link
- Show both raw and cleaned (optional, for debugging)

## Simple Cleaning Rules (Pattern-Based)

### Patterns to Remove:
1. **Transaction IDs:** `TRX\d+`, `TXN\d+`, `\d{10,}` (long numbers)
2. **Dates:** `\d{4}-\d{2}-\d{2}`, `\d{2}/\d{2}/\d{4}`
3. **Location codes:** `NL\d+`, `AMSTERDAM`, `ROTTERDAM`, etc.
4. **Common suffixes:** `BV`, `NV`, `B.V.`, `N.V.`, `LTD`, `LLC`
5. **Store numbers:** `#\d+`, `STORE \d+`
6. **Extra whitespace:** Multiple spaces, tabs

### Normalization:
1. **Capitalization:** Title case (first letter of each word)
2. **Spacing:** Single spaces between words
3. **Special characters:** Keep hyphens, apostrophes, ampersands
4. **Common abbreviations:** Normalize (e.g., "AH" stays "AH", not "Ah")

### Examples:
```
"ALBERT HEIJN 1234 AMSTERDAM" → "Albert Heijn"
"AH TO GO 5678" → "AH To Go"
"STARBUCKS COFFEE NL" → "Starbucks Coffee"
"MC DONALD'S RESTAURANT BV" → "McDonald's Restaurant"
"ING BANK NV" → "ING Bank"
```

## Implementation Order

### Phase 1: Simple Cleaning (Fast)
1. Create `merchantNameCleaner.ts` with pattern-based rules
2. Update keyword matching to clean and store merchant names
3. Update transaction display to show cleaned names
4. Test with real transaction data

### Phase 2: AI Integration (Later)
1. When implementing AI categorization, add merchant name cleaning to AI prompt
2. AI returns cleaned merchant name along with category
3. Store in merchants table

## Benefits

1. **Fast:** Pattern-based cleaning is instant
2. **Free:** No AI costs for keyword-matched transactions
3. **Accurate enough:** Handles 80-90% of common cases
4. **Scalable:** Works with large transaction volumes
5. **Improves over time:** As merchants are created, future transactions auto-link

## Future Enhancements

1. **Fuzzy matching:** Match similar merchant names (e.g., "AH" and "ALBERT HEIJN")
2. **Merchant aliases:** Store multiple raw names for same merchant
3. **User corrections:** Allow users to manually correct cleaned names
4. **Learning:** Track which cleaning rules work best

## Notes

- Start simple with pattern-based cleaning
- Add AI cleaning only for unmatched transactions (when AI categorization is implemented)
- Use merchants table for normalization and reuse
- Keep raw `merchantName` in transactions for reference

