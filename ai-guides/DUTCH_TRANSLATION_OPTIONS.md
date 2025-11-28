# Dutch Translation Options for Categories

## Current Situation
- Categories currently have English `name` and `description` fields
- Some descriptions already include Dutch terms (e.g., "Belastingdienst, RVO")
- Keywords already include both English and Dutch terms

## Option 1: Separate Fields (Recommended) ⭐

### Schema Changes
```prisma
model categories {
  id               Int               @id @default(autoincrement())
  name             String            @unique
  name_nl          String?           // Dutch name
  description      String?
  description_nl   String?           // Dutch description
  // ... other fields
}
```

### Pros
- ✅ Clean separation of languages
- ✅ Easy to query by language
- ✅ Can support more languages later (name_de, name_fr, etc.)
- ✅ UI can easily switch between languages
- ✅ AI prompt can use appropriate language based on transaction language

### Cons
- ❌ Requires migration
- ❌ Need to update seed file with Dutch translations
- ❌ More fields to maintain

### Usage Example
```typescript
// In seed file
await createCategoryWithKeywords(
  {
    name: 'Supermarket',
    name_nl: 'Supermarkt',
    description: 'Large grocery stores, supermarkets, convenience stores',
    description_nl: 'Grote supermarkten, buurtwinkels, online boodschappen',
    // ...
  },
  keywords
);

// In AI prompt (use description_nl if transaction is in Dutch)
const description = transactionLanguage === 'nl' 
  ? category.description_nl || category.description
  : category.description;
```

---

## Option 2: JSON Field (Flexible)

### Schema Changes
```prisma
model categories {
  id               Int               @id @default(autoincrement())
  name             String            @unique
  name_translations Json?           // { "en": "Supermarket", "nl": "Supermarkt" }
  description      String?
  description_translations Json?   // { "en": "...", "nl": "..." }
  // ... other fields
}
```

### Pros
- ✅ Very flexible - can add more languages easily
- ✅ Single field for all translations
- ✅ Can store metadata per language

### Cons
- ❌ Less type-safe (JSON)
- ❌ Harder to query
- ❌ Requires JSON parsing
- ❌ More complex to maintain

---

## Option 3: Keep in Description (Simplest)

### No Schema Changes
Keep Dutch terms in the existing `description` field:

```typescript
description: 'Large grocery stores, supermarkets (Nederlands: supermarkten, buurtwinkels)'
```

### Pros
- ✅ No migration needed
- ✅ Quick to implement
- ✅ Works immediately

### Cons
- ❌ Mixed languages in one field
- ❌ Harder to extract/use separately
- ❌ Not clean for UI display
- ❌ AI might get confused by mixed languages

---

## Option 4: Hybrid Approach

### Schema Changes
```prisma
model categories {
  id               Int               @id @default(autoincrement())
  name             String            @unique
  name_nl          String?           // Dutch name (optional)
  description      String?
  description_nl   String?           // Dutch description (optional)
  // ... other fields
}
```

### Strategy
- Add `name_nl` and `description_nl` fields
- Make them optional (nullable)
- Start with most common categories
- Gradually add translations
- Fallback to English if Dutch not available

### Pros
- ✅ Flexible - can add translations incrementally
- ✅ Backward compatible
- ✅ Clean separation
- ✅ Can prioritize which categories need translations first

### Cons
- ❌ Need to handle null checks
- ❌ Need migration

---

## Recommendation: Option 1 or 4

**For immediate implementation**: Option 4 (Hybrid with optional fields)
- Add `name_nl` and `description_nl` as optional fields
- Start with high-priority categories (most used tier)
- Update AI prompt to use Dutch description when available and transaction appears to be Dutch

**For long-term**: Option 1 (Separate fields, required)
- Once all categories have translations, make fields required
- Better data integrity

---

## Implementation Steps (Option 4)

1. **Add fields to schema**:
```prisma
name_nl          String?
description_nl   String?
```

2. **Create migration**:
```bash
npx prisma migrate dev --name add_dutch_translations
```

3. **Update seed file** - Add Dutch translations for key categories:
```typescript
await createCategoryWithKeywords(
  {
    name: 'Supermarket',
    name_nl: 'Supermarkt',
    description: 'Large grocery stores, supermarkets, convenience stores',
    description_nl: 'Grote supermarkten, buurtwinkels, online boodschappen',
    // ...
  },
  keywords
);
```

4. **Update AI prompt** - Use appropriate language:
```typescript
// In aiCategorizer.ts
const categoryDescription = detectLanguage(transaction) === 'nl' && category.description_nl
  ? category.description_nl
  : category.description;
```

5. **Update UI** - Show appropriate language based on user preference

---

## Priority Categories for Translation

Start with **Most Used** tier categories:
1. Salary → Salaris
2. Supermarket → Supermarkt
3. Coffee → Koffie
4. Energy/Water → Energie/Water
5. TV/Internet/Phone → TV/Internet/Telefoon
6. Public Transit → Openbaar Vervoer
7. Fuel → Brandstof
8. Entertainment → Entertainment (same)

Then **Medium Used**:
- Eating Out → Uit Eten
- Ordering Food → Bestellen
- Lunch → Lunch
- Clothing → Kleding
- Healthcare → Gezondheidszorg
- Insurance → Verzekering
- Housing → Woning
- Parking → Parkeren

