# CSV File Upload Implementation Plan

## Current Status

✅ **Completed:**
- Basic upload page UI with drag & drop (`src/routes/(protected)/upload-transactions/+page.svelte`)
- File selection and validation (CSV only)
- Database schema ready (Transaction model with TransactionType enum)

❌ **Missing:**
- CSV parsing utilities
- Data transformation/mapping logic
- API endpoint for transaction import
- Upload functionality in UI
- Preview and validation UI components
- Error handling and user feedback

---

## Implementation Steps

### Step 1: CSV Parser Utility ⭐ START HERE

**File:** `src/lib/utils/csvParser.ts`

**Purpose:** Parse CSV files in the browser, detect delimiter, handle quoted fields

**Features:**
- Auto-detect delimiter (comma, semicolon, tab)
- Handle quoted fields with escaped quotes
- Support different line endings (CRLF, LF)
- Return structured data: headers, rows, errors

**Functions:**
```typescript
parseCSVFile(file: File): Promise<ParseResult>
detectDelimiter(firstLine: string): string
parseCSVLine(line: string, delimiter: string): string[]
```

**Return Type:**
```typescript
interface ParseResult {
  headers: string[];
  rows: string[][];
  errors: Array<{ row: number; message: string }>;
  warnings: Array<{ row: number; message: string }>;
}
```

---

### Step 2: Column Mapping & Header Normalization

**File:** `src/lib/utils/transactionMapper.ts`

**Purpose:** Map CSV columns to transaction fields, normalize headers, transform data

**Features:**
- Auto-detect column mappings from header names
- Normalize headers (trim, lowercase, remove special chars)
- Map common variations (date, merchant, amount, etc.)
- Handle multilingual headers (Dutch/English)

**Functions:**
```typescript
detectColumnMapping(headers: string[]): ColumnMapping
mapCSVRowToTransaction(row: string[], headers: string[], mapping: ColumnMapping): TransactionInput
normalizeHeader(header: string): string
```

**Header Mappings:**
- Date: `date`, `transaction_date`, `datum`, `transactiedatum`, `transaction date`
- Merchant: `merchant`, `merchant_name`, `merchantName`, `bedrijf`, `bedrijfsnaam`
- Amount: `amount`, `bedrag`, `value`, `amount_eur`, `waarde`
- IBAN: `iban`, `account_iban`, `rekening`, `account`
- Type: `type`, `transaction_type`, `soort`, `type_transactie`
- Description: `description`, `desc`, `omschrijving`, `note`, `notitie`
- Counterparty IBAN: `counterparty_iban`, `tegenrekening`, `counterparty`
- Is Debit: `is_debit`, `debit`, `afschrift`, `af`

---

### Step 3: Data Transformation & Validation

**File:** `src/lib/utils/transactionMapper.ts` (continued)

**Purpose:** Parse and validate transaction data types

**Transformations:**
1. **Date Parsing:**
   - Support formats: `YYYY-MM-DD`, `DD/MM/YYYY`, `DD-MM-YYYY`, `DD.MM.YYYY`, `MM/DD/YYYY`
   - Return Date object or error

2. **Amount Parsing:**
   - Handle decimal separators: `.` or `,`
   - Remove currency symbols: `€`, `EUR`, `$`, etc.
   - Handle negative values (with `-` or parentheses)
   - Return Decimal/number or error

3. **IBAN Validation:**
   - Format: 2 letters + 2 digits + up to 30 alphanumeric
   - Basic format check (full validation can be server-side)

4. **TransactionType Mapping:**
   - Map strings to enum: `Payment`, `Transfer`, `DirectDebit`, `Deposit`, `Withdrawal`, `Refund`, `Fee`, `Interest`, `Other`
   - Case-insensitive matching
   - Fuzzy matching: `direct debit` → `DirectDebit`, `payment` → `Payment`

5. **Boolean Conversion:**
   - Map: `true/false`, `1/0`, `yes/no`, `debit/credit` → boolean
   - For `isDebit`: detect from amount sign or explicit field

**Functions:**
```typescript
parseDate(dateString: string): Date | null
parseAmount(amountString: string): number | null
validateIBAN(iban: string): boolean
mapTransactionType(typeString: string): TransactionType | null
parseBoolean(value: string | number): boolean | null
```

**Transaction Input Type:**
```typescript
interface TransactionInput {
  date: Date;
  merchantName: string;
  iban: string;
  counterpartyIban?: string;
  isDebit: boolean;
  amount: number;
  type: TransactionType;
  description: string;
  categoryId?: number;
}
```

---

### Step 4: API Endpoint - Transaction Import

**File:** `src/routes/api/transactions/+server.ts`

**Purpose:** Handle bulk transaction imports with validation and duplicate detection

**Features:**
- Authenticate user (check `locals.user`)
- Validate all transactions (Zod schema)
- Check for duplicates (date + amount + merchantName + userId)
- Bulk insert with transaction (rollback on error)
- Return detailed results: imported, skipped, errors

**Endpoint:** `POST /api/transactions`

**Request Body:**
```typescript
{
  transactions: TransactionInput[];
  options?: {
    skipDuplicates?: boolean; // default: true
  }
}
```

**Response:**
```typescript
{
  success: boolean;
  imported: number;
  skipped: number;
  errors: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
  duplicates?: number;
}
```

**Tasks:**
1. Create POST handler
2. Add user authentication check
3. Create Zod validation schema for TransactionInput
4. Implement duplicate detection
5. Bulk insert with Prisma
6. Handle errors gracefully
7. Return detailed results

---

### Step 5: Validation Schema (Server-side)

**File:** `src/lib/server/validation/transaction.ts`

**Purpose:** Server-side validation using Zod

**Schema:**
```typescript
import { z } from 'zod';

const TransactionTypeEnum = z.enum([
  'Payment', 'Transfer', 'DirectDebit', 'Deposit',
  'Withdrawal', 'Refund', 'Fee', 'Interest', 'Other'
]);

export const TransactionInputSchema = z.object({
  date: z.coerce.date(),
  merchantName: z.string().min(1).max(255),
  iban: z.string().regex(/^[A-Z]{2}\d{2}[A-Z0-9]+$/i),
  counterpartyIban: z.string().regex(/^[A-Z]{2}\d{2}[A-Z0-9]+$/i).optional(),
  isDebit: z.boolean(),
  amount: z.number().positive().max(99999999.99),
  type: TransactionTypeEnum,
  description: z.string().min(1).max(1000),
  categoryId: z.number().int().positive().optional(),
});

export const TransactionImportSchema = z.object({
  transactions: z.array(TransactionInputSchema),
  options: z.object({
    skipDuplicates: z.boolean().default(true),
  }).optional(),
});
```

**Note:** Need to install `zod` package first

---

### Step 6: Update Upload Page UI

**File:** `src/routes/(protected)/upload-transactions/+page.svelte`

**Current State:** File selection UI exists, upload logic is TODO

**Add:**
1. **Parsing State:**
   - Show loading spinner while parsing CSV
   - Display progress: "Parsing CSV... (X rows processed)"

2. **Preview State:**
   - Show preview table with first 10-20 rows
   - Display validation errors/warnings
   - Show summary stats (total rows, valid, errors)
   - Column mapping display (if auto-detection worked)

3. **Upload State:**
   - Show upload progress
   - Display "Uploading X of Y transactions..."

4. **Success State:**
   - Show success message
   - Display import summary (imported, skipped, errors)
   - Show action buttons: "View Transactions", "Upload Another"

5. **Error Handling:**
   - Display parsing errors clearly
   - Show validation errors with row numbers
   - Allow user to fix and retry

**State Management:**
```typescript
type UploadState = 
  | 'idle'           // No file selected
  | 'file-selected'  // File selected, ready to parse
  | 'parsing'        // Parsing CSV file
  | 'preview'        // Show preview and validation
  | 'uploading'      // Uploading to server
  | 'success'        // Upload complete
  | 'error';         // Error occurred
```

---

### Step 7: Preview Table Component

**File:** `src/lib/components/TransactionPreview.svelte`

**Purpose:** Display parsed transactions in a table with validation highlighting

**Features:**
- Table layout with transaction fields
- Highlight rows with errors (red) or warnings (yellow)
- Show validation messages per field
- Pagination for large previews (show 20 at a time)
- Row selection (checkbox to exclude from upload)

**Props:**
```typescript
{
  transactions: TransactionInput[];
  errors: Array<{ row: number; field?: string; message: string }>;
  onExcludeRows?: (rowIndices: number[]) => void;
}
```

---

### Step 8: Error Display Component

**File:** `src/lib/components/ImportErrors.svelte`

**Purpose:** Show validation and parsing errors in a user-friendly way

**Features:**
- Group errors by type
- Show row number, field name, and error message
- Expandable/collapsible sections
- Export errors to CSV (optional, for user to fix)

**Props:**
```typescript
{
  errors: Array<{ row: number; field?: string; message: string }>;
  warnings?: Array<{ row: number; field?: string; message: string }>;
}
```

---

### Step 9: Upload Summary Component

**File:** `src/lib/components/UploadSummary.svelte`

**Purpose:** Show post-upload summary with statistics

**Features:**
- Import statistics: imported, skipped, errors
- Date range of imported transactions
- Total amount (debits/credits)
- Category breakdown (if any categories assigned)
- Action buttons

**Props:**
```typescript
{
  result: {
    imported: number;
    skipped: number;
    errors: Array<{ row: number; message: string }>;
    duplicates?: number;
  };
  dateRange?: { start: Date; end: Date };
  totalAmount?: { debits: number; credits: number };
}
```

---

## Implementation Order

1. **Install Dependencies** (if needed)
   - `zod` for validation
   - Optional: CSV parsing library (or build custom parser)

2. **Step 1-3: Core Parsing & Mapping**
   - CSV parser utility
   - Column mapping
   - Data transformation

3. **Step 4-5: Backend API**
   - Validation schema
   - API endpoint with duplicate detection

4. **Step 6: Upload Page Integration**
   - Connect parsing to UI
   - Add state management
   - Wire up API calls

5. **Step 7-9: UI Components**
   - Preview table
   - Error display
   - Upload summary

---

## Dependencies to Install

```bash
npm install zod
```

**Optional:** If we want a robust CSV parser library instead of building our own:
```bash
npm install papaparse
```

---

## Testing Considerations

1. **Test CSV Formats:**
   - Standard CSV (comma-separated)
   - Semicolon-separated (European)
   - Tab-separated
   - Different date formats
   - Different decimal separators

2. **Test Edge Cases:**
   - Empty file
   - File with only headers
   - Malformed CSV (unclosed quotes)
   - Very large files (performance)
   - Duplicate transactions
   - Invalid data types

3. **Test Error Handling:**
   - Network errors during upload
   - Server validation errors
   - Duplicate detection
   - Partial success (some transactions fail)

---

## Files to Create/Modify

### New Files:
1. `src/lib/utils/csvParser.ts`
2. `src/lib/utils/transactionMapper.ts`
3. `src/routes/api/transactions/+server.ts`
4. `src/lib/server/validation/transaction.ts`
5. `src/lib/components/TransactionPreview.svelte`
6. `src/lib/components/ImportErrors.svelte`
7. `src/lib/components/UploadSummary.svelte`

### Modified Files:
1. `src/routes/(protected)/upload-transactions/+page.svelte` - Add full upload workflow
2. `package.json` - Add zod dependency

---

## Next Steps After This Plan

Once CSV upload is complete, you can move on to:
- Phase 3: Category Management
- Phase 4: Transaction Enrichment
- Phase 5: Transaction Views & Management

