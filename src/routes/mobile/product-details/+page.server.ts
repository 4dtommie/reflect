import { db } from '$lib/server/db';
import type { PageServerLoad } from './$types';
import { applyDateOffset, getOffsetFromUrl } from '$lib/server/utils/dateShifter';

export const load: PageServerLoad = async ({ locals, url }) => {
    const userId = locals.user?.id;
    const manualOffset = getOffsetFromUrl(url);

    if (!userId) {
        return { groupedTransactions: [], upcomingTransactions: [], baseOffset: 0 };
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
        baseOffset = diffDays + 26;
    }

    // cutoffDate calculation for "Moving Curtain" logic
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - baseOffset + manualOffset);
    cutoffDate.setHours(23, 59, 59, 999);

    // Fetch transactions
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
        totalIncoming: number;
        totalOutgoing: number;
        incomingCount: number;
        outgoingCount: number;
        transactions: any[];
    }>();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const simulatedToday = new Date(today);
    simulatedToday.setDate(simulatedToday.getDate() + manualOffset);

    const simulatedYesterday = new Date(simulatedToday);
    simulatedYesterday.setDate(simulatedYesterday.getDate() - 1);

    const months = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

    for (const t of transactions) {
        const originalDate = new Date(t.date);
        const date = applyDateOffset(originalDate, baseOffset);

        date.setHours(0, 0, 0, 0);
        const dateKey = date.toISOString().split('T')[0];

        let group = groupedMap.get(dateKey);

        if (!group) {
            let label = '';
            if (date.getTime() === simulatedToday.getTime()) {
                label = 'Vandaag';
            } else if (date.getTime() === simulatedYesterday.getTime()) {
                label = 'Gisteren';
            } else {
                label = `${date.getDate()} ${months[date.getMonth()]}`;
            }

            group = {
                dateLabel: label,
                dateObj: date,
                totalAmount: 0,
                totalIncoming: 0,
                totalOutgoing: 0,
                incomingCount: 0,
                outgoingCount: 0,
                transactions: []
            };
            groupedMap.set(dateKey, group);
        }

        const amount = Number(t.amount);
        const signedAmount = t.is_debit ? -amount : amount;
        group.totalAmount += signedAmount;

        if (signedAmount > 0) {
            group.totalIncoming += signedAmount;
            group.incomingCount++;
        }
        if (signedAmount < 0) {
            group.totalOutgoing += signedAmount;
            group.outgoingCount++;
        }

        group.transactions.push({
            id: t.id,
            merchant: t.merchants?.name || t.cleaned_merchant_name || t.merchantName,
            amount: amount,
            isDebit: t.is_debit,
            category: t.categories?.name || 'Overig',
            categoryIcon: t.categories?.icon || null,
        });
    }

    const groupedTransactions = Array.from(groupedMap.values())
        .sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime())
        .map(g => ({
            ...g,
            formattedTotal: formatDailyTotal(g.totalAmount),
            formattedIncoming: formatDailyTotal(g.totalIncoming),
            formattedOutgoing: formatDailyTotal(g.totalOutgoing),
            incomingCount: g.incomingCount,
            outgoingCount: g.outgoingCount
        }));

    // Upcoming Transactions
    const rawUpcoming = await db.transactions.findMany({
        where: {
            user_id: userId,
            date: { gt: cutoffDate },
            recurring_transaction_id: { not: null }
        },
        orderBy: { date: 'asc' },
        take: 2,
        include: {
            categories: true,
            merchants: true,
            recurring_transaction: true
        }
    });

    const upcomingTransactions = rawUpcoming.map(t => {
        const originalDate = new Date(t.date);
        const displayedCurrentDate = applyDateOffset(originalDate, baseOffset);

        const dDate = new Date(displayedCurrentDate);
        dDate.setHours(0, 0, 0, 0);

        const diffTime = dDate.getTime() - simulatedToday.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
            id: t.id,
            recurringId: t.recurring_transaction_id,
            merchant: t.merchants?.name || t.cleaned_merchant_name || t.merchantName,
            amount: Number(t.amount),
            isDebit: t.is_debit,
            category: t.categories?.name || 'Overig',
            categoryIcon: t.categories?.icon || null,
            categoryColor: t.categories?.color || null,
            interval: t.recurring_transaction?.interval || 'Maandelijks',
            status: t.recurring_transaction?.status || 'active',
            daysUntil: diffDays,
            daysLabel: diffDays === 1 ? 'morgen' : `over ${diffDays} dagen`,
            nextDate: dDate.toISOString()
        };
    }).reverse();

    return { groupedTransactions, upcomingTransactions, baseOffset };
};

function formatDailyTotal(amount: number): string {
    const abs = Math.abs(amount);
    const prefix = amount < 0 ? '- ' : amount > 0 ? '+ ' : '';
    return `${prefix}€ ${Math.round(abs)}`;
}
