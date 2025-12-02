# Plan: Merchant Duplicate Detection & Merging

## Overzicht
Systeem voor het detecteren en mergen van merchants met vergelijkbare namen om data consistentie te verbeteren.

## 1. Merchant Name Normalisatie

### Normalisatie stappen
Voordat we namen vergelijken, moeten we ze normaliseren:
- **Lowercase**: Alle tekens naar kleine letters
- **Trim whitespace**: Spaties aan begin/einde verwijderen
- **Speciale karakters verwijderen**: Punten, komma's, apostrofs, etc.
- **Meerdere spaties**: Vervangen door enkele spatie
- **Accenten normaliseren**: é → e, ë → e, etc.
- **Afkortingen uitbreiden** (optioneel): B.V. → BV, N.V. → NV, etc.

### Voorbeelden
- "Albert Heijn B.V." → "albert heijn bv"
- "ALBERT HEIJN  " → "albert heijn"
- "Jumbo Supermarkt" → "jumbo supermarkt"

## 2. Similarity Matching Methodes

### Methode 1: String Similarity (Levenshtein/Jaro-Winkler)
**Voordelen:**
- Eenvoudig te implementeren
- Snel voor kleine datasets
- Goed voor typo's en kleine verschillen

**Nadelen:**
- Kan false positives geven
- Minder goed met volgorde verschillen

**Gebruik:** Primaire detectie laag

### Methode 2: Token-based Matching
**Voordelen:**
- Goed met woordvolgorde verschillen
- Beter met extra/weggelaten woorden

**Nadelen:**
- Complexer algoritme

**Gebruik:** Secundaire verificatie

### Methode 3: Fuzzy Matching (Met threshold)
**Voorbeeld libraries:**
- `fuse.js` voor client-side
- `fuzzywuzzy` equivalent voor Node.js
- PostgreSQL `pg_trgm` extensie (trigram similarity)

**Thresholds:**
- **Hoge similarity (>90%)**: Automatisch voorstellen om te mergen
- **Medium similarity (70-90%)**: Voorstellen met waarschuwing
- **Lage similarity (<70%)**: Niet tonen (te veel false positives)

## 3. Database Structuur

### Nieuwe velden (optioneel)
Geen schema wijzigingen nodig, maar overweeg:
- `normalized_name` field in merchants tabel (geïndexeerd voor snellere queries)
- `merge_history` tabel voor audit trail (welke merchants zijn gemerged)

### Indexen
- Index op `normalized_name` voor snellere similarity queries
- Bestaande indexen blijven behouden

## 4. API Endpoints

### 4.1. Detect Duplicates
**Endpoint:** `GET /api/merchants/duplicates`

**Query parameters:**
- `threshold` (optioneel, default: 0.75): Similarity threshold (0-1)
- `limit` (optioneel, default: 50): Max aantal resultaten
- `min_transactions` (optioneel, default: 0): Filter merchants met minimaal X transacties

**Response:**
```typescript
{
  duplicates: Array<{
    groupId: string; // Unique ID voor deze duplicate groep
    merchants: Array<{
      id: number;
      name: string;
      transaction_count: number;
      ibans: string[];
      default_category_id: number | null;
      similarity_score: number; // 0-1
    }>;
    suggestedMergeTo: number; // ID van merchant om naar te mergen
    confidence: 'high' | 'medium' | 'low';
  }>;
}
```

**Algoritme:**
1. Haal alle actieve merchants op
2. Normaliseer namen
3. Bereken pairwise similarity scores
4. Groepeer merchants met similarity > threshold
5. Sorteer op similarity (hoogste eerst)
6. Bepaal "beste" merchant om naar te mergen (meeste transacties, of meest complete data)

### 4.2. Preview Merge
**Endpoint:** `GET /api/merchants/merge-preview/:sourceId/:targetId`

**Response:**
```typescript
{
  source: Merchant; // Merchant die gemerged wordt
  target: Merchant; // Merchant waar naartoe gemerged wordt
  preview: {
    mergedName: string; // Voorgestelde naam (meestal target.name)
    mergedIbans: string[]; // Gecombineerde IBANs (uniques)
    mergedKeywords: string[]; // Gecombineerde keywords (uniques)
    defaultCategoryId: number | null; // Target heeft prioriteit, anders source
    transactionCount: number; // Totaal aantal transacties
    affectedTransactions: number; // Aantal transacties die merchant_id krijgen
  };
  warnings: string[]; // Bijv. "Source heeft category, target niet"
}
```

### 4.3. Execute Merge
**Endpoint:** `POST /api/merchants/merge`

**Body:**
```typescript
{
  sourceId: number; // Merchant die gemerged wordt (wordt verwijderd/inactive)
  targetId: number; // Merchant waar naartoe gemerged wordt
  mergeOptions: {
    keepName: 'target' | 'source' | 'custom'; // Welke naam behouden
    customName?: string; // Als keepName === 'custom'
    mergeIbans: boolean; // true = combineer IBANs
    mergeKeywords: boolean; // true = combineer keywords
    keepCategory: 'target' | 'source'; // Welke default category behouden
  };
}
```

**Response:**
```typescript
{
  success: boolean;
  mergedMerchant: Merchant;
  affectedTransactions: number;
  deletedMerchantId: number;
}
```

**Proces:**
1. Valideer beide merchants bestaan en zijn actief
2. Valideer merge options
3. **Transaction start:**
   - Update alle transactions met `merchant_id = sourceId` naar `merchant_id = targetId`
   - Combineer IBANs (uniques alleen)
   - Combineer keywords (uniques alleen)
   - Update target merchant met merged data
   - Deactiveer source merchant (`is_active = false`) OF verwijder (zorg dat transactions blijven werken)
4. **Transaction commit**
5. Return resultaat

**⚠️ Belangrijk:** Gebruik database transaction om data consistency te garanderen!

## 5. UI Componenten

### 5.1. Duplicate Detection Pagina
**Route:** `/merchants/duplicates` (nieuwe pagina of tab in merchant management)

**Features:**
- **Search/Scan knop**: Start duplicate detection scan
- **Filter opties:**
  - Similarity threshold slider (0.5 - 1.0)
  - Minimaal aantal transacties filter
  - Groepen sorteren op similarity / aantal merchants
- **Resultaten lijst:**
  - Groepen met duplicate merchants
  - Similarity score per groep
  - Confidence indicator (kleur: groen=high, oranje=medium)
  - Per merchant: naam, aantal transacties, IBANs
  - "Preview merge" knop per groep

### 5.2. Merge Preview Modal
**Toont:**
- Source en target merchant details (side-by-side)
- Preview van gemergde data:
  - Naam (editeerbaar)
  - Gecombineerde IBANs (checkboxes om te selecteren)
  - Gecombineerde keywords (checkboxes om te selecteren)
  - Default category (dropdown)
- Waarschuwingen (bijv. "Source heeft 5 transacties, target heeft 3")
- "Merge" knop (met bevestiging)

### 5.3. Merge Bevestiging
**Confirmation dialog:**
- Duidelijke waarschuwing: "Deze actie kan niet ongedaan gemaakt worden"
- Overzicht van wat er gebeurt:
  - X transacties worden gekoppeld aan nieuwe merchant
  - Merchant "SourceName" wordt verwijderd/gedeactiveerd
- "Bevestig" knop (rood/warning kleur)

### 5.4. Success Feedback
Na succesvol merge:
- Success message met details
- Optioneel: refresh merchant list
- Optioneel: toon gemergde merchant in merchant list

## 6. Implementatie Details

### 6.1. Server-side Utility Functions

#### `normalizeMerchantName(name: string): string`
```typescript
// Normaliseert merchant naam voor vergelijking
// - lowercase
// - trim
// - verwijder speciale karakters
// - normaliseer accenten
// - expandeer afkortingen (optioneel)
```

#### `calculateSimilarity(name1: string, name2: string): number`
```typescript
// Bereken similarity score (0-1)
// Gebruik Levenshtein of Jaro-Winkler distance
// Of combineer meerdere methodes
```

#### `findDuplicateGroups(merchants: Merchant[], threshold: number): DuplicateGroup[]`
```typescript
// Vind groepen van duplicate merchants
// - Bereken pairwise similarities
// - Groepeer merchants met similarity > threshold
// - Sorteer op similarity
```

### 6.2. Dependencies
Overweeg toe te voegen:
- `fuse.js` voor fuzzy matching (client-side)
- `string-similarity` of `fast-levenshtein` voor similarity berekening
- Of gebruik PostgreSQL `pg_trgm` extensie voor database-level matching (sneller voor grote datasets)

### 6.3. Performance Overwegingen

**Probleem:** Pairwise comparison is O(n²)
- 100 merchants = 4.950 vergelijkingen
- 1000 merchants = 499.500 vergelijkingen

**Oplossingen:**
1. **Client-side processing**: Laat browser het werk doen (alleen voor kleine datasets)
2. **Background job**: Voer detectie uit als background task, sla resultaten op
3. **Incremental matching**: Vergelijk alleen nieuwe merchants met bestaande
4. **Database indexing**: Gebruik `pg_trgm` voor snellere similarity queries in database
5. **Pagination**: Toon resultaten in batches

**Aanbeveling:** Start met client-side voor MVP, upgrade naar background job als dataset groeit.

## 7. Edge Cases & Validatie

### Validatie regels
- ❌ Source en target mogen niet hetzelfde zijn
- ❌ Beide merchants moeten bestaan
- ❌ Beide merchants moeten actief zijn (of specifieke merge logica voor inactive)
- ✅ Check of custom naam uniek is (als `keepName === 'custom'`)

### Edge cases
- **Lege namen**: Skip in normalisatie
- **Alleen speciale karakters**: Behandel als leeg
- **Merchant met 0 transacties**: Mag gemerged worden, maar waarschuwen
- **IBAN conflicts**: Als beide merchants dezelfde IBAN hebben, skip in merge
- **Category conflicts**: Target heeft prioriteit, maar waarschuwen als source category anders is

## 8. Test Cases

### Unit tests
- `normalizeMerchantName()` met verschillende inputs
- `calculateSimilarity()` met bekende paren
- `findDuplicateGroups()` met mock data

### Integration tests
- Merge API endpoint met mock merchants
- Database transaction rollback bij errors
- IBAN en keyword merging logica

### Manual test scenarios
1. Merge twee merchants met identieke namen (typo verschil)
2. Merge merchants waar één veel transacties heeft
3. Merge merchants met overlappende IBANs
4. Merge merchants met verschillende categories
5. Probeer te mergen met inactive merchant

## 9. Toekomstige Uitbreidingen

### Opties voor later
- **Automatische merge suggesties**: Bij merchant creation, check direct op duplicates
- **Batch merge**: Merge meerdere merchants in één actie
- **Merge history**: Audit log van alle merges
- **Undo merge**: Complex, maar mogelijk met merge history
- **AI-powered similarity**: Gebruik embeddings voor semantic similarity (zoals bij categories)
- **Merchant aliases**: Alternatieve namen voor merchants (bijv. "AH" → "Albert Heijn")

## 10. Implementatie Volgorde

### Fase 1: Basic Detection (MVP)
1. ✅ Normalisatie functie
2. ✅ Basic similarity berekening (Levenshtein)
3. ✅ API endpoint voor duplicate detection
4. ✅ UI pagina met lijst van duplicates
5. ✅ Preview merge modal

### Fase 2: Merge Functionaliteit
6. ✅ Preview merge API endpoint
7. ✅ Execute merge API endpoint
8. ✅ Merge UI flow (preview → confirm → execute)
9. ✅ Error handling en validatie
10. ✅ Success feedback

### Fase 3: Verbeteringen
11. ⬜ Performance optimalisatie (background job / database indexes)
12. ⬜ Advanced similarity (token-based, fuzzy matching)
13. ⬜ Merge history / audit trail
14. ⬜ Auto-suggest bij merchant creation

## 11. Aandachtspunten

⚠️ **Data integriteit**: Gebruik altijd database transactions
⚠️ **Irreversible actie**: Mergen kan niet ongedaan, zorg voor goede confirmatie
⚠️ **Performance**: Voor grote datasets, gebruik background processing
⚠️ **False positives**: Similarity threshold moet goed getuned worden
⚠️ **User experience**: Duidelijke feedback en waarschuwingen







