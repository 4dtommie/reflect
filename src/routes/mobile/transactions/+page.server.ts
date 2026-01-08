import { db } from '$lib/server/db';
import type { PageServerLoad } from './$types';
import { applyDateOffset, getOffsetFromUrl } from '$lib/server/utils/dateShifter';

// Extract time from description field (e.g., "22:29" pattern)
// Kept for backward compatibility or if needed later, but usage is changing.
function extractTimeFromDescription(description: string | null): string | null {
    if (!description) return null;
    const timeMatch = description.match(/\b(\d{1,2}:\d{2})\b/);
    return timeMatch ? timeMatch[1] : null;
}

export const load: PageServerLoad = async ({ locals, url }) => {
    const userId = locals.user?.id;
    const manualOffset = getOffsetFromUrl(url); // Additional offset from UI controls

    if (!userId) {
        return { groupedTransactions: [], baseOffset: 0 };
    }

    // Find the latest transaction date
    const latestTransaction = await db.transactions.findFirst({
        where: { user_id: userId },
        orderBy: { date: 'desc' },
        select: { date: true }
    });

    // Calculate base offset: shift so latest transaction is 30 days in the future
    let baseOffset = 0;
    if (latestTransaction) {
        const latestDate = new Date(latestTransaction.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        latestDate.setHours(0, 0, 0, 0);

        const diffDays = Math.floor((today.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24));
        baseOffset = diffDays + 30;
    }

    // cutoffDate calculation for "Moving Curtain" logic:
    // OriginalDate <= RealToday - baseOffset + manualOffset
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - baseOffset + manualOffset);
    cutoffDate.setHours(23, 59, 59, 999);

    // Fetch transactions (limit to 100 to cover enough history)
    const transactions = await db.transactions.findMany({
        where: {
            user_id: userId,
            date: { lte: cutoffDate }
        },
        orderBy: { date: 'desc' },
        take: 100,
        include: {
            categories: true,
            merchants: true
        }
    });

    // Grouping Logic
    const groupedMap = new Map<string, {
        dateLabel: string;
        dateObj: Date;
        totalAmount: number;
        transactions: any[];
    }>();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Simulated Today for labelling "Vandaag"/"Gisteren" correctly
    // If ManualOffset = 0, SimulatedToday = RealToday.
    // If ManualOffset = 1, SimulatedToday = RealToday + 1.
    const simulatedToday = new Date(today);
    simulatedToday.setDate(simulatedToday.getDate() + manualOffset);

    const simulatedYesterday = new Date(simulatedToday);
    simulatedYesterday.setDate(simulatedYesterday.getDate() - 1);

    const months = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

    for (const t of transactions) {
        // Apply ONLY base offset for display (Fixed World)
        const originalDate = new Date(t.date);
        const date = applyDateOffset(originalDate, baseOffset);

        date.setHours(0, 0, 0, 0); // Normalize time for grouping
        const dateKey = date.toISOString().split('T')[0];

        let group = groupedMap.get(dateKey);

        if (!group) {
            // Determine Label
            let label = '';
            if (date.getTime() === simulatedToday.getTime()) {
                label = 'Vandaag';
            } else if (date.getTime() === simulatedYesterday.getTime()) {
                label = 'Gisteren';
            } else {
                // E.g., "14 april"
                label = `${date.getDate()} ${months[date.getMonth()]}`;
            }

            group = {
                dateLabel: label,
                dateObj: date,
                totalAmount: 0,
                transactions: []
            };
            groupedMap.set(dateKey, group);
        }

        // Add to group
        const amount = Number(t.amount);
        group.totalAmount += t.is_debit ? -amount : amount;

        // Map transaction data
        group.transactions.push({
            id: t.id,
            merchant: t.merchants?.name || t.cleaned_merchant_name || t.merchantName,
            amount: amount,
            isDebit: t.is_debit,
            category: t.categories?.name || 'Overig',
            categoryIcon: t.categories?.icon || null,
        });
    }

    // Convert map to array and sort by date descending
    const groupedTransactions = Array.from(groupedMap.values())
        .sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime())
        .map(g => ({
            ...g,
            formattedTotal: formatDailyTotal(g.totalAmount)
        }));

    // --- Upcoming Transactions Logic ---
    // Fetch upcoming recurring transactions (those masked by the "Time Curtain" as future)
    // We look for actual transactions that are > cutoffDate and are recurring.
    const rawUpcoming = await db.transactions.findMany({
        where: {
            user_id: userId,
            date: { gt: cutoffDate }, // Strictly after simulated today
            recurring_transaction_id: { not: null } // Only recurring ones
        },
        orderBy: { date: 'asc' }, // Closest future date first
        take: 2,
        include: {
            categories: true,
            merchants: true
        }
    });

    const upcomingTransactions = rawUpcoming.map(t => {
        const originalDate = new Date(t.date);
        const displayedCurrentDate = applyDateOffset(originalDate, baseOffset);

        // Calculate "over X dagen"
        // diff = displayedDate - simulatedToday
        // Note: simulatedToday is normalized to 00:00:00. 
        // We should normalize displayedCurrentDate to 00:00:00 for accurate day diff.
        const dDate = new Date(displayedCurrentDate);
        dDate.setHours(0, 0, 0, 0);

        const diffTime = dDate.getTime() - simulatedToday.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
            id: t.id,
            merchant: t.merchants?.name || t.cleaned_merchant_name || t.merchantName,
            amount: Number(t.amount),
            isDebit: t.is_debit,
            category: t.categories?.name || 'Overig',
            categoryIcon: t.categories?.icon || null,
            daysUntil: diffDays,
            daysLabel: diffDays === 1 ? 'morgen' : `over ${diffDays} dagen`
        };
    }).reverse();

    return { groupedTransactions, upcomingTransactions, baseOffset };
};

function formatDailyTotal(amount: number): string {
    const abs = Math.abs(amount);
    const prefix = amount < 0 ? '- ' : amount > 0 ? '+ ' : '';
    return `${prefix}€ ${Math.round(abs)}`;
}
