# Development Plan - Reflectie AI Transaction Management

## Phase 1: Core Transaction Management ✅ (Complete)

### ✅ Completed
- [x] Database schema design (User, Transaction, Category models)
- [x] Transaction model with all required fields
- [x] Category model with user-generated categories and metadata
- [x] Migration file created and applied
- [x] Migration applied: `npx prisma migrate dev` (dropped `people` table)

### Notes
- All transaction creation will be done via CSV upload (no manual creation needed)
- API route and upload page handling moved to Phase 2

---

## Phase 2: CSV Upload & Processing

### Overview
Build a comprehensive CSV upload tool that allows users to import transaction data with proper validation, column mapping, preview, and feedback throughout the process.

---

### 2.1 CSV Reading & Data Extraction Strategy

#### Discussion: How to Best Read CSV and Extract Data

**Approach Options:**
1. **Client-side parsing** (recommended for MVP)
   - Parse CSV in browser using FileReader API
   - Immediate feedback without server round-trip
   - Can handle files up to ~50MB before performance issues
   - Reduces server load
   - Better user experience (instant preview)

2. **Server-side parsing** (for large files)
   - Upload file first, then parse on server
   - Better for files >50MB
   - More secure (validation happens server-side)
   - Requires file upload progress tracking

**Recommended Hybrid Approach:**
- Start with client-side parsing for immediate feedback
- For files >10MB, offer option to parse server-side
- Always validate on server before saving to database

#### CSV Parsing Strategy

**Step 1: File Reading**
- Use `FileReader.readAsText()` for CSV files
- Support UTF-8 encoding (handle BOM if present)
- Detect delimiter (comma, semicolon, tab) automatically
- Handle quoted fields (CSV standard: `"field, with comma"`)
- Support different line endings (CRLF, LF)

**Step 2: Header Detection**
- Read first row as headers
- Normalize header names (trim, lowercase, remove special chars)
- Map common variations:
  - `date`, `transaction_date`, `datum`, `transactiedatum`
  - `merchant`, `merchant_name`, `merchantName`, `bedrijf`
  - `amount`, `bedrag`, `value`, `amount_eur`
  - `iban`, `account_iban`, `rekening`
  - `type`, `transaction_type`, `soort`
  - `description`, `desc`, `omschrijving`, `note`

**Step 3: Data Extraction**
- Parse each row with proper CSV handling (quoted fields, escaped quotes)
- Extract and normalize values:
  - **Date**: Parse multiple formats (YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, etc.)
  - **Amount**: Handle decimal separators (`.` or `,`), currency symbols, negative values
  - **IBAN**: Validate format (2 letters + 2 digits + up to 30 alphanumeric)
  - **TransactionType**: Map strings to enum (case-insensitive, fuzzy matching)
  - **Boolean**: Handle `true/false`, `1/0`, `yes/no`, `debit/credit`
- Track parsing errors per row (line number, field, error message)

**Step 4: Validation**
- Required fields: `date`, `merchantName`, `iban`, `amount`, `type`, `description`
- Optional fields: `counterpartyIban`, `categoryId`
- Validate data types and formats
- Check date ranges (not too far in past/future)
- Validate amount is numeric and reasonable

#### Implementation Plan

**Tasks:**
1. **CSV Parser Utility** (`src/lib/utils/csvParser.ts`)
   - [ ] Create `parseCSVFile(file: File): Promise<ParseResult>` function
   - [ ] Auto-detect delimiter (comma, semicolon, tab)
   - [ ] Handle quoted fields and escaped quotes
   - [ ] Normalize headers (trim, lowercase, map variations)
   - [ ] Parse rows with error tracking
   - [ ] Return structured result: `{ headers, rows, errors, warnings }`

2. **Data Transformation** (`src/lib/utils/transactionMapper.ts`)
   - [ ] Create `mapCSVRowToTransaction(row, headers, mapping): TransactionInput`
   - [ ] Handle date parsing (multiple formats)
   - [ ] Parse amounts (decimal separators, currency symbols)
   - [ ] Validate and normalize IBAN
   - [ ] Map TransactionType strings to enum values
   - [ ] Convert boolean values
   - [ ] Return validation errors per field

3. **Column Mapping**
   - [ ] Auto-detect column mappings from headers
   - [ ] Allow user to manually map columns
   - [ ] Save mapping preferences (localStorage) for future uploads
   - [ ] Support custom field mappings

---

### 2.2 User Interface During Upload/Extraction

#### Discussion: What to Show in the UI

**Upload Flow States:**

1. **Initial State**
   - File input (drag & drop or click to browse)
   - Instructions/help text
   - Supported formats info
   - Example CSV format

2. **File Selected**
   - Show file name and size
   - "Parse CSV" button
   - File info (rows detected, encoding)

3. **Parsing State** (if client-side)
   - Progress indicator (spinner or progress bar)
   - Status message: "Reading file...", "Parsing CSV...", "Extracting data..."
   - Show row count as it's being processed
   - Estimated time remaining (for large files)

4. **Parsing Complete**
   - Summary statistics:
     - Total rows parsed
     - Valid transactions count
     - Errors/warnings count
     - Duplicates detected (if checking against existing)
   - Column mapping interface (if auto-detection failed)
   - Preview table (first 10-20 rows)
   - Validation errors list (expandable)

5. **Uploading to Server**
   - Progress bar (if server-side)
   - Status: "Uploading X of Y transactions..."
   - Batch progress (if chunking large imports)

6. **Upload Complete**
   - Success message with summary
   - Statistics: imported, skipped (duplicates), errors
   - Link to view transactions
   - Option to upload another file

#### UI Components Needed

**Tasks:**
1. **Upload Page** (`src/routes/(protected)/upload-transactions/+page.svelte`) - **Build from scratch, handle everything**
   - [ ] File input with drag & drop support
   - [ ] File info display (name, size, row count)
   - [ ] Parsing progress indicator
   - [ ] Column mapping UI (if needed)
   - [ ] Preview table component
   - [ ] Validation errors panel
   - [ ] Upload progress indicator
   - [ ] Success/error feedback
   - [ ] Handle TransactionType enum validation
   - [ ] Complete CSV upload workflow

2. **Preview Table Component** (`src/lib/components/TransactionPreview.svelte`)
   - [ ] Display parsed transactions in table
   - [ ] Highlight validation errors/warnings
   - [ ] Show mapped vs unmapped columns
   - [ ] Pagination for large previews
   - [ ] Sortable columns
   - [ ] Row selection (to exclude from upload)

3. **Column Mapper Component** (`src/lib/components/ColumnMapper.svelte`)
   - [ ] Show CSV headers vs transaction fields
   - [ ] Dropdown to map each CSV column
   - [ ] Auto-suggest based on header name
   - [ ] Preview mapped data
   - [ ] Save/load mapping presets

4. **Progress Indicator Component** (`src/lib/components/UploadProgress.svelte`)
   - [ ] Progress bar with percentage
   - [ ] Status messages
   - [ ] Estimated time remaining
   - [ ] Cancel button (if possible)

---

### 2.3 Displaying Uploaded Data

#### Discussion: How to Show Uploaded Data

**Post-Upload Display Options:**

1. **Immediate Summary View** (on upload page)
   - Statistics card:
     - Total imported
     - Date range of transactions
     - Total amount (debits/credits)
     - Categories distribution (if any)
   - Quick actions:
     - "View All Transactions" button
     - "Enrich Transactions" button
     - "Upload Another File" button

2. **Redirect to Transactions List** (optional)
   - Show newly imported transactions
   - Filter by "imported today" or "last import"
   - Highlight new transactions
   - Show import batch info

3. **Import History** (future enhancement)
   - List of previous imports
   - Import date, file name, transaction count
   - View transactions from specific import
   - Re-import or delete import batch

#### Display Components

**Tasks:**
1. **Upload Summary Component** (`src/lib/components/UploadSummary.svelte`)
   - [ ] Display import statistics
   - [ ] Show date range
   - [ ] Show amount totals
   - [ ] Category breakdown (pie chart or list)
   - [ ] Action buttons (view, enrich, upload more)

2. **Transaction List Integration**
   - [ ] Filter by import date/batch
   - [ ] Highlight newly imported transactions
   - [ ] Show import metadata (if stored)

3. **Error Report Component** (`src/lib/components/ImportErrors.svelte`)
   - [ ] List all parsing/validation errors
   - [ ] Group by error type
   - [ ] Show row numbers and field names
   - [ ] Export errors to CSV (for user to fix)
   - [ ] Allow retry with fixed file

---

### 2.4 Transaction Import API

#### API Endpoint Design

**Endpoint:** `POST /api/transactions`

**Request Body:**
```typescript
{
  transactions: TransactionInput[],
  options?: {
    skipDuplicates?: boolean,
    validateOnly?: boolean,
    batchId?: string
  }
}
```

**Response:**
```typescript
{
  success: boolean,
  imported: number,
  skipped: number,
  errors: Array<{
    row: number,
    field?: string,
    message: string
  }>,
  duplicates?: number,
  batchId?: string
}
```

**Tasks:**
1. **Transaction Import API** (`src/routes/api/transactions/+server.ts`) - **Create from scratch**
   - [ ] Create POST handler with user authentication check
   - [ ] Handle new schema (enums, category relation)
   - [ ] Validate TransactionType enum values
   - [ ] Validate all required fields
   - [ ] Check for duplicates (date + amount + merchantName)
   - [ ] Bulk insert with transaction (rollback on error)
   - [ ] Return detailed import results
   - [ ] Handle large imports (chunking if needed)
   - [ ] Rate limiting for bulk operations

2. **Validation Schemas** (`src/lib/server/validation/transaction.ts`)
   - [ ] Zod schema for TransactionInput
   - [ ] Validate TransactionType enum
   - [ ] Validate IBAN format
   - [ ] Validate date ranges
   - [ ] Validate amount format

3. **Duplicate Detection** (`src/lib/server/transactions/duplicates.ts`)
   - [ ] Check existing transactions (same date, amount, merchant)
   - [ ] Configurable matching criteria
   - [ ] Return duplicate list with existing transaction IDs

---

### 2.5 Implementation Checklist

**Phase 2.1: CSV Parser**
- [ ] Create CSV parser utility with delimiter detection
- [ ] Handle quoted fields and escaped quotes
- [ ] Header normalization and mapping
- [ ] Row parsing with error tracking

**Phase 2.2: Data Transformation**
- [ ] Date parsing (multiple formats)
- [ ] Amount parsing (decimal separators, currency)
- [ ] IBAN validation
- [ ] TransactionType enum mapping
- [ ] Boolean conversion

**Phase 2.3: UI Components**
- [ ] File input with drag & drop
- [ ] Parsing progress indicator
- [ ] Column mapping interface
- [ ] Preview table component
- [ ] Validation errors panel
- [ ] Upload progress indicator

**Phase 2.4: API Integration**
- [ ] Transaction import API endpoint
- [ ] Validation schemas
- [ ] Duplicate detection
- [ ] Bulk import handling
- [ ] Error reporting

**Phase 2.5: Post-Upload Display**
- [ ] Upload summary component
- [ ] Statistics display
- [ ] Error report component
- [ ] Navigation to transaction list

**Phase 2.6: Testing**
- [ ] Test with various CSV formats
- [ ] Test with malformed data
- [ ] Test with large files
- [ ] Test duplicate detection
- [ ] Test error handling

---

## Phase 3: Category Management

### Tasks
1. **Category CRUD API** (`src/routes/api/categories/+server.ts`)
   - [ ] GET - List user's categories + system categories
   - [ ] POST - Create user category
   - [ ] PUT - Update category (`/api/categories/[id]`)
   - [ ] DELETE - Delete category (with transaction handling)
   - [ ] Validate unique category names per user

2. **Category Management Page** (`src/routes/(protected)/categories/+page.svelte`)
   - [ ] Display list of categories (user + system)
   - [ ] Create new category form
   - [ ] Edit category (name, color, icon, keywords)
   - [ ] Delete category (with confirmation)
   - [ ] Show category usage (transaction count)
   - [ ] Support hierarchical categories (parent/child)

3. **Category Selection Component**
   - [ ] Reusable category picker/dropdown
   - [ ] Show category colors/icons in UI
   - [ ] Filter/search categories

---

## Phase 4: Transaction Enrichment

### Tasks
1. **Merchant Name Cleaning** (`src/lib/server/enrichment/merchant.ts`)
   - [ ] Clean merchant names (remove extra spaces, standardize)
   - [ ] Extract merchant identifiers
   - [ ] Store in `cleanedMerchantName` and `merchantIdentifiers` fields
   - [ ] Batch processing function

2. **Auto-Categorization** (`src/lib/server/enrichment/categorize.ts`)
   - [ ] Match transactions to categories using keywords
   - [ ] Use merchant name, description, IBAN patterns
   - [ ] Only categorize if `isCategoryManual = false`
   - [ ] Set confidence score (future enhancement)
   - [ ] Batch processing function

3. **Enrichment Page** (`src/routes/(protected)/enrich/categorize/+page.svelte`)
   - [ ] Select transactions to enrich (date range, uncategorized only, etc.)
   - [ ] Show enrichment options (merchant cleaning, categorization)
   - [ ] Start enrichment job
   - [ ] Show progress/results
   - [ ] Preview changes before applying

4. **Enrichment API** (`src/routes/api/enrich/+server.ts`)
   - [ ] POST `/api/enrich/categorize` - Run categorization
   - [ ] POST `/api/enrich/merchant` - Clean merchant names
   - [ ] Support batch processing
   - [ ] Return enrichment results

---

## Phase 5: Transaction Views & Management

### Tasks
1. **Transaction List Page** (`src/routes/(protected)/transactions/+page.svelte`)
   - [ ] Display transactions in table/list
   - [ ] Filtering (date range, category, type, amount)
   - [ ] Sorting (date, amount, merchant)
   - [ ] Search (merchant name, description)
   - [ ] Pagination
   - [ ] Show category colors/icons

2. **Transaction Detail/Edit** (`src/routes/(protected)/transactions/[id]/+page.svelte`)
   - [ ] View transaction details
   - [ ] Edit transaction (category, notes, etc.)
   - [ ] Set `isCategoryManual = true` when user changes category
   - [ ] Mark as recurring
   - [ ] Delete transaction

3. **Transaction API Updates** (`src/routes/api/transactions/[id]/+server.ts`)
   - [ ] GET - Get single transaction
   - [ ] PUT - Update transaction
   - [ ] DELETE - Delete transaction
   - [ ] Ensure user ownership validation

---

## Phase 6: Recurring Transaction Detection

### Tasks
1. **Recurring Detection Logic** (`src/lib/server/analysis/recurring.ts`)
   - [ ] Analyze transactions for patterns
   - [ ] Group similar transactions (same merchant, similar amount)
   - [ ] Detect frequency (monthly, weekly, etc.)
   - [ ] Set `isRecurring = true` on matching transactions
   - [ ] Create recurring groups (future: RecurringTransaction model)

2. **Recurring Transactions Page** (`src/routes/(protected)/analyze/recurring/+page.svelte`)
   - [ ] List detected recurring transactions
   - [ ] Show patterns (frequency, amount range)
   - [ ] Manual override (mark/unmark as recurring)
   - [ ] Subscription identification (future)

---

## Phase 7: Analysis Features (Future)

### Tasks
1. **Salary Detection** (`src/routes/(protected)/analyze/salary/+page.svelte`)
   - [ ] Identify salary payments
   - [ ] Show salary history
   - [ ] Calculate average salary

2. **Subscription Analysis** (`src/routes/(protected)/analyze/subscriptions/+page.svelte`)
   - [ ] List all subscriptions
   - [ ] Calculate monthly/yearly costs
   - [ ] Identify potential savings

---

## Technical Considerations

### Database
- [ ] Seed default system categories (Uncategorized, Income, etc.)
- [ ] Add database indexes for performance (date, userId, categoryId)
- [ ] Consider soft deletes for transactions (future)

### API & Validation
- [ ] Add input validation (Zod schemas)
- [ ] Add rate limiting for bulk operations
- [ ] Add transaction ownership checks on all endpoints
- [ ] Error handling and logging

### UI/UX
- [ ] Loading states for async operations
- [ ] Error messages and user feedback
- [ ] Responsive design
- [ ] Accessibility considerations

### Performance
- [ ] Optimize bulk transaction imports
- [ ] Add pagination for large transaction lists
- [ ] Cache category lists
- [ ] Consider background jobs for enrichment (future)

---

## Priority Order

1. **Phase 1** - Complete core setup (apply migration, fix API)
2. **Phase 2** - CSV upload & processing (core functionality) ⭐ **CURRENT FOCUS**
   - Comprehensive CSV parsing with column mapping
   - Rich UI feedback during upload/extraction
   - Preview and validation before import
   - Post-upload data display
3. **Phase 3** - Category management (needed for enrichment)
4. **Phase 4** - Transaction enrichment (main feature)
5. **Phase 5** - Transaction views (user needs to see their data)
6. **Phase 6** - Recurring detection (nice to have)
7. **Phase 7** - Analysis features (future enhancements)

---

## Notes

- All transaction operations must be user-scoped (check `locals.user`)
- Categories can be system-wide (`userId = null`) or user-specific
- When user manually changes category, set `isCategoryManual = true`
- Enrichment should respect `isCategoryManual` flag
- Consider using background jobs for large enrichment operations (future)
- Upload page is protected (located in `(protected)` route group)
- CSV upload tool is the current focus - building from scratch with comprehensive parsing, validation, and UI feedback


