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

    // Same period comparison (first X days of this month vs last month)
    samePeriodCurrentMonth: number;
    samePeriodLastMonth: number;
    samePeriodChangePercent: number;
    dayOfMonth: number;

    // Complete month comparison (last month vs 2 months ago)
    lastMonthComplete: number;
    twoMonthsAgoComplete: number;
    completeMonthChangePercent: number;

    // Top spending category
    topCategory: {
        id: number;
        name: string;
        amount: number;
        percentage: number;
    } | null;

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

    // User activity tracking
    loginStreak: number;
    daysSinceLastActive: number;
    currentMonth: number; // 1-12
}

/**
 * Collect all financial data needed for insight evaluation
 */
export async function collectInsightData(userId: number): Promise<InsightData> {
    const now = new Date();
    const dayOfMonth = now.getDate();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const startOfTwoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const endOfTwoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 1, 0);

    // Same period comparison dates (first X days of each month)
    const samePeriodEndCurrent = new Date(now.getFullYear(), now.getMonth(), dayOfMonth, 23, 59, 59);
    const samePeriodEndLast = new Date(now.getFullYear(), now.getMonth() - 1, dayOfMonth, 23, 59, 59);

    // Parallel fetch all data
    const [
        totalCount,
        categorizedCount,
        currentMonthTransactions,
        lastMonthTransactions,
        recurringTransactions,
        topUncategorizedMerchants,
        incomeTransactions,
        samePeriodCurrentTransactions,
        samePeriodLastTransactions,
        twoMonthsAgoTransactions,
        categorySpending,
        userActivity
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

        // Last month spending (complete)
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
        }),

        // Same period current month (first X days)
        db.transactions.findMany({
            where: {
                user_id: userId,
                is_debit: true,
                date: { gte: startOfMonth, lte: samePeriodEndCurrent }
            },
            select: { amount: true }
        }),

        // Same period last month (first X days)
        db.transactions.findMany({
            where: {
                user_id: userId,
                is_debit: true,
                date: { gte: startOfLastMonth, lte: samePeriodEndLast }
            },
            select: { amount: true }
        }),

        // Two months ago spending (complete)
        db.transactions.findMany({
            where: {
                user_id: userId,
                is_debit: true,
                date: { gte: startOfTwoMonthsAgo, lte: endOfTwoMonthsAgo }
            },
            select: { amount: true }
        }),

        // Top spending by category this month
        db.transactions.groupBy({
            by: ['category_id'],
            where: {
                user_id: userId,
                is_debit: true,
                date: { gte: startOfMonth },
                category_id: { not: null },
                categories: {
                    name: { notIn: ['Niet gecategoriseerd', 'Uncategorized'] }
                }
            },
            _sum: { amount: true },
            orderBy: { _sum: { amount: 'desc' } },
            take: 1
        }),

        // User activity data
        db.user.findUnique({
            where: { id: userId },
            select: {
                login_streak: true,
                last_active_at: true
            }
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

    // Calculate spending change (full month comparison - keep for backwards compatibility)
    const spendingChangePercent =
        lastMonthSpending > 0
            ? ((currentMonthSpending - lastMonthSpending) / lastMonthSpending) * 100
            : 0;

    // Calculate same period comparison
    const samePeriodCurrentMonth = samePeriodCurrentTransactions.reduce(
        (sum, t) => sum + Math.abs(Number(t.amount)),
        0
    );
    const samePeriodLastMonth = samePeriodLastTransactions.reduce(
        (sum, t) => sum + Math.abs(Number(t.amount)),
        0
    );
    const samePeriodChangePercent =
        samePeriodLastMonth > 0
            ? ((samePeriodCurrentMonth - samePeriodLastMonth) / samePeriodLastMonth) * 100
            : 0;

    // Calculate complete month comparison (last month vs 2 months ago)
    const lastMonthComplete = lastMonthSpending;
    const twoMonthsAgoComplete = twoMonthsAgoTransactions.reduce(
        (sum, t) => sum + Math.abs(Number(t.amount)),
        0
    );
    const completeMonthChangePercent =
        twoMonthsAgoComplete > 0
            ? ((lastMonthComplete - twoMonthsAgoComplete) / twoMonthsAgoComplete) * 100
            : 0;

    // Get top category info
    let topCategory: InsightData['topCategory'] = null;
    if (categorySpending.length > 0 && categorySpending[0]._sum.amount) {
        const topCategoryId = categorySpending[0].category_id;
        const topCategoryAmount = Math.abs(Number(categorySpending[0]._sum.amount));

        if (topCategoryId && currentMonthSpending > 0) {
            const category = await db.categories.findUnique({
                where: { id: topCategoryId },
                select: { name: true }
            });

            if (category) {
                topCategory = {
                    id: topCategoryId,
                    name: category.name,
                    amount: topCategoryAmount,
                    percentage: (topCategoryAmount / currentMonthSpending) * 100
                };
            }
        }
    }

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
        samePeriodCurrentMonth,
        samePeriodLastMonth,
        samePeriodChangePercent,
        dayOfMonth,
        lastMonthComplete,
        twoMonthsAgoComplete,
        completeMonthChangePercent,
        topCategory,
        upcomingPayments,
        latePayments,
        topUncategorizedMerchants: topUncategorizedMerchants.map((m) => ({
            name: m.merchantName,
            count: m._count._all
        })),
        // User activity
        loginStreak: userActivity?.login_streak ?? 0,
        daysSinceLastActive: userActivity?.last_active_at
            ? Math.floor((now.getTime() - new Date(userActivity.last_active_at).getTime()) / (1000 * 60 * 60 * 24))
            : 0,
        currentMonth: now.getMonth() + 1 // 1-12
    };
}
