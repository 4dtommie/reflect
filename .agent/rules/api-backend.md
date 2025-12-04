## API/Backend
- Validate all inputs with Zod schemas
- Return consistent JSON responses
- Use proper HTTP status codes
- Check authentication before protected routes
- Handle edge cases (null, undefined, empty arrays)

## Architecture: Service Layer Pattern

### Overview
Use a service layer pattern for shared business logic. This avoids code duplication between API routes and page loaders.

### Structure
\\\
src/lib/server/
  recurring/
    recurringService.ts      # Core recurring transaction logic
    balanceCalculator.ts     # NetBalanceWidget data calculation
    variableSpendingService.ts # Variable spending detection
  categorization/
    categorizationService.ts # Categorization business logic
  ...
\\\

### Guidelines

1. **Service Layer** (\lib/server/*/\)
   - Contains reusable business logic
   - Direct database access via Prisma
   - Export both class instances and utility functions
   - Used by both API routes and page loaders

2. **API Routes** (\outes/api/*/+server.ts\)
   - Thin wrappers around service layer
   - Handle authentication, validation, and HTTP responses
   - Used by client-side code (fetch from browser)
   - Keep logic minimal - delegate to services

3. **Page Loaders** (\outes/**/+page.server.ts\)
   - Import and call service functions directly
   - NO internal fetch() calls to own API routes
   - Direct database access is fine via services
   - Return typed data for pages

4. **Client Components** (\outes/**/+page.svelte\, \lib/components/\)
   - Use fetch() to call API routes for mutations
   - Receive data via \data\ prop from page loaders
   - No direct database access

### Example Flow
\\\
Dashboard Page:
  +page.server.ts  calls calculateBalanceData()  returns balanceData
  +page.svelte  receives data.balanceData  renders NetBalanceWidget

API (for client mutations):
  /api/recurring DELETE  calls recurringService.deleteAllRecurring()
\\\

### Benefits
- Single source of truth for business logic
- Efficient: no HTTP overhead in server loaders
- Type-safe across the stack
- Easier testing and maintenance
