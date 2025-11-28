# Generic Multi-Category Merchant Solution

## Goal

Make the enhanced keyword matching work automatically for **any merchant** that appears in multiple categories, not just specific ones like "nationale-nederlanden".

## The Generic Problem

**When a merchant keyword matches multiple categories:**
- Merchant "X" has keyword in Category A
- Merchant "X" also has keyword in Category B  
- Transaction from "X" could belong to either category
- Need to use description context to disambiguate

## Solution: Ambiguity Detection + Description Priority

### Core Concept

1. **Detect Ambiguity**: When merchant keyword matches, check if it matches multiple categories
2. **Description Priority**: If ambiguous, prioritize description keywords
3. **Automatic**: Works for any merchant without manual configuration

### Algorithm

```
1. Match merchant keyword → Get all matching categories
2. If multiple categories match:
   a. Check description for category-specific keywords
   b. If description matches one category → Use that category
   c. If description matches multiple → Use first match (or AI)
   d. If description matches none → Use merchant's default category (if exists) or first match
3. If only one category matches → Use it (current behavior)
```

## Implementation

### Step 1: Update Keyword Matching to Return All Matches

**Current:** Returns first match
**New:** Return all matches, then resolve ambiguity

```typescript
interface KeywordMatch {
  categoryId: number;
  matchedKeyword: string;
  matchType: 'description' | 'merchant';
}

interface KeywordMatches {
  merchantMatches: KeywordMatch[];
  descriptionMatches: KeywordMatch[];
}
```

### Step 2: Ambiguity Detection

```typescript
function detectAmbiguity(matches: KeywordMatches): boolean {
  // Ambiguous if merchant matches multiple categories
  const uniqueMerchantCategories = new Set(
    matches.merchantMatches.map(m => m.categoryId)
  );
  return uniqueMerchantCategories.size > 1;
}
```

### Step 3: Resolution Logic

```typescript
function resolveAmbiguousMatch(matches: KeywordMatches): KeywordMatch | null {
  // If merchant is ambiguous, prioritize description
  if (matches.descriptionMatches.length > 0) {
    // Use description match (more specific)
    return matches.descriptionMatches[0];
  }
  
  // If no description match, check for merchant default category
  // Or use first merchant match as fallback
  return matches.merchantMatches[0];
}
```

### Step 4: Updated Matching Function

```typescript
export function matchTransactionToCategory(
  description: string,
  merchantName: string,
  keywords: Keyword[]
): KeywordMatch | null {
  const normalizedDescription = normalizeText(description);
  const normalizedMerchant = normalizeText(merchantName);

  // Collect ALL matches (not just first)
  const merchantMatches: KeywordMatch[] = [];
  const descriptionMatches: KeywordMatch[] = [];

  // Find all merchant matches
  for (const keywordData of keywords) {
    const keyword = normalizeText(keywordData.keyword);
    const regex = createWordBoundaryRegex(keyword);
    
    if (normalizedMerchant && regex.test(normalizedMerchant)) {
      merchantMatches.push({
        categoryId: keywordData.category_id,
        matchedKeyword: keywordData.keyword,
        matchType: 'merchant'
      });
    }
    
    if (normalizedDescription && regex.test(normalizedDescription)) {
      descriptionMatches.push({
        categoryId: keywordData.category_id,
        matchedKeyword: keywordData.keyword,
        matchType: 'description'
      });
    }
  }

  // No matches at all
  if (merchantMatches.length === 0 && descriptionMatches.length === 0) {
    return null;
  }

  // Only description matches (not ambiguous)
  if (merchantMatches.length === 0 && descriptionMatches.length > 0) {
    return descriptionMatches[0];
  }

  // Only merchant matches
  if (merchantMatches.length > 0 && descriptionMatches.length === 0) {
    // Check if ambiguous (multiple categories)
    const uniqueCategories = new Set(merchantMatches.map(m => m.categoryId));
    if (uniqueCategories.size === 1) {
      // Not ambiguous, single category
      return merchantMatches[0];
    }
    // Ambiguous but no description context
    // Could use merchant default category here, or first match
    return merchantMatches[0];
  }

  // Both merchant and description matches
  const uniqueMerchantCategories = new Set(merchantMatches.map(m => m.categoryId));
  
  // If merchant is ambiguous (multiple categories)
  if (uniqueMerchantCategories.size > 1) {
    // Prioritize description matches (more specific)
    if (descriptionMatches.length > 0) {
      return descriptionMatches[0];
    }
  }

  // If merchant matches one category and description matches same category
  if (uniqueMerchantCategories.size === 1) {
    const merchantCategory = merchantMatches[0].categoryId;
    const descriptionMatch = descriptionMatches.find(m => m.categoryId === merchantCategory);
    if (descriptionMatch) {
      // Both match same category, prefer description (more specific)
      return descriptionMatch;
    }
    // Description matches different category - prefer description
    return descriptionMatches[0];
  }

  // Default: prefer description (more specific)
  return descriptionMatches[0];
}
```

## Enhanced: Merchant Default Category

**If merchant has a default category:**
- When ambiguous and no description match, use merchant's default
- This provides a fallback for known merchants

```typescript
interface MatchOptions {
  merchantDefaultCategoryId?: number;
}

function resolveAmbiguousMatch(
  matches: KeywordMatches,
  options?: MatchOptions
): KeywordMatch | null {
  // If merchant is ambiguous, prioritize description
  if (matches.descriptionMatches.length > 0) {
    return matches.descriptionMatches[0];
  }
  
  // If no description match, check merchant default
  if (options?.merchantDefaultCategoryId) {
    const defaultMatch = matches.merchantMatches.find(
      m => m.categoryId === options.merchantDefaultCategoryId
    );
    if (defaultMatch) {
      return defaultMatch;
    }
  }
  
  // Fallback: first merchant match
  return matches.merchantMatches[0];
}
```

## Example Scenarios

### Scenario 1: Ambiguous Merchant, Description Disambiguates

**Transaction:**
- Merchant: "nationale-nederlanden"
- Description: "Insurance premium payment"

**Keywords:**
- Insurance category: `["insurance", "verzekering"]`
- Banking category: `["nationale-nederlanden", "banking"]`
- Insurance category: `["nationale-nederlanden"]` (also has this)

**Matching:**
1. Merchant matches: [Insurance, Banking] (ambiguous!)
2. Description matches: [Insurance] (has "insurance")
3. **Result:** Insurance category ✅ (description disambiguates)

### Scenario 2: Ambiguous Merchant, No Description Context

**Transaction:**
- Merchant: "nationale-nederlanden"
- Description: "Payment"

**Keywords:**
- Insurance category: `["nationale-nederlanden"]`
- Banking category: `["nationale-nederlanden"]`

**Matching:**
1. Merchant matches: [Insurance, Banking] (ambiguous!)
2. Description matches: [] (no context)
3. **Result:** Use merchant default category OR first match

### Scenario 3: Single Category Match (Not Ambiguous)

**Transaction:**
- Merchant: "albert heijn"
- Description: "Grocery shopping"

**Keywords:**
- Supermarket category: `["albert heijn", "ah"]`

**Matching:**
1. Merchant matches: [Supermarket] (single category, not ambiguous)
2. **Result:** Supermarket category ✅ (works as before)

### Scenario 4: Description More Specific

**Transaction:**
- Merchant: "nationale-nederlanden"
- Description: "Banking fee"

**Keywords:**
- Insurance category: `["nationale-nederlanden"]`
- Banking category: `["nationale-nederlanden", "banking", "bankkosten"]`

**Matching:**
1. Merchant matches: [Insurance, Banking] (ambiguous!)
2. Description matches: [Banking] (has "banking")
3. **Result:** Banking category ✅ (description is more specific)

## Benefits

1. **Automatic**: Works for any merchant without configuration
2. **Generic**: No need to manually mark merchants as "multi-category"
3. **Backward Compatible**: Single-category merchants work as before
4. **Context-Aware**: Uses description to disambiguate
5. **Fallback**: Can use merchant default category if available

## Edge Cases

### Case 1: Description Matches Multiple Categories

**Solution:** Use first match (or could use confidence/priority)

### Case 2: No Description Context

**Solution:** Use merchant default category OR first merchant match

### Case 3: Description Matches Different Category Than Merchant

**Solution:** Prefer description (more specific context)

## Implementation Steps

1. **Update `keywordMatcher.ts`:**
   - Change to collect all matches (not just first)
   - Add ambiguity detection
   - Add resolution logic

2. **Update `categorizationService.ts`:**
   - Pass merchant default category to matcher (if available)
   - Handle ambiguous matches

3. **Test with real data:**
   - Test with "nationale-nederlanden" and similar merchants
   - Verify description priority works
   - Ensure single-category merchants still work

4. **Optional: Add logging:**
   - Log when ambiguity is detected
   - Log which resolution was used
   - Helps identify merchants that need attention

## Migration Strategy

**Phase 1: Implement generic matching**
- Update keyword matcher
- Test with existing data
- Verify no regressions

**Phase 2: Clean up keywords (optional)**
- Remove merchant-only keywords from categories that should use description
- Add context keywords instead
- Example: Remove "nationale-nederlanden" from Insurance, add "insurance", "verzekering"

**Phase 3: Monitor and refine**
- Track ambiguous matches
- Identify merchants that need better keywords
- Let AI suggest better keywords

## Example: Keyword Cleanup

**Before (Ambiguous):**
```
Insurance category: ["nationale-nederlanden", "insurance"]
Banking category: ["nationale-nederlanden", "banking"]
```

**After (Context-Aware):**
```
Insurance category: ["insurance", "verzekering", "premium"]
Banking category: ["banking", "bank", "bankkosten", "fee"]
```

**Result:**
- Merchant "nationale-nederlanden" no longer matches directly
- Description keywords disambiguate
- Works for any merchant with "insurance" or "banking" in description

## Summary

**Generic Solution:**
- ✅ Automatically detects ambiguous merchants
- ✅ Uses description context to disambiguate
- ✅ Works for any merchant (no manual configuration)
- ✅ Backward compatible with existing keywords
- ✅ Can leverage merchant default category as fallback

**Key Insight:**
Instead of removing merchant keywords, we detect when they're ambiguous and use description context. This makes it work generically for any merchant that appears in multiple categories.

