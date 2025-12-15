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

// =============================================================================
// TRANSACTION-LEVEL CONTEXT COLLECTION
// =============================================================================

import type { TransactionForInsight, TransactionContext } from './triggerEvaluators';

/**
 * Collect context data for transaction insight evaluation
 * This runs batched queries once, then the context is used for all transactions
 */
export async function collectTransactionContext(
    userId: number,
    transactions: TransactionForInsight[]
): Promise<TransactionContext> {
    // Extract unique merchant IDs and names from transactions
    const merchantIds = [...new Set(transactions.map(t => t.merchant_id).filter(Boolean))] as number[];
    const merchantNames = [...new Set(
        transactions
            .map(t => (t.cleaned_merchant_name || t.merchantName)?.toLowerCase())
            .filter(Boolean)
    )] as string[];

    // Get date range for lookback queries
    const dates = transactions.map(t => new Date(t.date));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const lookback60Days = new Date(minDate);
    lookback60Days.setDate(lookback60Days.getDate() - 60);



    // NEW: Date ranges for new insights
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOf3MonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const lookback90Days = new Date(minDate);
    lookback90Days.setDate(lookback90Days.getDate() - 90);

    // Run all queries in parallel
    const [
        merchantFirstSeenData,
        merchantNameFirstSeenData,
        recentTransactions,
        recurringAmounts,
        // NEW queries
        merchantMonthlyCountData,
        merchantLastSeenData,
        categorySpendingData,
        sameDayTransactionsData,
        eatingOutCurrentMonth,
        eatingOutHistory
    ] = await Promise.all([
        // 1. First seen date per merchant_id (all-time)
        merchantIds.length > 0 ? db.transactions.groupBy({
            by: ['merchant_id'],
            where: {
                user_id: userId,
                merchant_id: { in: merchantIds }
            },
            _min: { date: true }
        }) : Promise.resolve([]),

        // 2. First seen date per merchant name (fallback for unlinked)
        merchantNames.length > 0 ? db.$queryRaw<Array<{ name: string; first_seen: Date }>>`
            SELECT LOWER(cleaned_merchant_name) as name, MIN(date) as first_seen
            FROM transactions
            WHERE user_id = ${userId}
              AND LOWER(cleaned_merchant_name) = ANY(${merchantNames})
            GROUP BY LOWER(cleaned_merchant_name)
        ` : Promise.resolve([]),

        // 3. Recent transactions for duplicate detection (same day window)
        db.transactions.findMany({
            where: {
                user_id: userId,
                merchant_id: { in: merchantIds.filter(id => id != null) },
                date: { gte: lookback60Days }
            },
            select: {
                id: true,
                date: true,
                amount: true,
                merchant_id: true,
                merchantName: true,
                cleaned_merchant_name: true,
                is_debit: true,
                category_id: true,
                categories: { select: { name: true } }
            },
            orderBy: { date: 'desc' }
        }),

        // 4. Recurring transaction last amounts
        db.recurringTransaction.findMany({
            where: {
                user_id: userId,
                status: 'active'
            },
            select: {
                id: true,
                amount: true
            }
        }),

        // 5. NEW: Merchant monthly visit count (current month)
        merchantIds.length > 0 ? db.transactions.groupBy({
            by: ['merchant_id'],
            where: {
                user_id: userId,
                merchant_id: { in: merchantIds },
                date: { gte: startOfMonth },
                is_debit: true
            },
            _count: { _all: true }
        }) : Promise.resolve([]),

        // 6. NEW: Merchant last seen (for comeback detection)
        // Find the most recent transaction BEFORE 30 days ago for each merchant
        merchantIds.length > 0 ? db.$queryRaw<Array<{ merchant_id: number; last_seen: Date }>>`
            SELECT merchant_id, MAX(date) as last_seen
            FROM transactions
            WHERE user_id = ${userId}
              AND merchant_id = ANY(${merchantIds})
              AND date < ${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)}
            GROUP BY merchant_id
        ` : Promise.resolve([]),

        // 7. NEW: Category spending last 3 months (for average)
        db.transactions.groupBy({
            by: ['category_id'],
            where: {
                user_id: userId,
                is_debit: true,
                date: { gte: startOf3MonthsAgo, lt: startOfMonth },
                category_id: { not: null }
            },
            _sum: { amount: true }
        }),

        // 8. NEW: All transactions in last 90 days for same-day pair detection
        db.transactions.findMany({
            where: {
                user_id: userId,
                is_debit: true,
                date: { gte: lookback90Days }
            },
            select: {
                id: true,
                date: true,
                merchant_id: true
            },
            orderBy: { date: 'asc' }
        }),

        // 9. NEW: Eating out count current month
        db.transactions.count({
            where: {
                user_id: userId,
                is_debit: true,
                date: { gte: startOfMonth },
                categories: {
                    name: { in: ['Restaurant', 'Uit eten', 'Eating out', 'Restaurants', 'Lunch', 'Dinner', 'Fast food'] }
                }
            }
        }),

        // 10. NEW: Eating out history (last 3 months, for average)
        db.transactions.count({
            where: {
                user_id: userId,
                is_debit: true,
                date: { gte: startOf3MonthsAgo, lt: startOfMonth },
                categories: {
                    name: { in: ['Restaurant', 'Uit eten', 'Eating out', 'Restaurants', 'Lunch', 'Dinner', 'Fast food'] }
                }
            }
        })
    ]);


    // Build context maps
    const merchantFirstSeen = new Map<number, Date>();
    for (const row of merchantFirstSeenData as any[]) {
        if (row.merchant_id && row._min?.date) {
            merchantFirstSeen.set(row.merchant_id, new Date(row._min.date));
        }
    }

    const merchantNameFirstSeen = new Map<string, Date>();
    for (const row of merchantNameFirstSeenData as any[]) {
        if (row.name && row.first_seen) {
            merchantNameFirstSeen.set(row.name.toLowerCase(), new Date(row.first_seen));
        }
    }

    // Group recent transactions by merchant for duplicate detection
    const recentByMerchant = new Map<number, TransactionForInsight[]>();
    for (const tx of recentTransactions as any[]) {
        if (!tx.merchant_id) continue;
        if (!recentByMerchant.has(tx.merchant_id)) {
            recentByMerchant.set(tx.merchant_id, []);
        }
        recentByMerchant.get(tx.merchant_id)!.push({
            id: tx.id,
            date: tx.date,
            amount: typeof tx.amount === 'object' && tx.amount?.toNumber
                ? tx.amount.toNumber()
                : Number(tx.amount),
            merchant_id: tx.merchant_id,
            merchantName: tx.merchantName,
            cleaned_merchant_name: tx.cleaned_merchant_name,
            is_debit: tx.is_debit
        });
    }

    // Recurring last amounts
    const recurringLastAmount = new Map<number, number>();
    for (const rt of recurringAmounts) {
        recurringLastAmount.set(rt.id, typeof rt.amount === 'object' && (rt.amount as any)?.toNumber
            ? (rt.amount as any).toNumber()
            : Number(rt.amount));
    }

    // Build credit/debit maps for refund matching (keyed by amount in cents)
    const creditsByAmount = new Map<number, TransactionForInsight[]>();
    const debitsByAmount = new Map<number, TransactionForInsight[]>();

    for (const tx of recentTransactions as any[]) {
        const amount = typeof tx.amount === 'object' && tx.amount?.toNumber
            ? tx.amount.toNumber()
            : Number(tx.amount);
        const amountKey = Math.round(Math.abs(amount) * 100);

        const txData: TransactionForInsight = {
            id: tx.id,
            date: tx.date,
            amount: amount,
            merchant_id: tx.merchant_id,
            merchantName: tx.merchantName,
            cleaned_merchant_name: tx.cleaned_merchant_name,
            is_debit: tx.is_debit
        };

        if (tx.is_debit) {
            if (!debitsByAmount.has(amountKey)) {
                debitsByAmount.set(amountKey, []);
            }
            debitsByAmount.get(amountKey)!.push(txData);
        } else {
            if (!creditsByAmount.has(amountKey)) {
                creditsByAmount.set(amountKey, []);
            }
            creditsByAmount.get(amountKey)!.push(txData);
        }
    }

    // NEW: Build merchant monthly count map
    const merchantMonthlyCount = new Map<number, number>();
    for (const row of merchantMonthlyCountData as any[]) {
        if (row.merchant_id && row._count?._all) {
            merchantMonthlyCount.set(row.merchant_id, row._count._all);
        }
    }

    // NEW: Build merchant last seen map (for comeback detection)
    const merchantLastSeen = new Map<number, Date>();
    for (const row of merchantLastSeenData as any[]) {
        if (row.merchant_id && row.last_seen) {
            merchantLastSeen.set(row.merchant_id, new Date(row.last_seen));
        }
    }

    // NEW: Build category average spending map (3-month average -> divide by 3)
    const categoryAvgSpending = new Map<number, number>();
    for (const row of categorySpendingData as any[]) {
        if (row.category_id && row._sum?.amount) {
            const totalAmount = typeof row._sum.amount === 'object' && row._sum.amount?.toNumber
                ? row._sum.amount.toNumber()
                : Number(row._sum.amount);
            categoryAvgSpending.set(row.category_id, Math.abs(totalAmount) / 3);
        }
    }

    // NEW: Build merchant pairs map (same-day combinations)
    const merchantPairs = new Map<string, number>();
    const transactionsByDay = new Map<string, number[]>(); // date -> merchant_ids

    for (const tx of sameDayTransactionsData as any[]) {
        if (!tx.merchant_id) continue;
        const dayKey = new Date(tx.date).toISOString().split('T')[0];
        if (!transactionsByDay.has(dayKey)) {
            transactionsByDay.set(dayKey, []);
        }
        const dayMerchants = transactionsByDay.get(dayKey)!;
        if (!dayMerchants.includes(tx.merchant_id)) {
            dayMerchants.push(tx.merchant_id);
        }
    }

    // Count pairs (merchants appearing on same day)
    for (const [_, merchantsOnDay] of transactionsByDay.entries()) {
        if (merchantsOnDay.length < 2) continue;
        // Generate all pairs for this day
        for (let i = 0; i < merchantsOnDay.length; i++) {
            for (let j = i + 1; j < merchantsOnDay.length; j++) {
                // Normalize pair key (smaller id first)
                const id1 = Math.min(merchantsOnDay[i], merchantsOnDay[j]);
                const id2 = Math.max(merchantsOnDay[i], merchantsOnDay[j]);
                const pairKey = `${id1}-${id2}`;
                merchantPairs.set(pairKey, (merchantPairs.get(pairKey) || 0) + 1);
            }
        }
    }

    // NEW: Eating out stats
    const eatingOutMonthlyCount = eatingOutCurrentMonth as number;
    const eatingOutHistoryCount = eatingOutHistory as number;
    const eatingOutMonthlyAvg = eatingOutHistoryCount / 3; // 3-month average

    // NEW: Detect holiday-related transactions
    const holidayTransactionIds = new Set<number>();

    // Holiday categories
    const HOLIDAY_CATEGORIES = ['Vakantie', 'Holiday', 'Travel', 'Hotels', 'Accommodatie', 'Accommodation', 'Vluchten', 'Flights'];

    // Foreign name patterns (non-Dutch/English)
    const FOREIGN_PATTERNS = [
        /[àáâãäåæçèéêëìíîïñòóôõöøùúûüý]/i,  // Accented characters
        /ristorante|trattoria|pizzeria|taberna|taverna|brasserie|café|gasthaus|pension/i,  // Restaurant words
        /hotel\s+(de|del|la|le|el|das|der|les)/i,  // Hotel + foreign article
        /playa|strand|beach|spiaggia|plage/i,  // Beach words
    ];

    for (const tx of recentTransactions as any[]) {
        const categoryName = tx.categories?.name || '';
        const merchantName = (tx.cleaned_merchant_name || tx.merchantName || '').toLowerCase();

        // Check category match
        if (HOLIDAY_CATEGORIES.some(cat => categoryName.toLowerCase().includes(cat.toLowerCase()))) {
            holidayTransactionIds.add(tx.id);
            continue;
        }

        // Check foreign name patterns
        if (FOREIGN_PATTERNS.some(pattern => pattern.test(merchantName))) {
            holidayTransactionIds.add(tx.id);
            continue;
        }
    }

    return {
        merchantFirstSeen,
        merchantNameFirstSeen,
        recentByMerchant,
        recurringLastAmount,
        creditsByAmount,
        debitsByAmount,
        // NEW context fields
        merchantMonthlyCount,
        merchantLastSeen,
        categoryAvgSpending,
        merchantPairs,
        holidayTransactionIds,
        eatingOutMonthlyCount,
        eatingOutMonthlyAvg
    };
}
