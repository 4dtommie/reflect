# Category Restructure - Review & Recommendations

## Proposed Changes Summary

### 1. ✅ Create "Hobbies & Leisure" Parent Category
- **Move**: Entertainment (currently standalone) → subcategory
- **Add**: Sports (new subcategory)
- **Add**: Books/Magazines (new subcategory)

### 2. ✅ Remove "Software & Tools" Category
- Currently has keywords: software, saas, license, adobe, microsoft, etc.
- **Question**: Where should these transactions go? Options:
  - Entertainment (if gaming/streaming related)
  - Education (if educational software)
  - Just remove and let users categorize manually

### 3. ✅ Remove Income Categories
- Remove: Freelance/Contract
- Remove: Investment Returns  
- Remove: Refund (will use expense categories instead)

### 4. ✅ Refunds Use Expense Categories
- **Smart approach!** A refund for clothing → Clothing category
- **Implementation needed**: Logic to handle refunds differently
- **Consideration**: How to identify refunds? Options:
  - Negative amounts (is_debit = false but amount is negative?)
  - Transaction type = "Refund"
  - Merchant name/description contains "refund", "return", etc.
  - Or: User manually categorizes refunds to expense categories

### 5. ✅ Split "Bills & Utilities"
- **New**: Energy/Water (electricity, gas, water)
- **New**: TV/Internet/Phone (internet, phone, TV subscriptions)
- **Question**: What about other utilities?
  - Trash collection
  - Sewer
  - Other municipal services
  - **Suggestion**: Keep these in Energy/Water or create "Other Utilities"?

### 6. ✅ "Other" Category Structure
- **Uncategorized**: System category, auto-assigned when AI can't categorize
- **Other**: User-selectable catch-all
- **Current**: "Uncategorized" exists, "Other Income" exists
- **Need**: "Other" expense category (separate from Uncategorized)

## 📋 Detailed Recommendations

### 1. Hobbies & Leisure Structure
```
Hobbies & Leisure (parent)
  ├── Entertainment (moved from standalone)
  ├── Sports (new - gym, fitness, sports equipment, sports events)
  └── Books/Magazines (new - books, magazines, e-books, audiobooks)
```

**Sports Category Keywords:**
- gym, fitness, sportschool, sports, workout, personal trainer, yoga, pilates
- sports equipment, sporting goods, sports events, tickets

**Books/Magazines Category Keywords:**
- book, books, boek, boeken, magazine, e-book, ebook, audiobook, kindle, kobo
- bookstore, bookshop, boekenwinkel, library, bibliotheek

### 2. Software & Tools Removal
**Recommendation**: 
- **Option A**: Remove entirely, let users create custom categories if needed
- **Option B**: Merge into Entertainment (for gaming/streaming software) or Education (for educational software)
- **My suggestion**: Remove entirely - too niche, users can create custom categories

### 3. Income Categories
**Current income categories after removal:**
- Salary
- Tax Returns & Subsidies
- Other Income

**Recommendation**: Keep "Other Income" as catch-all for miscellaneous income

### 4. Refunds Implementation
**Current transaction structure:**
- `is_debit`: boolean (true = expense, false = income)
- `type`: TransactionType enum (Payment, Transfer, DirectDebit, Deposit, Withdrawal, Refund, Fee, Interest, Other)
- `amount`: Decimal (always positive)

**Refund handling strategy:**
1. **Option A**: When `type = "Refund"`, allow categorization to expense categories (override income-only rule)
2. **Option B**: When transaction description/merchant contains refund keywords, suggest expense categories
3. **Option C**: User manually categorizes refunds (simplest, but less automatic)

**Recommendation**: 
- Update AI prompt: "For refunds (type = Refund), categorize to the corresponding expense category (e.g., clothing refund → Clothing)"
- Update categorization logic to allow refunds to use expense categories
- Add instruction: "Refunds should be categorized to the expense category they relate to"

### 5. Bills & Utilities Split
**Energy/Water:**
- electricity, gas, water, energie, energiebedrijf, waterbedrijf
- Examples: Eneco, Essent, Vattenfall, Vitens, PWN

**TV/Internet/Phone:**
- internet, phone, tv, television, cable, ziggo, kpn, t-mobile, vodafone
- streaming services? (Netflix, etc.) → NO, keep in Entertainment

**Question**: What about:
- Trash collection (afvalstoffenheffing)
- Sewer (rioolheffing)
- Municipal taxes (gemeentelijke belastingen)

**Recommendation**: 
- Add to Energy/Water OR create "Municipal Services" subcategory
- Or: Keep in Energy/Water with description: "Energy, water, and municipal utilities"

### 6. Other Category Structure
**Current:**
- "Uncategorized" (system, group: other)
- "Other Income" (income group)

**After changes:**
- "Uncategorized" (system, group: other) - auto-assigned when AI can't categorize
- "Other" (user-selectable, group: other) - user chooses this for miscellaneous expenses
- "Other Income" (income group) - for miscellaneous income

**Recommendation**: 
- Keep "Uncategorized" as system category (not user-selectable in UI)
- Create "Other" as user-selectable expense category
- Both in "other" group

## ⚠️ Important Considerations

### 1. Existing Transactions
- **Migration needed**: Transactions using removed categories need to be handled
- **Options**:
  - Set to "Uncategorized" (safest)
  - Set to "Other" (if user-selectable)
  - Manual review required

### 2. Keywords Migration
- Software & Tools keywords: Where do they go?
- Refund keywords: Remove from income, add to expense categories?

### 3. AI Prompt Updates
- Update instructions for refunds
- Update category list (remove deleted, add new)
- Update exclusions/examples

### 4. User Custom Categories
- Users may have created custom categories
- Need to preserve these
- Only modify default categories

## 🎯 Implementation Plan

1. **Create new categories** (Hobbies & Leisure parent + subcategories, Energy/Water, TV/Internet/Phone, Sports, Books/Magazines, Other expense)
2. **Move Entertainment** to Hobbies & Leisure subcategory
3. **Remove categories** (Software & Tools, Freelance/Contract, Investment Returns, Refund income)
4. **Update seed file** with new structure
5. **Update AI prompt** to handle refunds differently
6. **Update categorization logic** to allow refunds in expense categories
7. **Handle existing transactions** (migration strategy)
8. **Update UI** to show new structure

## ❓ Questions for You

1. **Software & Tools**: Remove entirely or merge somewhere?
2. **Refunds**: Automatic detection or manual categorization?
3. **Municipal utilities**: Energy/Water or separate category?
4. **Existing transactions**: Set to Uncategorized or Other?
5. **Sports**: Should this include gym memberships? (currently in Healthcare)
6. **Books/Magazines**: Should educational books go here or Education category?

