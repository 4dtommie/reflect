# Recurring Transaction Detection Tasks

- [ ] **Database Schema Updates** <!-- id: 0 -->
    - [ ] Define `RecurringTransaction` model in `prisma/schema.prisma` <!-- id: 1 -->
    - [ ] Add relation to `transactions` model <!-- id: 2 -->
    - [ ] Run `npx prisma db push` (or migrate) <!-- id: 3 -->

- [ ] **Backend Service & API (Basic)** <!-- id: 4 -->
    - [ ] Create `src/lib/server/recurring/subscriptionProviders.ts` with known list <!-- id: 5 -->
    - [ ] Create `src/lib/server/recurring/recurringDetectionService.ts` with `detectByKnownList` <!-- id: 6 -->
    - [ ] Create `src/routes/api/recurring/detect/+server.ts` endpoint <!-- id: 7 -->

- [ ] **Frontend Integration (Basic)** <!-- id: 8 -->
    - [ ] Connect "Start Detection" button in `recurring/detect/+page.svelte` to API <!-- id: 9 -->
    - [ ] Display raw/simple list of detected items <!-- id: 10 -->
    - [ ] *Milestone: Verify "Spotify" detection in UI* <!-- id: 11 -->

- [ ] **Advanced Detection Logic** <!-- id: 12 -->
    - [ ] Implement `detectSalary` and `detectOtherSalary` <!-- id: 13 -->
    - [ ] Implement `detectByInterval` (monthly/weekly) <!-- id: 14 -->
    - [ ] *Milestone: Verify Salary and Rent detection* <!-- id: 15 -->

- [ ] **AI Detection** <!-- id: 16 -->
    - [ ] Implement `detectByAI` using Gemini <!-- id: 17 -->

- [ ] **UI Refinement** <!-- id: 18 -->
    - [ ] Group results by type (Salary, Subscription, etc.) <!-- id: 19 -->
    - [ ] Add "Confirm" / "Ignore" actions <!-- id: 20 -->
    - [ ] Save confirmed items to `RecurringTransaction` table <!-- id: 21 -->
