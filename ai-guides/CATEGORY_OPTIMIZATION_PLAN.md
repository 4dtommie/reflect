# Category Optimization Plan

## ✅ Completed Changes

### 1. Simplified Prompt - Only Show Subcategories
- **Changed**: Prompt now only shows subcategories and standalone categories
- **Removed**: Parent categories (like "Food & Groceries", "Restaurants & Dining") are hidden
- **Benefit**: Cleaner, simpler prompt with only actionable categories
- **Impact**: Reduced token usage, clearer instructions for AI

### 2. Updated Instructions
- Removed confusing "organizational" category language
- Simplified to: "All categories shown are usable - choose the most specific match"

### 3. Keyword Matching Optimization
- **Changed**: Keywords now extracted from merchant name only (not description)
- **Changed**: Reduced to 1-2 keywords maximum
- **Benefit**: More focused, relevant keywords
- **Impact**: Better keyword matching accuracy

### 4. IBAN Matching
- **Added**: IBAN matching for transactions with counterparty IBAN
- **Added**: Merchants can store multiple IBANs
- **Added**: IBAN matching takes priority over keyword matching
- **Benefit**: More accurate merchant matching for bank transfers
- **UI**: Added IBAN column with checkmark in debug results

### 5. AI-Generated Cleaned Merchant Names
- **Added**: AI generates cleaned merchant names from raw merchant name/description
- **Added**: Debug UI shows cleaned name with hover tooltip for raw name
- **Benefit**: Better merchant name normalization
- **UI**: Added Merchant column in debug results

### 6. Category Restructure
- **Added**: "Hobbies & Leisure" parent category with Entertainment, Sports, Books/Magazines
- **Removed**: Software & Tools category
- **Removed**: Freelance/Contract, Investment Returns, Refund income categories
- **Changed**: Refunds now use expense categories (e.g., clothing refund → Clothing)
- **Split**: Bills & Utilities → Energy/Water and TV/Internet/Phone
- **Changed**: Other category structure (Uncategorized for system, Other for user-selectable)
- **Updated**: Category descriptions with exclusions (NOT: ...)

### 7. Category Tiers in Database
- **Added**: `tier` field to categories table ('most' | 'medium' | 'less')
- **Changed**: Tiers now stored in database instead of hardcoded
- **Benefit**: Easy to adjust tiers without code changes
- **Impact**: Categories ordered by tier in AI prompt (Most used → Medium used → Less used)

### 8. System Prompt Testing Infrastructure
- **Added**: System prompt templates in config
- **Added**: System prompt selector in test-ai-categorize page
- **Added**: Configurable via `OPENAI_SYSTEM_PROMPT` environment variable
- **Benefit**: Can test different prompt styles to find optimal one

## 📋 Recommended Improvements

### 1. Enhance Category Descriptions
Current descriptions are good but could be more AI-friendly:

**Best Practices for AI-Friendly Descriptions:**
- Include common merchant names/examples
- Mention transaction types that match
- Use clear, specific language
- Include both English and Dutch terms when relevant

**Example Improvements:**

```typescript
// Current:
description: 'Coffee shops and cafes'

// Better:
description: 'Coffee shops, cafes, espresso bars. Examples: Starbucks, Douwe Egberts, local cafes. Typically morning purchases (06:00-11:00).'
```

### 2. Schema Enhancements (Optional)

**Option A: Add `examples` and `exclusions` fields**
```prisma
model categories {
  // ... existing fields
  examples String[] // Array of example merchant names or transaction types
  exclusions String[] // Things that should NOT match this category (negative examples)
}
```

**Option B: Add `aliases` field**
```prisma
model categories {
  // ... existing fields
  aliases String[] // Alternative names for the category
}
```

**Option C: Enhance `description` field**
- Keep current schema
- Just improve descriptions in seed file
- Add examples and exclusions directly in description text
- Format: "Description. Examples: X, Y, Z. NOT: A, B, C (use Category X instead)"

### 3. Category Management

**Current State:**
- ✅ Schema supports custom categories (`created_by` field)
- ✅ API supports creating categories
- ✅ UI exists for viewing/managing categories
- ⚠️ Users can create categories but descriptions might not be AI-optimized

**Recommendations:**
1. Add description field to category creation form
2. Add validation/guidance for writing AI-friendly descriptions
3. Allow editing category descriptions
4. Show category usage stats (how many transactions use it)

### 4. Other Optimization Ideas

#### A. Category Grouping in Prompt
- ✅ Already grouped by type (income, essential, lifestyle, financial)
- Consider: Sort by frequency of use (most common first)

#### B. Category Examples and Exclusions in Prompt
- Add 2-3 example merchant names per category in the prompt
- Add 1-2 exclusion examples per category (what NOT to match)
- Helps AI understand what matches AND what doesn't
- Reduces false positives (e.g., "Coffee" should NOT match coffee beans from supermarket)

#### C. Category Confidence Thresholds
- Some categories might need higher confidence (e.g., "Insurance" vs "Coffee")
- Could add `min_confidence` field to categories

#### D. Category Exclusions
- Already exclude "Transfers Between Own Accounts"
- Could add `exclude_from_ai` boolean field for categories that should never be AI-categorized

#### E. Category Priority/Weighting
- Some categories are more specific and should be preferred
- Could add `priority` field (higher = more specific, prefer this)

#### F. Category Relationships
- Some categories are mutually exclusive (e.g., Income vs Expense)
- Already handled by `group` field, but could be more explicit

## 🎯 Immediate Action Items

1. **Update seed file descriptions** - Make them more AI-friendly with examples AND exclusions
2. **Test prompt changes** - Verify AI categorization improves with simplified prompt
3. **Add exclusion examples** - Include 1-2 things that should NOT match each category
4. **Review category structure** - Are there categories that should be merged/split?

## 💡 Exclusion Examples Strategy

### Why Exclusions Help
- Prevents false positives (e.g., "Coffee" matching coffee beans from supermarket)
- Clarifies category boundaries
- Helps AI distinguish between similar categories
- Reduces need for manual corrections

### Example Exclusions by Category:

**Coffee:**
- NOT: Coffee beans from supermarket (use Supermarket)
- NOT: Coffee machines/equipment (use Electronics or Home Goods)

**Supermarket:**
- NOT: Coffee shops (use Coffee)
- NOT: Restaurants (use Eating Out)

**Insurance:**
- NOT: Insurance products sold at supermarkets (use Supermarket)
- NOT: Insurance-related software subscriptions (use Software & Tools)

**Entertainment:**
- NOT: Educational courses (use Education)
- NOT: Fitness apps (use Healthcare)

**Healthcare:**
- NOT: Fitness equipment (use Home Goods or Shopping)
- NOT: Health food stores (use Specialty Food Stores)

### Implementation Options:

**Option 1: Add to Description (Simplest)**
```typescript
description: 'Coffee shops, cafes, espresso bars. Examples: Starbucks, Douwe Egberts. NOT: coffee beans from supermarket (use Supermarket), coffee machines (use Electronics).'
```

**Option 2: Separate Field (More Structured)**
```prisma
model categories {
  // ... existing fields
  exclusions String[] // ["coffee beans from supermarket", "coffee machines"]
}
```

**Option 3: Hybrid Approach**
- Keep exclusions in description for now
- Add separate field later if needed
- Format: "Description. Examples: X, Y. NOT: A (use Category B), C (use Category D)."

## 📊 Testing Recommendations

1. Run categorization on a test set
2. Compare results before/after prompt changes
3. Identify categories with low accuracy
4. Improve descriptions for problematic categories
5. Test exclusion examples - verify they prevent false positives
6. **Test different system prompts** - Experiment with different system prompt styles to find what works best

## 🧪 System Prompt Testing

### Current System Prompt:
```
"You are a financial transaction categorizer. Always respond with valid JSON only. Return a JSON object with a "results" array."
```

### Alternative System Prompts to Test:

**1. Focused (Expert Emphasis):**
```
"You are an expert at categorizing financial transactions. Your task is to match transactions to the most appropriate category. Always respond with valid JSON only. Return a JSON object with a "results" array."
```

**2. Detailed (More Context):**
```
"You are a financial transaction categorizer with expertise in personal finance. Analyze each transaction carefully and match it to the most specific and appropriate category. Pay attention to merchant names, descriptions, amounts, and transaction types. Always respond with valid JSON only. Return a JSON object with a "results" array."
```

**3. Concise (Minimal Instructions):**
```
"Categorize financial transactions. Match each transaction to the most appropriate category ID. Return JSON with "results" array only."
```

**4. Analytical (Financial Analyst Approach):**
```
"You are a financial analyst categorizing transactions. Use merchant names, descriptions, amounts, and transaction context to determine the correct category. Be precise and consistent. Always respond with valid JSON only. Return a JSON object with a "results" array."
```

### Implementation:
- ✅ Added system prompt templates to config
- ✅ Made system prompt configurable via options
- ✅ Added system prompt selector to test-ai-categorize page
- ✅ Can be set via `OPENAI_SYSTEM_PROMPT` environment variable

### Testing Strategy:
1. Test each system prompt with the same batch of transactions
2. Compare accuracy, consistency, and confidence scores
3. Identify which prompt style works best for your transaction types
4. Consider A/B testing in production

## 🔧 Implementation Example

### Format for Descriptions with Exclusions:

```typescript
description: 'Coffee shops, cafes, espresso bars. Examples: Starbucks, Douwe Egberts, local cafes. NOT: coffee beans from supermarket (use Supermarket), coffee machines (use Electronics).'
```

### In the Prompt, it will appear as:
```
  45. Coffee - Coffee shops, cafes, espresso bars. Examples: Starbucks, Douwe Egberts, local cafes. NOT: coffee beans from supermarket (use Supermarket), coffee machines (use Electronics).
```

### Alternative Format (More Structured):
```typescript
description: 'Coffee shops, cafes, espresso bars. Examples: Starbucks, Douwe Egberts. Exclusions: coffee beans from supermarket → Supermarket, coffee machines → Electronics.'
```

The AI will see these exclusions and avoid matching them to the wrong category.

