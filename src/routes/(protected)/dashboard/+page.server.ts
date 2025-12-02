import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
    const userId = locals.user!.id;

    const [recentTransactions, totalCount, categorizedCount, recurringTransactions, topUncategorizedMerchants] = await Promise.all([
        db.transactions.findMany({
            where: { user_id: userId },
            orderBy: { date: 'desc' },
            take: 5,
            include: {
                categories: true,
                merchants: true
            }
        }),
        db.transactions.count({
            where: { user_id: userId }
        }),
        db.transactions.count({
            where: {
                user_id: userId,
                category_id: { not: null },
                categories: {
                    name: { notIn: ['Niet gecategoriseerd', 'Uncategorized'] }
                }
            }
        }),
        db.recurringTransaction.findMany({
            where: {
                user_id: userId,
                status: 'active'
            },
            orderBy: { next_expected_date: 'asc' }
        }),
        db.transactions.groupBy({
            by: ['merchantName'],
            where: {
                user_id: userId,
                OR: [
                    { category_id: null },
                    { categories: { name: { in: ['Uncategorized', 'Niet gecategoriseerd'] } } }
                ]
            },
            _count: {
                _all: true
            },
            orderBy: {
                _count: {
                    merchantName: 'desc'
                }
            },
            take: 3
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
            totalTransactions: totalCount,
            categorizedCount: categorizedCount,
            uncategorizedCount: totalCount - categorizedCount,
            categorizedPercentage: totalCount > 0 ? (categorizedCount / totalCount) * 100 : 0,
            topUncategorizedMerchants: topUncategorizedMerchants.map(r => ({
                name: r.merchantName,
                count: r._count._all
            }))
        }
    };
};
