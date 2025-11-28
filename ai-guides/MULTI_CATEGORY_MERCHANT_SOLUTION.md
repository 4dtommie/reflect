# Multi-Category Merchant Problem & Solutions

## The Problem

Some merchants (like "nationale-nederlanden") offer different products/services that should be categorized into different categories:

**Example: Nationale-Nederlanden**
- Insurance payments → "Insurance" category
- Banking fees → "Banking Fees" category  
- Investment products → "Investments" category
- Mortgage payments → "Housing" category

**Current Issue:**
- Keyword matching matches "nationale-nederlanden" to ONE category
- All transactions from this merchant get the same category
- No way to distinguish between different product types

## Current System

**Keyword Matching:**
- Matches merchant name or description to keywords
- First match wins
- No context awareness

**Merchant Table:**
- Has `default_category_id` field
- But only one default category per merchant

## Solution Options

### Option 1: Context-Aware Keyword Matching ⭐ Recommended

**How it works:**
- Use description keywords in addition to merchant name
- Match merchant + description context to category
- Example: "nationale-nederlanden" + "insurance" → Insurance category
- Example: "nationale-nederlanden" + "banking" → Banking Fees category

**Implementation:**
1. Create **compound keywords** (merchant + context)
2. Match both merchant AND description keywords
3. Priority: Description keywords > Merchant keywords

**Pros:**
- ✅ Works with existing keyword system
- ✅ No schema changes needed
- ✅ Leverages transaction descriptions
- ✅ AI can suggest context keywords

**Cons:**
- ⚠️ Requires more keywords (merchant + context combinations)
- ⚠️ Descriptions may vary

**Example Keywords:**
```
Category: Insurance
- "nationale-nederlanden insurance"
- "nn insurance"
- "nationale-nederlanden verzekering"

Category: Banking Fees
- "nationale-nederlanden banking"
- "nn bank"
- "nationale-nederlanden bankkosten"
```

---

### Option 2: Merchant-Product Mapping Table

**How it works:**
- Create `merchant_products` table
- Map merchant + product indicator → category
- Use description/amount patterns to identify product type

**Schema:**
```prisma
model merchant_products {
  id          Int      @id @default(autoincrement())
  merchant_id Int
  product_key String   // e.g., "insurance", "banking", "investment"
  category_id Int
  pattern     String?  // Optional regex pattern for description
  amount_min  Decimal? // Optional amount range
  amount_max  Decimal?
  
  merchants   merchants @relation(fields: [merchant_id], references: [id])
  categories  categories @relation(fields: [category_id], references: [id])
  
  @@unique([merchant_id, product_key])
  @@index([merchant_id])
}
```

**Matching Logic:**
1. Check if merchant has product mappings
2. Match description against product patterns
3. Check amount ranges if specified
4. Return matching category

**Pros:**
- ✅ Explicit merchant-product mappings
- ✅ Can use patterns and amount ranges
- ✅ Very precise control
- ✅ Easy to manage per merchant

**Cons:**
- ⚠️ Requires schema changes
- ⚠️ More complex matching logic
- ⚠️ Need to maintain product mappings
- ⚠️ May need UI for managing mappings

---

### Option 3: Enhanced Description Keyword Matching

**How it works:**
- Improve keyword matching to prioritize description keywords
- When merchant keyword matches, also check description for context
- Use description keywords to refine category selection

**Implementation:**
1. First match: Merchant keyword → get potential categories
2. Second match: Description keywords → refine to specific category
3. If description doesn't match, use merchant's default category

**Example:**
```
Transaction:
- Merchant: "nationale-nederlanden"
- Description: "Insurance premium payment"

Step 1: Merchant matches → [Insurance, Banking, Investments] (all have "nationale-nederlanden" keyword)
Step 2: Description matches "insurance" → Insurance category ✅
```

**Pros:**
- ✅ Works with existing system
- ✅ Uses description context
- ✅ No schema changes
- ✅ Simple to implement

**Cons:**
- ⚠️ Requires multiple keywords per category
- ⚠️ May need to remove merchant-only keywords

---

### Option 4: AI-Only for Multi-Category Merchants

**How it works:**
- Mark merchants as "multi-category"
- Skip keyword matching for these merchants
- Always use AI categorization (with context)

**Implementation:**
1. Add `is_multi_category` flag to merchants table
2. Skip keyword matching if `is_multi_category = true`
3. Use AI with full transaction context

**Pros:**
- ✅ AI understands context better
- ✅ No keyword management needed
- ✅ Handles edge cases automatically

**Cons:**
- ⚠️ Costs money (AI per transaction)
- ⚠️ Slower than keyword matching
- ⚠️ Less predictable

---

### Option 5: Hybrid Approach ⭐ Best Solution

**Combine multiple strategies:**

1. **Context-Aware Keywords** (primary)
   - Use compound keywords: "merchant + context"
   - Example: "nationale-nederlanden insurance"

2. **Description Priority** (fallback)
   - If merchant matches but description has context keywords, use description match
   - Example: Merchant "nationale-nederlanden" + Description "insurance" → Insurance

3. **AI for Ambiguous** (last resort)
   - If multiple categories match or no clear match, use AI
   - AI sees full context and can distinguish

4. **Merchant Product Mapping** (optional, for complex cases)
   - For very complex merchants, use explicit mappings
   - Can be added later if needed

**Matching Priority:**
```
1. Compound keyword match (merchant + description context)
2. Description keyword match (if merchant is multi-category)
3. Merchant keyword match (if no description context)
4. AI categorization (if ambiguous or no match)
```

---

## Recommended Implementation Plan

### Phase 1: Enhanced Keyword Matching (Quick Win)

**Update keyword matching to:**
1. Check description keywords FIRST (more specific)
2. Then check merchant keywords
3. If merchant matches but description has different category keyword, prefer description

**Code changes:**
- Update `keywordMatcher.ts` to prioritize description matches
- When merchant keyword matches, also check if description has category-specific keywords
- Return description match if found, otherwise merchant match

**Example:**
```typescript
// Current: Merchant match wins
// New: Description match wins if it's more specific

if (merchantMatch && descriptionMatch) {
  // If description match is for a different category, prefer description
  if (descriptionMatch.categoryId !== merchantMatch.categoryId) {
    return descriptionMatch; // More specific
  }
}
```

---

### Phase 2: Compound Keywords

**Add support for multi-word keywords:**
- "nationale-nederlanden insurance"
- "nn verzekering"
- "nationale-nederlanden bank"

**Implementation:**
- Keywords can contain spaces
- Match both merchant AND description for compound keywords
- Example: "nationale-nederlanden insurance" matches if:
  - Merchant contains "nationale-nederlanden" AND
  - Description contains "insurance"

---

### Phase 3: Merchant Product Mapping (If Needed)

**For very complex merchants:**
- Add `merchant_products` table
- Create UI to manage merchant-product mappings
- Use mappings when available, fallback to keywords

---

## Example: Nationale-Nederlanden Setup

### Option A: Compound Keywords

**Insurance Category:**
- Keywords: `["nationale-nederlanden insurance", "nn verzekering", "nationale-nederlanden verzekering"]`

**Banking Fees Category:**
- Keywords: `["nationale-nederlanden banking", "nn bank", "nationale-nederlanden bankkosten"]`

**Investments Category:**
- Keywords: `["nationale-nederlanden investment", "nn beleggen", "nationale-nederlanden beleggingen"]`

### Option B: Description Priority

**Insurance Category:**
- Keywords: `["insurance", "verzekering", "premium"]`
- Merchant: Remove "nationale-nederlanden" from keywords

**Banking Fees Category:**
- Keywords: `["banking", "bank", "bankkosten"]`

**Then:**
- Transaction with merchant "nationale-nederlanden" + description "insurance premium"
- Matches description keyword "insurance" → Insurance category ✅

---

## Questions to Consider

1. **How common is this problem?**
   - How many merchants have this issue?
   - Is it worth the complexity?

2. **Description quality:**
   - Do descriptions reliably contain product indicators?
   - Or are they too generic?

3. **User preference:**
   - Should users be able to set merchant-product mappings?
   - Or is automatic detection preferred?

4. **AI accuracy:**
   - Does AI already handle this well?
   - Or does it also struggle with multi-category merchants?

---

## Recommendation

**Start with Phase 1: Enhanced Keyword Matching**

1. ✅ Quick to implement
2. ✅ No schema changes
3. ✅ Works with existing system
4. ✅ Leverages description context
5. ✅ Can add Phase 2/3 later if needed

**Then evaluate:**
- Does it solve most cases?
- Do we need compound keywords?
- Do we need merchant-product mappings?

**For Nationale-Nederlanden specifically:**
- Remove "nationale-nederlanden" as a standalone keyword
- Add context keywords: "insurance", "verzekering", "banking", "bank", etc.
- Let description matching handle the categorization
- AI can also help for ambiguous cases

---

## Next Steps

1. **Discuss which approach you prefer**
2. **Identify all multi-category merchants** in your data
3. **Test with sample transactions** to see which solution works best
4. **Implement Phase 1** (enhanced keyword matching)
5. **Evaluate results** and decide if Phase 2/3 needed

