import { db } from '$lib/server/db';
import type { PageServerLoad } from './$types';
import { applyDateOffset, getOffsetFromUrl } from '$lib/server/utils/dateShifter';

// Extract time from description field (e.g., "22:29" pattern)
function extractTimeFromDescription(description: string | null): string | null {
    if (!description) return null;
    const timeMatch = description.match(/\b(\d{1,2}:\d{2})\b/);
    return timeMatch ? timeMatch[1] : null;
}

// Format date as "14 april"
function formatDate(date: Date): string {
    const months = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
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
        baseOffset = diffDays + 30;
    }

    // cutoffDate calculation for "Moving Curtain" logic:
    // We want to show transactions where ShiftedDate <= SimulatedToday
    // ShiftedDate = OriginalDate + baseOffset
    // SimulatedToday = RealToday + manualOffset
    // OriginalDate + baseOffset <= RealToday + manualOffset
    // OriginalDate <= RealToday - baseOffset + manualOffset
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - baseOffset + manualOffset);
    // Add end of day buffer
    cutoffDate.setHours(23, 59, 59, 999);

    const recentTransactions = await db.transactions.findMany({
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
    });

    return {
        baseOffset,
        userName,
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
                subline: time ? `${dateStr} • ${time}` : dateStr
            };
        })
    };
};
