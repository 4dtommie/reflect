# Category Management Implementation Plan

## Overview

This plan covers the complete category management system, including default categories, user customization, and the foundation for auto-categorization.

### Category Structure Summary

**Total Default Categories: 27 main + 19 subcategories = 46 total**

**Category Groups:**
- **`income`** - All income categories (6 categories)
- **`essential`** - Essential expenses (needs): Housing, Bills & Utilities, Transportation, Food & Groceries, Healthcare, Insurance, Loans & Debt Repayment, Childcare & Dependent Care (8 main + 10 subcategories)
- **`lifestyle`** - Lifestyle expenses (wants): Restaurants & Dining, Shopping, Entertainment, Travel, Personal Care, Education, Software & Tools, Charity & Donations, Pet Care (9 main + 9 subcategories)
- **`financial`** - Financial management: Savings & Investments, Fees & Charges, Transfers Between Own Accounts (3 categories)
- **`other`** - Uncategorized and custom categories (custom categories default to `other`)

**Categories by Group:**
- **6 Income Categories** (`income`): Salary, Freelance/Contract, Investment Returns, Tax Returns & Subsidies (combined), Refund, Other Income
- **21 Expense Categories:**
  - **Essential** (`essential`): Food & Groceries (with 4 subcategories), Transportation (with 6 subcategories), Bills & Utilities, Housing, Healthcare, Insurance, Loans & Debt Repayment, Childcare & Dependent Care
  - **Lifestyle** (`lifestyle`): Restaurants & Dining (with 5 subcategories), Shopping (with 4 subcategories), Entertainment, Education, Software & Tools, Travel, Charity & Donations, Personal Care, Pet Care
  - **Financial** (`financial`): Savings & Investments, Fees & Charges, Transfers Between Own Accounts
- **1 System Category** (`other`): Uncategorized (always available)

**Note:** 
- Removed "Subscriptions" as a standalone category - subscriptions should be categorized by what they're for (Entertainment, Software & Tools, Education, Healthcare, etc.). Use `is_recurring` flag to identify recurring payments.
- Subcategories inherit their parent's `group` field
- Custom categories default to `group: "other"` but can be changed by the user

**Subcategories:**
- **Food & Groceries** (category #7) has 4 subcategories:
  - Supermarket (7a) - includes convenience stores and online delivery
  - Butcher (7b)
  - Baker (7c)
  - Specialty Food Stores (7d)
- **Restaurants & Dining** (category #8) has 5 subcategories:
  - Coffee (8a)
  - Lunch (8b)
  - Eating Out (8c)
  - Ordering Food (8d)
  - Uitgaan/Bars & Drinks (8e)
- **Transportation** (category #9) has 6 subcategories:
  - Car Payment (9a)
  - Fuel (9b)
  - Public Transit (9c)
  - Parking (9d)
  - Maintenance & Repairs (9e)
  - Taxi & Rideshare (9f)
- **Shopping** (category #10) has 4 subcategories:
  - Clothing (10a)
  - Electronics (10b)
  - Home Goods (10c)
  - General Retail (10d)
- **Restaurants & Dining** (category #8) has 5 subcategories:
  - Coffee (8a)
  - Lunch (8b)
  - Eating Out (8c)
  - Ordering Food (8d)
  - Uitgaan/Bars & Drinks (8e)

**Note:** 
- Subcategories use the `parent_id` field to link to their parent category. **Parent categories with subcategories are organizational only** - they should have empty keywords and transactions should be categorized into the subcategories, not the parent. When implementing, create the parent category first, then create subcategories with `parent_id` pointing to the parent's ID.
- **See `CATEGORIES.md` for the complete category definitions** - this separate document makes it easier to edit and maintain the category list.

---

## Phase 1: Default Categories Definition

### 1.1 Default Category Structure

Default categories should cover common transaction types and be available to all users. They cannot be deleted but can be hidden per user.

**Category Properties:**
- `name`: Unique category name
- `description`: What this category is for
- `color`: Hex color code for UI display
- `icon`: Icon identifier (using Lucide icons)
- `keywords`: Array of keywords for auto-categorization
- `is_default`: `true` for system categories
- `created_by`: `null` for system categories
- `parent_id`: Optional parent category for hierarchy
- `group`: Top-level grouping (`income`, `essential`, `lifestyle`, `financial`, `other`)
  - Subcategories inherit their parent's group
  - Custom categories default to `other`

### 1.2 Default Categories List

**See `CATEGORIES.md` for the complete, detailed category definitions.**

This separate document contains:
- All 6 income categories (including combined Tax Returns & Subsidies)
- All 16 expense categories (including Restaurants & Dining with 5 subcategories)
- The Uncategorized system category
- Complete properties for each category (name, description, color, icon, keywords, parent)

The categories document is easier to edit and maintain separately from this implementation plan.

### 1.3 Implementation Tasks

**Task 1.1: Update Seed File**
- [ ] Create seed data for all default categories
- [ ] Set `is_default: true` and `created_by: null` for all defaults
- [ ] Include all properties: name, description, color, icon, keywords, group
- [ ] Assign groups: `income` (6), `essential` (8 main + 10 sub), `lifestyle` (9 main + 9 sub), `financial` (3), `other` (1)
- [ ] Ensure subcategories inherit parent's group
- [ ] Ensure "Uncategorized" is always created with `group: "other"`

**Task 1.2: Migration Strategy**
- [ ] Create migration to seed default categories (idempotent - check if exists)
- [ ] Or use seed script that can be run safely multiple times
- [ ] Ensure defaults are created on database setup

**Task 1.3: Default Category Access**
- [ ] System categories (`is_default: true`) are always available
- [ ] Users can enable/disable defaults via `user_categories` table
- [ ] "Uncategorized" cannot be disabled
- [ ] Defaults cannot be deleted or edited by users

---

## Phase 2: Category API Endpoints

### 2.1 GET /api/categories

**Purpose:** Get all categories available to the user (system defaults + user's custom categories)

**Response:**
```typescript
{
  systemCategories: Category[];  // is_default: true
  userCategories: Category[];     // created_by: userId
  userCategoryPreferences: {     // From user_categories table
    categoryId: number;
    isActive: boolean;
    sortOrder: number;
  }[];
}
```

**Logic:**
- Return all system categories (`is_default: true`)
- Return user's custom categories (`created_by: userId`)
- Include user preferences from `user_categories` table
- Sort by `sort_order` from `user_categories`, then by name

**Tasks:**
- [ ] Create GET handler in `/api/categories/+server.ts`
- [ ] Authenticate user
- [ ] Query system categories
- [ ] Query user categories
- [ ] Query user preferences
- [ ] Combine and format response

### 2.2 POST /api/categories

**Purpose:** Create a new user category

**Request Body:**
```typescript
{
  name: string;           // Required, unique per user
  description?: string;
  color?: string;         // Hex color code
  icon?: string;          // Lucide icon name
  keywords?: string[];    // For auto-categorization
  parentId?: number;      // Optional parent category
  group?: string;         // Optional: "income", "essential", "lifestyle", "financial", "other" (defaults to "other")
}
```

**Validation:**
- Name is required and unique (per user - check user's categories only)
- Color must be valid hex code (optional)
- Icon must be valid Lucide icon name (optional)
- Parent ID must exist and belong to user or be a system category
- Group must be one of: "income", "essential", "lifestyle", "financial", "other" (defaults to "other" if not provided)
- If parentId is provided, group should inherit from parent (or can be overridden)

**Response:**
```typescript
{
  success: boolean;
  category: Category;
}
```

**Tasks:**
- [ ] Create POST handler
- [ ] Validate request body (Zod schema)
- [ ] Check name uniqueness (user's categories only)
- [ ] Validate parent category if provided
- [ ] Create category with `created_by: userId`, `is_default: false`
- [ ] Set `group` to provided value or default to `"other"`
- [ ] If `parentId` is provided, inherit group from parent (unless explicitly overridden)
- [ ] Automatically add to `user_categories` with `is_active: true`
- [ ] Return created category

### 2.3 GET /api/categories/[id]

**Purpose:** Get a single category by ID

**Response:**
```typescript
{
  category: Category;
  canEdit: boolean;      // true if user created it
  canDelete: boolean;    // true if user created it and no transactions use it
  transactionCount: number;
}
```

**Logic:**
- User can view any category (system or custom)
- `canEdit`: true only if `created_by === userId`
- `canDelete`: true only if user created it AND no transactions reference it
- Include transaction count

**Tasks:**
- [ ] Create GET handler in `/api/categories/[id]/+server.ts`
- [ ] Check category exists
- [ ] Check permissions
- [ ] Count transactions using this category
- [ ] Return category with metadata

### 2.4 PUT /api/categories/[id]

**Purpose:** Update a user's custom category

**Request Body:**
```typescript
{
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  keywords?: string[];
  parentId?: number;
  group?: string;         // Optional: can change group
}
```

**Validation:**
- User can only edit their own categories (`created_by === userId`)
- Cannot edit system categories
- Name uniqueness check (if name is being changed)
- Validate parent category if provided

**Response:**
```typescript
{
  success: boolean;
  category: Category;
}
```

**Tasks:**
- [ ] Create PUT handler in `/api/categories/[id]/+server.ts`
- [ ] Check category exists
- [ ] Check user owns the category
- [ ] Validate request body
- [ ] Update category
- [ ] Return updated category

### 2.5 DELETE /api/categories/[id]

**Purpose:** Delete a user's custom category

**Validation:**
- User can only delete their own categories
- Cannot delete if transactions reference it
- Option: Reassign transactions to "Uncategorized" or another category

**Request Body (optional):**
```typescript
{
  reassignToCategoryId?: number;  // If provided, reassign transactions
}
```

**Response:**
```typescript
{
  success: boolean;
  deleted: boolean;
  reassignedCount?: number;
}
```

**Tasks:**
- [ ] Create DELETE handler
- [ ] Check category exists and user owns it
- [ ] Count transactions using this category
- [ ] If transactions exist and `reassignToCategoryId` provided, reassign them
- [ ] If transactions exist and no reassign, return error
- [ ] Delete category and remove from `user_categories`
- [ ] Return success with reassigned count

### 2.6 PUT /api/categories/[id]/preferences

**Purpose:** Update user's preferences for a category (enable/disable, sort order)

**Request Body:**
```typescript
{
  isActive?: boolean;
  sortOrder?: number;
}
```

**Logic:**
- Updates or creates entry in `user_categories` table
- Cannot disable "Uncategorized"
- System categories can be enabled/disabled per user
- User categories are always active (but can be disabled via this endpoint)

**Response:**
```typescript
{
  success: boolean;
  preferences: {
    categoryId: number;
    isActive: boolean;
    sortOrder: number;
  };
}
```

**Tasks:**
- [ ] Create PUT handler in `/api/categories/[id]/preferences/+server.ts`
- [ ] Check category exists
- [ ] Prevent disabling "Uncategorized"
- [ ] Upsert `user_categories` entry
- [ ] Return preferences

### 2.7 Validation Schema

**File:** `src/lib/server/validation/category.ts`

**Tasks:**
- [ ] Create Zod schemas for:
  - `CategoryCreateSchema`
  - `CategoryUpdateSchema`
  - `CategoryPreferencesSchema`
- [ ] Validate color format (hex)
- [ ] Validate icon name (optional - can validate against known Lucide icons)
- [ ] Validate keywords array
- [ ] Validate group field (must be one of: "income", "essential", "lifestyle", "financial", "other")
- [ ] Default group to "other" for custom categories

---

## Phase 3: Category Management UI

### 3.1 Categories List Page

**File:** `src/routes/(protected)/categories/+page.svelte`

**Features:**
- Display all categories (system + user)
- **Group by top-level groups:** Income, Essential Expenses, Lifestyle Expenses, Financial Management, Other
- Within each group, show: System Categories / My Categories
- Show category details: name, color, icon, keyword count, transaction count, group
- Enable/disable toggle for each category
- Edit button (only for user categories)
- Delete button (only for user categories, if no transactions)
- Create new category button
- Search/filter categories
- Filter by group
- Sort categories (by name, usage, custom order, group)

**UI Sections:**

1. **Header**
   - Page title: "Categories"
   - "Create Category" button

2. **System Categories Section**
   - Title: "System Categories"
   - Description: "Default categories available to all users"
   - List of system categories with:
     - Color indicator
     - Icon
     - Name
     - Description
     - Transaction count
     - Enable/disable toggle
     - View details button

3. **My Categories Section**
   - Title: "My Categories"
   - Description: "Your custom categories"
   - List of user categories with:
     - Color indicator
     - Icon
     - Name
     - Description
     - Transaction count
     - Edit button
     - Delete button
     - Enable/disable toggle

4. **Empty State**
   - If no user categories: "You haven't created any custom categories yet"
   - "Create your first category" button

**Tasks:**
- [ ] Create page component
- [ ] Fetch categories from API
- [ ] Display system categories section
- [ ] Display user categories section
- [ ] Implement enable/disable toggle
- [ ] Implement edit functionality (modal or separate page)
- [ ] Implement delete functionality (with confirmation)
- [ ] Add search/filter
- [ ] Add loading states
- [ ] Add error handling

### 3.2 Create/Edit Category Modal/Page

**File:** `src/routes/(protected)/categories/new/+page.svelte` (or modal component)

**Features:**
- Form to create/edit category
- Fields:
  - Name (required, unique)
  - Description (optional)
  - Color picker (optional, with preset colors)
  - Icon selector (optional, with icon picker)
  - Keywords input (comma-separated or array input)
  - Parent category selector (optional, dropdown)
  - Group selector (optional, defaults to "other", dropdown with: income, essential, lifestyle, financial, other)
- Validation
- Submit button
- Cancel button

**Color Presets:**
- Provide common color options
- Allow custom hex color input
- Show color preview

**Icon Selector:**
- Searchable list of Lucide icons
- Icon preview
- Common icons: ShoppingCart, Home, Car, Heart, etc.

**Keywords Input:**
- Text input with comma separation
- Or tag-based input (add/remove keywords)
- Show suggestions based on common keywords

**Tasks:**
- [ ] Create form component
- [ ] Implement color picker
- [ ] Implement icon selector
- [ ] Implement keywords input
- [ ] Add parent category selector
- [ ] Form validation
- [ ] Submit to API
- [ ] Handle success/error
- [ ] Redirect to categories list on success

**Edit Mode:**
- [ ] Pre-fill form with existing category data
- [ ] Update instead of create on submit
- [ ] Handle name uniqueness (exclude current category)

### 3.3 Category Detail/View Page (Optional)

**File:** `src/routes/(protected)/categories/[id]/+page.svelte`

**Features:**
- Show category details
- Show transaction count
- Show recent transactions in this category
- Edit button (if user owns it)
- Delete button (if user owns it and no transactions)
- Keywords list
- Usage statistics (optional)

**Tasks:**
- [ ] Create detail page
- [ ] Fetch category from API
- [ ] Display category information
- [ ] Show transaction list (link to transactions page with filter)
- [ ] Add edit/delete actions

### 3.4 Category Picker Component

**File:** `src/lib/components/CategoryPicker.svelte`

**Purpose:** Reusable component for selecting a category (used in transaction edit, etc.)

**Features:**
- Dropdown/select with categories
- Show color and icon for each category
- Search/filter
- **Group by top-level groups** (Income, Essential, Lifestyle, Financial, Other)
- Within groups, show subcategories grouped under their parent (for visual organization)
- Show "Uncategorized" option
- **Exclude parent categories that have subcategories** (they're organizational only)
- Optional: Allow creating new category inline
- Optional: Filter by group

**Props:**
```typescript
{
  selectedCategoryId?: number;
  onSelect: (categoryId: number | null) => void;
  showUncategorized?: boolean;  // default: true
  allowCreate?: boolean;        // default: false
  filterByGroup?: string;      // optional: filter to specific group
}
```

**Implementation Notes:**
- Only show categories that can be used for categorization
- Filter out parent categories that have subcategories (they have empty keywords)
- Show categories organized by group, then by parent/child relationships
- When a parent category has subcategories, only show the subcategories as selectable options
- Use group field to organize categories in the dropdown

**Tasks:**
- [ ] Create component
- [ ] Fetch categories
- [ ] Filter out parent categories with subcategories
- [ ] Display dropdown with colors/icons
- [ ] Group subcategories under parent (visual organization)
- [ ] Implement search
- [ ] Handle selection
- [ ] Optional: Inline category creation

---

## Phase 4: User Category Preferences

### 4.1 User Category Preferences Management

**Purpose:** Allow users to customize which categories they see and their order

**Features:**
- Enable/disable categories (via toggle on categories page)
- Reorder categories (drag & drop or up/down buttons)
- Save preferences to `user_categories` table

**Implementation:**
- When user enables a category, create/update `user_categories` entry with `is_active: true`
- When user disables, set `is_active: false` (or delete entry)
- When user reorders, update `sort_order` in `user_categories`
- Default `sort_order` for system categories: alphabetical
- User categories: order by creation date or custom order

**Tasks:**
- [ ] Implement enable/disable toggle
- [ ] Implement drag & drop reordering (optional)
- [ ] Implement up/down buttons for reordering
- [ ] Save preferences to API
- [ ] Update UI to reflect saved order

---

## Phase 5: Automatic Transaction Categorization

### Overview

This phase implements automatic categorization of all transactions using a two-stage approach:
1. **Keyword Matching** (fast, free): Match category keywords against transaction description and merchant name
2. **AI Categorization** (for unmatched): Use OpenAI API to categorize remaining transactions

The system learns by automatically adding AI-suggested keywords to categories, improving accuracy over time.

### 5.1 Database Schema Updates

**Task 5.1.1: Create `category_keywords` Table**

Move all keywords from `categories.keywords String[]` to a separate `category_keywords` table for better tracking and metadata.

**New Schema:**
```prisma
model category_keywords {
  id                  Int          @id @default(autoincrement())
  category_id         Int
  keyword             String
  source              String       @default("manual") // "manual" | "ai"
  source_transaction_id Int?      // Transaction that suggested this keyword (if source = "ai")
  confidence          Float?       // AI confidence score (if source = "ai")
  created_at          DateTime     @default(now())
  categories          categories   @relation(fields: [category_id], references: [id], onDelete: Cascade)
  transactions        transactions? @relation(fields: [source_transaction_id], references: [id])
  
  @@unique([category_id, keyword]) // Prevent duplicate keywords per category
  @@index([category_id])
  @@index([keyword]) // For fast keyword searches
}
```

**Update `categories` model:**
```prisma
model categories {
  // ... existing fields
  // Remove: keywords String[]
  // Add relation:
  category_keywords   category_keywords[]
  // ... rest of fields
}
```

**Update `transactions` model:**
```prisma
model transactions {
  // ... existing fields
  category_confidence Float? // Store AI confidence score
  category_keywords   category_keywords[] // Relation for tracking keyword sources
  // ... rest of fields
}
```

**Migration Tasks:**
- [ ] Create migration to:
  1. Drop all existing categories (cascades to related data)
  2. Add `category_keywords` table
  3. Remove `keywords` field from `categories` table
  4. Add `category_confidence` field to `transactions` table
- [ ] Add indexes for performance
- [ ] Note: All existing categories and keywords will be dropped (fresh start)

**Task 5.1.2: Update Seed File**

**File:** `prisma/seed.ts`

**Changes:**
- Remove `keywords` array from category creation
- After creating each category, create keyword entries in `category_keywords` table
- Set `source: "manual"` for all seed keywords
- Maintain same keyword lists as before, just in new structure

**Example:**
```typescript
const salary = await prisma.categories.create({
  data: {
    name: 'Salary',
    // ... other fields (NO keywords field)
  }
});

// Create keywords separately
await prisma.category_keywords.createMany({
  data: [
    { category_id: salary.id, keyword: 'salary', source: 'manual' },
    { category_id: salary.id, keyword: 'wage', source: 'manual' },
    // ... etc
  ]
});
```

**Tasks:**
- [ ] Update seed file to remove `keywords` from category creation
- [ ] Add keyword creation after each category
- [ ] Test seed script creates categories and keywords correctly
- [ ] Verify all default categories are recreated with keywords in new table

### 5.2 Keyword Matching Engine

**Task 5.2.1: Implement Keyword Matching Service**

**File:** `src/lib/server/categorization/keywordMatcher.ts`

**Features:**
- Query all keywords from `category_keywords` table
- Match against transaction `description` and `merchantName`
- Case-insensitive matching
- Word boundary matching (avoid partial matches like "car" matching "careful")
- Handle multiple matches (prefer most specific category or first match)
- Return matched category ID or null

**Implementation:**
```typescript
interface KeywordMatchResult {
  categoryId: number;
  matchedKeyword: string;
  matchType: 'description' | 'merchant';
}

function matchKeywords(
  description: string,
  merchantName: string,
  keywords: Array<{ category_id: number; keyword: string }>
): KeywordMatchResult | null
```

**Tasks:**
- [ ] Create keyword matching service
- [ ] Implement case-insensitive word-boundary matching
- [ ] Test with various transaction descriptions
- [ ] Handle edge cases (special characters, multiple words, etc.)

### 5.3 AI Categorization Service

**Task 5.3.1: OpenAI API Integration**

**File:** `src/lib/server/categorization/aiCategorizer.ts`

**Features:**
- Send batches of transactions to OpenAI (10-20 per API call)
- Use structured outputs to get consistent response format
- Return category ID, confidence score, and suggested keywords (1-2 per transaction)
- Auto-add suggested keywords to `category_keywords` table
- Error handling and retries

**API Call Structure:**
- Model: `gpt-4` or `gpt-3.5-turbo` (configurable)
- Prompt: Include category list with descriptions, transaction details
- Response format: JSON array with `{ transactionId, categoryId, confidence, suggestedKeywords: [string] }`

**Environment Variables:**
- `OPENAI_API_KEY` - Required
- `OPENAI_MODEL` - Optional (default: "gpt-4")

**Tasks:**
- [ ] Create OpenAI service wrapper
- [ ] Design prompt for accurate categorization
- [ ] Implement structured output parsing
- [ ] Handle API errors and rate limits
- [ ] Implement retry logic
- [ ] Auto-add suggested keywords to database

**Task 5.3.2: Batch Processing Logic**

**File:** `src/lib/server/categorization/categorizationService.ts`

**Processing Flow:**
1. Server processes transactions in batches of 50
2. For each batch:
   - Filter out transactions with `is_category_manual = true` (skip these)
   - First pass: Keyword matching (fast, free)
   - Remaining uncategorized: Group into AI batches of 10-20
   - Send each AI batch to OpenAI in one API call
   - Process results and update database
   - Auto-add suggested keywords
3. Update progress after each server batch

**Tasks:**
- [ ] Create batch processing service
- [ ] Implement keyword matching first pass
- [ ] Group remaining transactions for AI batching
- [ ] Process AI batches sequentially
- [ ] Update transactions with category assignments
- [ ] Store suggested keywords automatically
- [ ] Track progress (processed, categorized, skipped, errors)

### 5.4 Categorization API Endpoints

**Task 5.4.1: POST /api/transactions/categorize**

**Purpose:** Start categorization process for all uncategorized transactions

**Request:**
```typescript
{
  // Optional: specific transaction IDs to categorize
  transactionIds?: number[];
  // If not provided, categorizes all uncategorized transactions
}
```

**Response:**
```typescript
{
  success: boolean;
  jobId: string; // For progress tracking
  totalTransactions: number;
  message: string;
}
```

**Tasks:**
- [ ] Create POST handler
- [ ] Validate request
- [ ] Start background processing (or return job ID)
- [ ] Return initial response

**Task 5.4.2: GET /api/transactions/categorize/progress**

**Purpose:** Get progress of categorization job

**Response:**
```typescript
{
  jobId: string;
  status: 'running' | 'completed' | 'error';
  progress: {
    total: number;
    processed: number;
    categorized: number;
    skipped: number; // manual assignments
    errors: number;
  };
  results?: Array<{
    transactionId: number;
    categoryId: number | null;
    method: 'keyword' | 'ai' | 'skipped';
    confidence?: number;
  }>;
  error?: string;
}
```

**Tasks:**
- [ ] Create GET handler
- [ ] Track progress in memory or database
- [ ] Return current status and progress
- [ ] Include results when completed

**Task 5.4.3: PUT /api/transactions/[id]/category**

**Purpose:** Manually assign or update transaction category

**Request:**
```typescript
{
  categoryId: number | null; // null to uncategorize
}
```

**Response:**
```typescript
{
  success: boolean;
  transaction: Transaction;
}
```

**Logic:**
- Set `category_id` to provided value
- Set `is_category_manual = true` (user override)
- Update `updated_at` timestamp

**Tasks:**
- [ ] Create PUT handler
- [ ] Validate category exists
- [ ] Update transaction
- [ ] Return updated transaction

### 5.5 Progress Tracking UI

**Task 5.5.1: Categorization Progress Page**

**File:** `src/routes/(protected)/categorize-transactions/+page.svelte`

**Features:**
- Start categorization button
- Real-time progress display:
  - Progress bar (processed / total)
  - Counts: Processed, Categorized, Skipped, Errors
  - Status: Running / Completed / Error
- Results table (when completed):
  - Transaction details
  - Assigned category
  - Method (keyword/AI)
  - Confidence score (if AI)
- Error display if any
- Link back to transactions page

**Tasks:**
- [ ] Create progress page component
- [ ] Implement start categorization button
- [ ] Poll progress endpoint (every 1-2 seconds)
- [ ] Display progress bar and counts
- [ ] Show results table when completed
- [ ] Handle errors gracefully
- [ ] Add loading states

### 5.6 Confidence-Based Review UI

**Task 5.6.1: Low Confidence Review Section**

**File:** `src/routes/(protected)/transactions/+page.svelte` or separate review page

**Features:**
- Filter transactions with low confidence (< 0.5) categorizations
- Display in "Needs review" section
- Show:
  - Transaction details
  - Suggested category (with confidence)
  - Approve button (keep category)
  - Reject button (change/uncategorize)
- Bulk actions: Approve all / Reject all

**Note:** We need to store confidence scores. Add field to transactions table:
```prisma
model transactions {
  // ... existing fields
  category_confidence Float? // Store AI confidence score
  // ... rest of fields
}
```

**Tasks:**
- [ ] Add `category_confidence` field to transactions schema
- [ ] Create migration
- [ ] Update categorization service to store confidence
- [ ] Create review UI component
- [ ] Implement approve/reject actions
- [ ] Add bulk actions

### 5.7 Display Categories in Transaction List

**Task 5.7.1: Update Transactions API to Include Category Data**

**File:** `src/routes/api/transactions/+server.ts`

**Update GET handler:**
- Include category relation in Prisma query
- Return category data: `{ id, name, color, icon }` for each transaction

**Tasks:**
- [ ] Update Prisma query to include category relation
- [ ] Serialize category data in response
- [ ] Test API response

**Task 5.7.2: Display Category Badges in Transaction List**

**File:** `src/routes/(protected)/transactions/+page.svelte`

**Features:**
- Show category badge/indicator for each transaction
- Display: Color dot/icon + category name
- Show "Uncategorized" badge for transactions without category
- Show confidence indicator for low confidence (< 0.5)
- Use DaisyUI badge component

**Tasks:**
- [ ] Update transaction list to display categories
- [ ] Add category badge component
- [ ] Style with colors and icons
- [ ] Show "Uncategorized" state
- [ ] Add confidence indicators

### 5.8 Category Picker Component

**Task 5.8.1: Create CategoryPicker Component**

**File:** `src/lib/components/CategoryPicker.svelte`

**Features:**
- Dropdown/select with categories
- Group by top-level groups (income, essential, lifestyle, financial, other)
- Show color and icon for each category
- Filter out parent categories that have subcategories (organizational only)
- Show subcategories grouped under parent (visual organization)
- Search/filter capability
- Show "Uncategorized" option
- Optional: Allow creating new category inline

**Props:**
```typescript
{
  selectedCategoryId?: number | null;
  onSelect: (categoryId: number | null) => void;
  showUncategorized?: boolean; // default: true
  allowCreate?: boolean; // default: false
  filterByGroup?: string; // optional: filter to specific group
}
```

**Tasks:**
- [ ] Create component
- [ ] Fetch categories from API
- [ ] Filter out parent categories with subcategories
- [ ] Display dropdown with colors/icons
- [ ] Group subcategories under parent (visual organization)
- [ ] Implement search
- [ ] Handle selection
- [ ] Optional: Inline category creation

**Task 5.8.2: Inline Category Editing in Transaction List**

**File:** `src/routes/(protected)/transactions/+page.svelte`

**Features:**
- Click on category badge to open picker
- Update transaction category via API
- Show loading state during update
- Refresh transaction list after update
- Set `is_category_manual = true` when user manually assigns

**Tasks:**
- [ ] Add click handler to category badges
- [ ] Integrate CategoryPicker component
- [ ] Call PUT /api/transactions/[id]/category
- [ ] Handle loading and error states
- [ ] Refresh data after update

---

## Implementation Order

### Step 1: Default Categories (Foundation)
1. Define default categories list
2. Update seed file with defaults
3. Test seed script
4. Verify defaults are created

### Step 2: Category API (Backend)
1. Create validation schemas
2. Implement GET /api/categories
3. Implement POST /api/categories
4. Implement GET /api/categories/[id]
5. Implement PUT /api/categories/[id]
6. Implement DELETE /api/categories/[id]
7. Implement PUT /api/categories/[id]/preferences
8. Test all endpoints

### Step 3: Category Management UI (Frontend)
1. Create categories list page
2. Create category picker component
3. Create create/edit category form
4. Integrate with API
5. Add enable/disable functionality
6. Add reordering functionality

### Step 4: Automatic Categorization (NEW PRIORITY)
1. Database schema updates (move keywords to separate table)
2. Keyword matching engine
3. AI categorization service (OpenAI integration)
4. Batch processing API endpoints
5. Progress tracking UI
6. Confidence-based review UI

### Step 5: Display and Manual Editing
1. Update transaction list to show categories
2. Create category picker component
3. Add inline category editing
4. Test end-to-end flow

---

## Database Considerations

### Schema Updates Needed

**Add `group` field to `categories` table:**
```prisma
model categories {
  // ... existing fields
  group String? // "income", "essential", "lifestyle", "financial", "other"
  // ... rest of fields
}
```

**Migration:**
- Add `group` column (nullable String)
- Set default groups for all existing categories
- Set default value to `"other"` for new categories (custom categories)

**Add `category_confidence` field to `transactions` table:**
```prisma
model transactions {
  // ... existing fields
  category_confidence Float? // Store AI confidence score (0.0 - 1.0)
  category_keywords   category_keywords[] // Relation for AI-suggested keywords
  // ... rest of fields
}
```

**Migration:**
- Add `category_confidence` column (nullable Float)
- Used to identify low-confidence categorizations for user review
- Add relation to `category_keywords` for tracking which transaction suggested keywords

### Indexes
- Already have indexes on `user_id, category_id` in `user_categories`
- Consider index on `is_default` for faster system category queries
- Consider index on `created_by` for user category queries
- Consider index on `group` for filtering by group

### Constraints
- `name` is unique globally (works for system categories)
- For user categories, we check uniqueness manually (user's categories only)
- `user_categories` has unique constraint on `[user_id, category_id]`
- `group` should be one of: `"income"`, `"essential"`, `"lifestyle"`, `"financial"`, `"other"` (enforced in application code or via enum)

### Data Integrity
- When deleting user category, consider:
  - Reassign transactions to "Uncategorized"
  - Or prevent deletion if transactions exist
- System categories cannot be deleted
- "Uncategorized" cannot be disabled
- Subcategories inherit parent's group (enforced in application code)
- Custom categories default to `group: "other"` but can be changed by user

---

## Testing Checklist

### Default Categories
- [ ] All default categories are created on seed
- [ ] "Uncategorized" always exists
- [ ] Defaults have correct properties

### API Endpoints
- [ ] GET /api/categories returns system + user categories
- [ ] POST /api/categories creates user category
- [ ] Name uniqueness is enforced
- [ ] PUT /api/categories/[id] updates user category
- [ ] Cannot edit system categories
- [ ] DELETE /api/categories/[id] deletes user category
- [ ] Cannot delete if transactions exist (or reassigns)
- [ ] Preferences endpoint works correctly

### UI
- [ ] Categories list displays correctly
- [ ] Create category form works
- [ ] Edit category form works
- [ ] Delete category works with confirmation
- [ ] Enable/disable toggle works
- [ ] Category picker component works
- [ ] Search/filter works

### Automatic Categorization
- [ ] Keyword matching works correctly
- [ ] AI categorization service integrates with OpenAI
- [ ] Batch processing handles large transaction sets
- [ ] Progress tracking updates in real-time
- [ ] Suggested keywords are auto-added to categories
- [ ] Low confidence categorizations appear in review section
- [ ] User can approve/reject low confidence categorizations

### Integration
- [ ] Categories appear in transaction list with badges
- [ ] Category picker component works
- [ ] Inline category editing works
- [ ] Manual category assignment sets `is_category_manual: true`
- [ ] Confidence scores are stored and displayed

---

## Future Enhancements (Post-MVP)

1. **Category Templates**: Pre-defined category sets for different user types
2. **Category Import/Export**: Share category configurations
3. **Category Analytics**: Spending by category, trends
4. **Smart Suggestions**: AI-suggested categories based on transactions
5. **Category Rules**: Auto-assign based on merchant, amount, etc.
6. **Category Budgets**: Set spending limits per category
7. **Category Groups**: Group categories for reporting (e.g., "Essential Expenses")

---

## Notes

- System categories are shared across all users
- User categories are private to each user
- Keywords are stored in `category_keywords` table (not in categories array)
- Keywords are case-insensitive for matching
- AI-suggested keywords are automatically added to categories (no manual approval needed)
- Color and icon are optional but recommended for better UX
- Parent categories enable hierarchical organization (future feature)
- `user_categories` table manages user preferences and visibility
- All category operations require authentication
- Manual category assignments (`is_category_manual = true`) are never re-categorized automatically
- AI categorization uses batch processing: 50 transactions per server batch, 10-20 transactions per AI API call

