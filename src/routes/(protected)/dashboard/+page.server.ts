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
            categories: true
        },
        orderBy: { date: 'desc' },
        take: 8
    });

    return {
        stats: {
            totalTransactions,
            categorizedCount,
            categorizedPercentage
        },
        recentTransactions: recentTransactions.map(t => ({
            id: t.id,
            merchant: t.description || 'Unknown',
            amount: Number(t.amount),
            category: t.categories?.name || 'Uncategorized',
            date: t.date
        }))
    };
};
