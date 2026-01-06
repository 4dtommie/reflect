import { db } from '$lib/server/db';
import type { PageServerLoad } from './$types';

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

export const load: PageServerLoad = async ({ locals }) => {
    const userId = locals.user?.id;

    if (!userId) {
        return { transactions: [] };
    }

    // Fetch recent transactions (limit to 50 for now)
    const transactions = await db.transactions.findMany({
        where: { user_id: userId },
        orderBy: { date: 'desc' },
        take: 50,
        include: {
            categories: true,
            merchants: true
        }
    });

    // Group transactions by Date for the list view (optional but nice)
    // For now, flat list as requested "simulates list"

    return {
        transactions: transactions.map((t) => {
            const time = extractTimeFromDescription(t.description);
            const dateStr = formatDate(new Date(t.date));

            return {
                id: t.id,
                merchant: t.merchants?.name || t.cleaned_merchant_name || t.merchantName,
                amount: Number(t.amount),
                isDebit: t.is_debit,
                category: t.categories?.name || null,
                categoryIcon: t.categories?.icon || null,
                subline: time ? `${dateStr} • ${time}` : dateStr,
                dateObj: t.date
            };
        })
    };
};
