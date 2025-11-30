import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
    const userId = locals.user!.id;

    // Get total transaction count
    const totalTransactions = await db.transactions.count({
        where: { user_id: userId }
    });

    // Get categorized transaction count (excluding "Uncategorized" and null)
    const categorizedCount = await db.transactions.count({
        where: {
            user_id: userId,
            category_id: {
                not: null
            },
            categories: {
                name: {
                    not: 'Uncategorized'
                }
            }
        }
    });

    // Calculate percentage
    const categorizedPercentage = totalTransactions > 0
        ? (categorizedCount / totalTransactions) * 100
        : 0;

    // Get 8 most recent transactions
    const recentTransactions = await db.transactions.findMany({
        where: { user_id: userId },
        include: {
            categories: true,
            merchants: true
        },
        orderBy: { date: 'desc' },
        take: 8
    });

    const uncategorizedCount = totalTransactions - categorizedCount;

    return {
        stats: {
            totalTransactions,
            categorizedCount,
            uncategorizedCount,
            categorizedPercentage
        },
        recentTransactions: recentTransactions.map(t => ({
            id: t.id,
            merchant: t.merchants?.name || t.cleaned_merchant_name || t.merchantName || 'Unknown',
            amount: Number(t.amount),
            isDebit: t.is_debit,
            category: t.categories?.name || 'Uncategorized',
            categoryIcon: t.categories?.icon || null,
            date: t.date
        }))
    };
};
