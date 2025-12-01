# Recurring Transaction Detection Tasks

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

- [ ] **Advanced Detection Logic** <!-- id: 12 -->
    - [x] Implement `detectSalary` <!-- id: 13a -->
    - [x] Implement `detectOtherSalary` (Covered by `detectIncome`) <!-- id: 13b -->
    - [x] Implement `detectByInterval` (monthly/weekly) for general expenses <!-- id: 14 -->
    - [ ] *Milestone: Verify Salary and Rent detection* <!-- id: 15 -->
    - [x] Add candidate deduplication/merging when multiple rules flag the same merchant <!-- id: 22 -->

- [ ] **AI Detection** <!-- id: 16 -->
    - [ ] Implement `detectByAI` using Gemini <!-- id: 17 -->

- [ ] **UI Refinement** <!-- id: 18 -->
    - [x] Group results by type (Salary, Subscription, etc.) <!-- id: 19 -->
    - [ ] Add "Confirm" / "Ignore" actions <!-- id: 20 -->
    - [ ] Save confirmed items to `RecurringTransaction` table <!-- id: 21 -->
    - [ ] *Enhancement: When confirming, update all linked transactions to use the same merchant/cleaned name* <!-- id: 26 -->
    - [x] Fix hero title encoding issue in `recurring/detect/+page.svelte` <!-- id: 23 -->
    - [ ] Surface API errors / empty states clearly in the detection view <!-- id: 24 -->
    - [x] Use the `Amount` component (or consistent currency formatting) for summary totals <!-- id: 25 -->
