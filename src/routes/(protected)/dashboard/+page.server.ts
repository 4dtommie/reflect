import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
    const userId = locals.user!.id;

    const [recentTransactions, stats, recurringTransactions] = await Promise.all([
        db.transactions.findMany({
            where: { user_id: userId },
            orderBy: { date: 'desc' },
            take: 5,
            include: {
                categories: true,
                merchants: true
            }
        }),
        db.transactions.aggregate({
            where: { user_id: userId },
            _count: {
                id: true,
                category_id: true
            }
        }),
        db.recurringTransaction.findMany({
            where: {
                user_id: userId,
                status: 'active'
            },
            orderBy: { next_expected_date: 'asc' }
        })
    ]);

    return {
        recurringTransactions: recurringTransactions.map(t => ({
            id: t.id,
            name: t.name,
            amount: Number(t.amount),
            interval: t.interval,
            status: t.status,
            next_expected_date: t.next_expected_date,
            merchant_id: t.merchant_id,
            category_id: t.category_id
        })),
        recentTransactions: recentTransactions.map(t => ({
            id: t.id,
            merchant: t.merchants?.name || t.cleaned_merchant_name || t.merchantName || 'Unknown',
            amount: Number(t.amount),
            isDebit: t.is_debit,
            category: t.categories?.name || 'Uncategorized',
            categoryIcon: t.categories?.icon || null,
            date: t.date
        })),
        stats: {
            totalTransactions: stats._count.id,
            categorizedCount: stats._count.category_id,
            uncategorizedCount: stats._count.id - stats._count.category_id,
            categorizedPercentage: stats._count.id > 0 ? (stats._count.category_id / stats._count.id) * 100 : 0
        }
    };
};
