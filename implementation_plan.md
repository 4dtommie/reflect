# Optimization and Robustness Plan for Transaction Statistics

## Problem Analysis
The user reported a "categorized %" of 434%. This is caused by a logic error in `src/routes/api/transactions/+server.ts`.

1.  **The Denominator**: The code uses `totalCount` (line 51) as the denominator for the percentage calculation. This variable represents the count of transactions *matching the current filters* (e.g., `startDate` = last 6 months).
2.  **The Numerator**: The code calculates the numerator (categorized count) using a fresh database query that counts *all* categorized transactions for the user, ignoring the current filters (lines 243-249).

**Result**: If a user has 1000 transactions all-time (all categorized) but only 100 in the last 6 months, the calculation becomes `1000 / 100 * 100 = 1000%`.

## Proposed Fixes

### 1. Fix Logic Error (Robustness)
Ensure the numerator and denominator operate on the same scope. Since the `stats` object in the API response generally returns global stats (e.g., `totalTransactions` at line 250 is global), we should make the percentage global as well.

**Change**:
- Calculate `globalTotalTransactions` (all-time).
- Calculate `globalCategorizedCount` (all-time).
- Calculate `categorizedPercentage` using these two values.

### 2. Code Optimization (Performance & Maintainability)
The current `api/transactions/+server.ts` performs redundant database queries and calculations.

**Optimizations**:
1.  **Remove Redundant Queries**:
    - The code currently runs the "count categorized" query twice (once for `categorizedCount`, once inside `categorizedPercentage`). We should run it once and reuse the value.
    - We are already fetching *all* user transactions (line 124) to calculate monthly charts. We could potentially derive the counts from this in-memory array to save DB calls, but `count(*)` is often faster in the DB. However, since we *already* pay the cost of fetching all rows for the charts, iterating them to count categorized vs uncategorized is effectively free and saves 3-4 DB roundtrips.
    
    *Decision*: Since we fetch `allTransactionsForStats` (select: date, amount, is_debit, categories), we can check `categories` to see if it's categorized. This allows us to compute `globalTotal`, `globalCategorized`, and `topUncategorizedMerchants` (maybe) without extra queries.
    *Note*: `topUncategorizedMerchants` uses a `groupBy` which is efficient in SQL. Doing that in memory in JS might be slower if there are many transactions, but likely fine for <10,000. Let's stick to optimizing the counts first.

2.  **Variable Renaming**:
    - Rename `totalCount` (line 51) to `filteredTotalCount` to clearly distinguish it from the global total.

3.  **Type Safety**:
    - Remove `(db as any)` casts where possible by ensuring the Prisma client is correctly typed or imports are correct.

## Implementation Steps

1.  **Modify `src/routes/api/transactions/+server.ts`**:
    - Rename `totalCount` to `filteredTotalCount`.
    - Calculate `globalTotalTransactions` and `globalCategorizedCount` efficiently.
    - Reuse these variables for the `stats` object.
    - Ensure `categorizedPercentage` never exceeds 100%.

2.  **Verify Dashboard Consistency**:
    - Ensure `src/routes/(protected)/dashboard/+page.server.ts` uses the same logic (it currently seems correct, using all-time stats).

## Example Code Structure

```typescript
// Current
categorizedPercentage: totalCount > 0 ? (await (db as any).transactions.count({ ... }) / Number(totalCount)) * 100 : 0

// Proposed
const globalTotal = await db.transactions.count({ where: { user_id: userId } });
const globalCategorized = await db.transactions.count({ 
    where: { 
        user_id: userId, 
        category_id: { not: null },
        categories: { name: { notIn: ['Uncategorized', 'Niet gecategoriseerd'] } }
    } 
});

// ... inside return
stats: {
    totalTransactions: globalTotal,
    categorizedCount: globalCategorized,
    categorizedPercentage: globalTotal > 0 ? (globalCategorized / globalTotal) * 100 : 0,
    // ...
}
```
