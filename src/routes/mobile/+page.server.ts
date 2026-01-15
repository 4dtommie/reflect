import { db } from '$lib/server/db';
import type { PageServerLoad } from './$types';
import { applyDateOffset, getOffsetFromUrl } from '$lib/server/utils/dateShifter';

// Extract time from description field (e.g., "22:29" pattern)
function extractTimeFromDescription(description: string | null): string | null {
    if (!description) return null;
    const timeMatch = description.match(/\b(\d{1,2}:\d{2})\b/);
    return timeMatch ? timeMatch[1] : null;
}

// Format date as "14 januari"
function formatDate(date: Date): string {
    const months = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
    return `${date.getDate()} ${months[date.getMonth()]}`;
}

export const load: PageServerLoad = async ({ locals, url }) => {
    const userId = locals.user?.id;
    const manualOffset = getOffsetFromUrl(url); // Additional offset from UI controls

    if (!userId) {
        return { transactions: [], baseOffset: 0, userName: 'Reflect' };
    }

    const user = await db.user.findUnique({
        where: { id: userId },
        select: { username: true }
    });

    const userName = user?.username || 'Peter';

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

        // Days difference between today and latest transaction
        const diffDays = Math.floor((today.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24));
        // Add 30 days so the latest transaction appears 30 days from now
        baseOffset = diffDays + 26; // Shifted 4 days back so salaries appear on 24th
    }

    // cutoffDate calculation for "Moving Curtain" logic
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - baseOffset + manualOffset);
    cutoffDate.setHours(23, 59, 59, 999);

    // simulatedToday represents "now" in the original data timeline
    // baseOffset = diffDays + 30, so we add 30 back to get the actual "present" in simulation
    const simulatedToday = new Date();
    simulatedToday.setDate(simulatedToday.getDate() - baseOffset + 30 + manualOffset);
    simulatedToday.setHours(0, 0, 0, 0);

    const [recentTransactions, rawAankomend, upcomingTransactionLinks] = await Promise.all([
        db.transactions.findMany({
            where: {
                user_id: userId,
                date: { lte: cutoffDate }
            },
            orderBy: { date: 'desc' },
            take: 3,
            include: {
                categories: true,
                merchants: true
            }
        }),
        db.recurringTransaction.findMany({
            where: {
                user_id: userId,
                status: 'active',
                next_expected_date: { gte: cutoffDate }
            },
            orderBy: { next_expected_date: 'asc' },
            include: {
                merchants: true,
                categories: true
            }
        }),
        // Get the most recent transaction for each recurring transaction for linking
        db.transactions.findMany({
            where: {
                user_id: userId,
                recurring_transaction_id: { not: null }
            },
            orderBy: { date: 'desc' },
            distinct: ['recurring_transaction_id'],
            select: {
                id: true,
                recurring_transaction_id: true
            }
        })
    ]);

    // Create a map of recurring transaction ID to actual transaction ID
    const recurringToTransactionMap = new Map<number, number>();
    for (const t of upcomingTransactionLinks) {
        if (t.recurring_transaction_id) {
            recurringToTransactionMap.set(t.recurring_transaction_id, t.id);
        }
    }

    // Map and filter upcoming until first salary
    const upcomingPayments = [];
    for (const rt of rawAankomend) {
        if (rt.type === 'salary') break;

        // Compare next_expected_date against simulatedToday (both in original data timeline)
        const nextDate = rt.next_expected_date ? new Date(rt.next_expected_date) : new Date();
        nextDate.setHours(0, 0, 0, 0);
        const daysUntil = Math.floor((nextDate.getTime() - simulatedToday.getTime()) / (1000 * 60 * 60 * 24));

        // Skip payments that are in the past (negative days)
        if (daysUntil < 0) continue;

        const daysLabel = daysUntil === 0 ? 'vandaag' :
            daysUntil === 1 ? 'morgen' :
                `over ${daysUntil} dagen`;

        upcomingPayments.push({
            id: rt.id,
            transactionId: recurringToTransactionMap.get(rt.id) || null,
            merchant: rt.merchants?.name || rt.name,
            subtitle: daysLabel,
            amount: Number(rt.amount),
            isDebit: rt.is_debit,
            logo: rt.merchants?.name === 'Nationale-Nederlanden' ? '/logos/nn.svg' : null,
            icon: rt.categories?.icon,
            daysUntil
        });

        if (upcomingPayments.length >= 3) break;
    }

    return {
        baseOffset,
        userName,
        upcomingPayments,
        transactions: recentTransactions.map((t) => {
            const time = extractTimeFromDescription(t.description);
            // Apply ONLY base offset for display (Fixed World)
            const shiftedDate = applyDateOffset(new Date(t.date), baseOffset);
            const dateStr = formatDate(shiftedDate);

            return {
                id: t.id,
                merchant: t.merchants?.name || t.cleaned_merchant_name || t.merchantName,
                amount: Number(t.amount),
                isDebit: t.is_debit,
                category: t.categories?.name || null,
                categoryIcon: t.categories?.icon || null,
                subline: time ? `${dateStr} • ${time}` : dateStr,
                date: shiftedDate.toISOString(),
                description: t.description
            };
        })
    };
};
