
export interface Transaction {
    id: number;
    date: Date | string;
    amount: number;
    merchantName?: string | null;
    description?: string | null;
    iban?: string | null;
    [key: string]: any; // Allow other properties
}

/**
 * Identifies internal transfers between accounts.
 * Returns a Set of transaction IDs that are part of an internal transfer pair.
 *
 * Logic:
 * 1. Groups transactions by absolute amount.
 * 2. Within each amount group, looks for pairs with opposite signs (one debit, one credit).
 * 3. Checks if the pair dates are within a configurable window (default 3 days).
 */
export function identifyInternalTransfers(
    transactions: Transaction[],
    dateWindowDays = 3
): Set<number> {
    const transferIds = new Set<number>();
    if (!transactions || transactions.length < 2) return transferIds;

    // Helper to get absolute amount rounded to 2 decimals to avoid float issues
    const getAbsAmount = (amount: number) => Math.round(Math.abs(amount) * 100);

    // Group by absolute amount
    const byAmount = new Map<number, Transaction[]>();

    for (const t of transactions) {
        const abs = getAbsAmount(t.amount);
        if (abs === 0) continue; // Ignore zero amount transactions

        if (!byAmount.has(abs)) {
            byAmount.set(abs, []);
        }
        byAmount.get(abs)!.push(t);
    }

    // Process each group
    for (const [_, group] of byAmount) {
        if (group.length < 2) continue;

        // Sort by date
        group.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // We need to pair them up. Simple greedy approach:
        // Iterate and try to find a match for each unmatched transaction.
        const matchedIndices = new Set<number>();

        for (let i = 0; i < group.length; i++) {
            if (matchedIndices.has(i)) continue;

            const current = group[i];
            const currentDate = new Date(current.date).getTime();

            // Look for a match in subsequent transactions
            for (let j = i + 1; j < group.length; j++) {
                if (matchedIndices.has(j)) continue;

                const candidate = group[j];
                const candidateDate = new Date(candidate.date).getTime();
                const diffDays = Math.abs(candidateDate - currentDate) / (1000 * 60 * 60 * 24);

                if (diffDays > dateWindowDays) {
                    // Since sorted by date, no further transactions will match this one
                    // (assuming we are looking for close dates)
                    // However, we effectively want any pair within window.
                    // If j is too far from i, it might still match i+1, so we just break for i
                    break;
                }

                // Check for opposite signs (one is positive, one is negative)
                // We already know absolute amounts are equal
                if ((current.amount > 0 && candidate.amount < 0) ||
                    (current.amount < 0 && candidate.amount > 0)) {

                    // Found a match!
                    transferIds.add(current.id);
                    transferIds.add(candidate.id);
                    matchedIndices.add(i);
                    matchedIndices.add(j);
                    break; // Move to next i
                }
            }
        }
    }

    return transferIds;
}
