import { db } from '$lib/server/db';
import type { PageServerLoad } from './$types';

// Extract time from description field (e.g., "22:29" pattern)
// Kept for backward compatibility or if needed later, but usage is changing.
function extractTimeFromDescription(description: string | null): string | null {
    if (!description) return null;
    const timeMatch = description.match(/\b(\d{1,2}:\d{2})\b/);
    return timeMatch ? timeMatch[1] : null;
}

export const load: PageServerLoad = async ({ locals }) => {
    const userId = locals.user?.id;

    if (!userId) {
        return { groupedTransactions: [] };
    }

    // Fetch transactions (limit to 100 to cover enough history)
    const transactions = await db.transactions.findMany({
        where: { user_id: userId },
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

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const months = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
    const shortDays = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];

    for (const t of transactions) {
        const date = new Date(t.date);
        date.setHours(0, 0, 0, 0); // Normalize time for grouping
        const dateKey = date.toISOString().split('T')[0];

        let group = groupedMap.get(dateKey);

        if (!group) {
            // Determine Label
            let label = '';
            if (date.getTime() === today.getTime()) {
                label = 'Vandaag';
            } else if (date.getTime() === yesterday.getTime()) {
                label = 'Gisteren';
            } else {
                // E.g., "14 april" or "ma 14 apr" ? User provided screenshot shows "Vandaag", let's use "dd Month" for others or relative if close?
                // Screenshot just shows "Vandaag", let's assume standard date format for others.
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

    // Convert map to array
    const groupedTransactions = Array.from(groupedMap.values()).map(g => ({
        ...g,
        formattedTotal: formatDailyTotal(g.totalAmount)
    }));

    return { groupedTransactions };
};

function formatDailyTotal(amount: number): string {
    const abs = Math.abs(amount);
    const prefix = amount < 0 ? '- ' : amount > 0 ? '+ ' : '';
    // Use dutch locale for comma but no currency symbol here as per design pill "- € 232"
    // Actually user screenshot shows "- € 232". Let's match that.
    // It seems to be rounded to whole numbers in the pill? " - € 232"
    // Let's round for the pill to keep it clean.
    return `${prefix}€ ${Math.round(abs)}`;
}
