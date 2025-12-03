# Recurring Transaction Detection Tasks

## Completed

- [x] **Database Schema Updates** <!-- id: 0 -->
    - [x] Define `RecurringTransaction` model in `prisma/schema.prisma` <!-- id: 1 -->
    - [x] Add relation to `transactions` model <!-- id: 2 -->
    - [x] Run `npx prisma db push` (or migrate) <!-- id: 3 -->

- [x] **Backend Service & API (Basic)** <!-- id: 4 -->
    - [x] Create `src/lib/server/recurring/subscriptionProviders.ts` with known list <!-- id: 5 -->
    - [x] Create `src/lib/server/recurring/recurringDetectionService.ts` with `detectByKnownList` <!-- id: 6 -->
    - [x] Create `src/routes/api/recurring/detect/+server.ts` endpoint <!-- id: 7 -->

- [x] **Frontend Integration (Basic)** <!-- id: 8 -->
    - [x] Connect "Start Detection" button in `recurring/detect/+page.svelte` to API <!-- id: 9 -->
    - [x] Display raw/simple list of detected items <!-- id: 10 -->
    - [x] *Milestone: Verify "Spotify" detection in UI* <!-- id: 11 -->

- [x] **Advanced Detection Logic** <!-- id: 12 -->
    - [x] Implement `detectSalary` <!-- id: 13a -->
    - [x] Implement `detectOtherSalary` (Covered by `detectIncome`) <!-- id: 13b -->
    - [x] Implement `detectByInterval` (monthly/weekly) for general expenses <!-- id: 14 -->
    - [x] *Milestone: Core detection working well* <!-- id: 15 -->
    - [x] Add candidate deduplication/merging when multiple rules flag the same merchant <!-- id: 22 -->

- [x] **Variable Spending Service (NEW - Dec 2025)** <!-- id: 26 -->
    - [x] Separate variable spending from fixed recurring detection <!-- id: 27 -->
    - [x] Create `src/lib/server/recurring/variableSpendingService.ts` <!-- id: 28 -->
    - [x] Group by CATEGORY instead of merchant <!-- id: 29 -->
    - [x] Create `GET /api/variable-spending` endpoint <!-- id: 30 -->
    - [x] Update `POST /api/recurring/detect` to call both services <!-- id: 31 -->
    - [x] Strip variable_cost logic from RecurringDetectionService <!-- id: 32 -->

## In Progress

- [ ] **UI Refinement** <!-- id: 18 -->
    - [x] Group results by type (Salary, Subscription, etc.) <!-- id: 19 -->
    - [x] Fix hero title encoding issue in `recurring/detect/+page.svelte` <!-- id: 23 -->
    - [ ] Surface API errors / empty states clearly in the detection view <!-- id: 24 -->
    - [x] Use the `Amount` component (or consistent currency formatting) for summary totals <!-- id: 25 -->
    - [ ] Create Variable Spending UI component <!-- id: 33 -->
    - [ ] Show category breakdown with top merchants <!-- id: 34 -->

## Backlog / Future

- [ ] **AI Detection** <!-- id: 16 -->
    - [ ] Implement `detectByAI` using Gemini <!-- id: 17 -->

- [ ] **Database: Category Spending Type Field** <!-- id: 35 -->
    - [ ] Add `spending_type` enum to `categories` table (fixed/variable/exclude) <!-- id: 36 -->
    - [ ] Create migration <!-- id: 37 -->
    - [ ] Update seed data with spending types <!-- id: 38 -->
    - [ ] Update VariableSpendingService to read from DB instead of hardcoded list <!-- id: 39 -->
    - [ ] Update RecurringDetectionService to use DB field <!-- id: 40 -->

- [ ] **Category-Specific Thresholds** <!-- id: 41 -->
    - [ ] Define expected frequency per category (daily/weekly/monthly) <!-- id: 42 -->
    - [ ] Define typical amount ranges per category <!-- id: 43 -->
    - [ ] Adjust confidence scoring based on category patterns <!-- id: 44 -->

- [ ] **Variable Spending Persistence** <!-- id: 45 -->
    - [ ] Create `variable_spending_patterns` table <!-- id: 46 -->
    - [ ] Store calculated patterns for caching <!-- id: 47 -->
    - [ ] Track trends over time <!-- id: 48 -->

- [ ] **Budget Integration** <!-- id: 49 -->
    - [ ] Allow category budgets <!-- id: 50 -->
    - [ ] Show progress (€145/€200) <!-- id: 51 -->
    - [ ] Budget alerts when approaching limit <!-- id: 52 -->

- [ ] **Trend Analysis** <!-- id: 53 -->
    - [ ] Month-over-month changes <!-- id: 54 -->
    - [ ] Seasonal patterns detection <!-- id: 55 -->
    - [ ] Anomaly detection (unusual spending) <!-- id: 56 -->
