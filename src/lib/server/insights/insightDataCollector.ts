import { db } from '$lib/server/db';

/**
 * User financial data collected for insight evaluation
 */
export interface InsightData {
    // Transaction stats
    totalTransactions: number;
    categorizedCount: number;
    uncategorizedCount: number;
    uncategorizedPercentage: number;

    // Balance data
    monthlyIncome: number;
    monthlyExpenses: number;
    monthlySavings: number;
    currentMonthSpending: number;
    lastMonthSpending: number;
    spendingChangePercent: number;

    // Recurring data
    upcomingPayments: Array<{
        id: number;
        name: string;
        amount: number;
        daysUntil: number;
        nextDate: Date;
    }>;
    latePayments: Array<{
        id: number;
        name: string;
        amount: number;
        daysLate: number;
        expectedDate: Date;
    }>;

    // Top uncategorized merchants
    topUncategorizedMerchants: Array<{
        name: string;
        count: number;
    }>;
}

/**
 * Collect all financial data needed for insight evaluation
 */
export async function collectInsightData(userId: number): Promise<InsightData> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Parallel fetch all data
    const [
        totalCount,
        categorizedCount,
        currentMonthTransactions,
        lastMonthTransactions,
        recurringTransactions,
        topUncategorizedMerchants,
        incomeTransactions
    ] = await Promise.all([
        // Total transactions
        db.transactions.count({ where: { user_id: userId } }),

        // Categorized transactions
        db.transactions.count({
            where: {
                user_id: userId,
                category_id: { not: null },
                categories: {
                    name: { notIn: ['Niet gecategoriseerd', 'Uncategorized'] }
                }
            }
        }),

        // Current month spending
        db.transactions.findMany({
            where: {
                user_id: userId,
                is_debit: true,
                date: { gte: startOfMonth }
            },
            select: { amount: true }
        }),

        // Last month spending
        db.transactions.findMany({
            where: {
                user_id: userId,
                is_debit: true,
                date: { gte: startOfLastMonth, lte: endOfLastMonth }
            },
            select: { amount: true }
        }),

        // Active recurring transactions
        db.recurringTransaction.findMany({
            where: {
                user_id: userId,
                status: 'active'
            },
            orderBy: { next_expected_date: 'asc' }
        }),

        // Top uncategorized merchants
        db.transactions.groupBy({
            by: ['merchantName'],
            where: {
                user_id: userId,
                OR: [
                    { category_id: null },
                    { categories: { name: { in: ['Uncategorized', 'Niet gecategoriseerd'] } } }
                ]
            },
            _count: { _all: true },
            orderBy: { _count: { merchantName: 'desc' } },
            take: 5
        }),

        // Income transactions this month
        db.transactions.findMany({
            where: {
                user_id: userId,
                is_debit: false,
                date: { gte: startOfMonth }
            },
            select: { amount: true }
        })
    ]);

    // Calculate spending totals
    const currentMonthSpending = currentMonthTransactions.reduce(
        (sum, t) => sum + Math.abs(Number(t.amount)),
        0
    );
    const lastMonthSpending = lastMonthTransactions.reduce(
        (sum, t) => sum + Math.abs(Number(t.amount)),
        0
    );
    const monthlyIncome = incomeTransactions.reduce(
        (sum, t) => sum + Math.abs(Number(t.amount)),
        0
    );

    // Calculate spending change
    const spendingChangePercent =
        lastMonthSpending > 0
            ? ((currentMonthSpending - lastMonthSpending) / lastMonthSpending) * 100
            : 0;

    // Process recurring transactions into upcoming and late
    const upcomingPayments: InsightData['upcomingPayments'] = [];
    const latePayments: InsightData['latePayments'] = [];
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    for (const rt of recurringTransactions) {
        if (!rt.next_expected_date) continue;

        const expectedDate = new Date(rt.next_expected_date);
        const daysUntil = Math.ceil(
            (expectedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntil >= 0 && daysUntil <= 3) {
            // Upcoming within 3 days
            upcomingPayments.push({
                id: rt.id,
                name: rt.name,
                amount: Number(rt.amount),
                daysUntil,
                nextDate: expectedDate
            });
        } else if (daysUntil < 0 && expectedDate >= oneWeekAgo) {
            // Late but within 1 week
            latePayments.push({
                id: rt.id,
                name: rt.name,
                amount: Number(rt.amount),
                daysLate: Math.abs(daysUntil),
                expectedDate
            });
        }
    }

    return {
        totalTransactions: totalCount,
        categorizedCount,
        uncategorizedCount: totalCount - categorizedCount,
        uncategorizedPercentage: totalCount > 0 ? ((totalCount - categorizedCount) / totalCount) * 100 : 0,
        monthlyIncome,
        monthlyExpenses: currentMonthSpending,
        monthlySavings: monthlyIncome - currentMonthSpending,
        currentMonthSpending,
        lastMonthSpending,
        spendingChangePercent,
        upcomingPayments,
        latePayments,
        topUncategorizedMerchants: topUncategorizedMerchants.map((m) => ({
            name: m.merchantName,
            count: m._count._all
        }))
    };
}
