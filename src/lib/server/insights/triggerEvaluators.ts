import type { InsightData } from './insightDataCollector';

/**
 * Result of a trigger evaluation
 */
export interface TriggerResult {
    triggered: boolean;
    data?: Record<string, unknown>; // Data to fill message template placeholders
}

/**
 * Trigger evaluator function signature
 */
type TriggerEvaluator = (
    data: InsightData,
    params?: Record<string, unknown>
) => TriggerResult;

/**
 * Registry of all available trigger evaluators
 */
const triggerEvaluators: Record<string, TriggerEvaluator> = {
    /**
     * No transactions uploaded yet
     */
    no_transactions: (data) => ({
        triggered: data.totalTransactions === 0,
        data: {}
    }),

    /**
     * Transactions exist (for success state)
     */
    has_transactions: (data) => ({
        triggered: data.totalTransactions > 0,
        data: { count: data.totalTransactions }
    }),

    /**
     * Payment due within N days (default: 3)
     */
    payment_due_soon: (data, params) => {
        const days = (params?.days as number) ?? 3;
        const payment = data.upcomingPayments.find((p) => p.daysUntil <= days);

        if (!payment) return { triggered: false };

        return {
            triggered: true,
            data: {
                name: payment.name,
                amount: payment.amount.toFixed(0),
                days: payment.daysUntil,
                daysText: payment.daysUntil === 0 ? 'today' :
                    payment.daysUntil === 1 ? 'tomorrow' :
                        `in ${payment.daysUntil} days`
            }
        };
    },

    /**
     * Payment is late (within past week)
     */
    payment_late: (data, params) => {
        const maxDays = (params?.max_days as number) ?? 7;
        const payment = data.latePayments.find((p) => p.daysLate <= maxDays);

        if (!payment) return { triggered: false };

        return {
            triggered: true,
            data: {
                name: payment.name,
                amount: payment.amount.toFixed(0),
                daysLate: payment.daysLate,
                daysText: payment.daysLate === 1 ? '1 day' : `${payment.daysLate} days`
            }
        };
    },

    /**
     * High uncategorized percentage (default: 20%)
     * Doesn't trigger at 100% (fresh import) since import success message handles that
     */
    uncategorized_high: (data, params) => {
        const threshold = (params?.threshold_percent as number) ?? 20;
        // Don't trigger at 100% - that's a fresh import, handled by import success message
        const triggered = data.uncategorizedPercentage > threshold && data.uncategorizedPercentage < 100;

        if (!triggered) return { triggered: false };

        return {
            triggered: true,
            data: {
                percent: Math.round(data.uncategorizedPercentage),
                count: data.uncategorizedCount,
                topMerchant: data.topUncategorizedMerchants[0]?.name,
                topMerchantCount: data.topUncategorizedMerchants[0]?.count
            }
        };
    },

    /**
     * All transactions are categorized
     */
    categorization_complete: (data) => ({
        triggered: data.totalTransactions > 0 && data.uncategorizedPercentage === 0,
        data: { count: data.totalTransactions }
    }),

    /**
     * Fresh import - all transactions are uncategorized (100%)
     * This indicates a new import where no categorization has been done yet
     */
    fresh_import: (data) => ({
        triggered: data.totalTransactions > 0 && data.uncategorizedPercentage === 100,
        data: { count: data.totalTransactions }
    }),

    /**
     * Positive savings this month
     */
    savings_positive: (data) => ({
        triggered: data.monthlySavings > 0,
        data: {
            amount: data.monthlySavings.toFixed(0),
            income: data.monthlyIncome.toFixed(0),
            expenses: data.monthlyExpenses.toFixed(0)
        }
    }),

    /**
     * Spending change vs last month (default threshold: 15%)
     * DEPRECATED: Use same_period_change or complete_month_change instead
     */
    spending_change: (data, params) => {
        const threshold = (params?.threshold_percent as number) ?? 15;
        const direction = params?.direction as 'up' | 'down' | 'any' ?? 'any';

        const changePercent = data.spendingChangePercent;
        const isUp = changePercent > threshold;
        const isDown = changePercent < -threshold;

        let triggered = false;
        if (direction === 'up') triggered = isUp;
        else if (direction === 'down') triggered = isDown;
        else triggered = isUp || isDown;

        if (!triggered) return { triggered: false };

        return {
            triggered: true,
            data: {
                percent: Math.abs(Math.round(changePercent)),
                direction: changePercent > 0 ? 'up' : 'down',
                currentAmount: data.currentMonthSpending.toFixed(0),
                lastAmount: data.lastMonthSpending.toFixed(0)
            }
        };
    },

    /**
     * Same period spending comparison (first X days of this month vs last month)
     * More accurate than full month comparison since current month is incomplete
     */
    same_period_change: (data, params) => {
        const threshold = (params?.threshold_percent as number) ?? 30; // Higher threshold for significance
        const direction = params?.direction as 'up' | 'down' | 'any' ?? 'any';
        const minDays = (params?.min_days as number) ?? 3; // Need at least 3 days of data

        // Don't trigger if we don't have enough days
        if (data.dayOfMonth < minDays) return { triggered: false };
        // Don't trigger if last month has no data for same period
        if (data.samePeriodLastMonth === 0) return { triggered: false };

        const changePercent = data.samePeriodChangePercent;
        const isUp = changePercent > threshold;
        const isDown = changePercent < -threshold;

        let triggered = false;
        if (direction === 'up') triggered = isUp;
        else if (direction === 'down') triggered = isDown;
        else triggered = isUp || isDown;

        if (!triggered) return { triggered: false };

        return {
            triggered: true,
            data: {
                percent: Math.abs(Math.round(changePercent)),
                direction: changePercent > 0 ? 'up' : 'down',
                days: data.dayOfMonth,
                currentAmount: data.samePeriodCurrentMonth.toFixed(0),
                lastAmount: data.samePeriodLastMonth.toFixed(0)
            }
        };
    },

    /**
     * Complete month comparison (last month vs 2 months ago)
     * Fair comparison since both months are complete
     */
    complete_month_change: (data, params) => {
        const threshold = (params?.threshold_percent as number) ?? 15;
        const direction = params?.direction as 'up' | 'down' | 'any' ?? 'any';

        // Don't trigger if we don't have 2 months of complete data
        if (data.lastMonthComplete === 0 || data.twoMonthsAgoComplete === 0) {
            return { triggered: false };
        }

        const changePercent = data.completeMonthChangePercent;
        const isUp = changePercent > threshold;
        const isDown = changePercent < -threshold;

        let triggered = false;
        if (direction === 'up') triggered = isUp;
        else if (direction === 'down') triggered = isDown;
        else triggered = isUp || isDown;

        if (!triggered) return { triggered: false };

        // Get month names
        const now = new Date();
        const lastMonthName = new Date(now.getFullYear(), now.getMonth() - 1).toLocaleString('en', { month: 'long' });
        const twoMonthsAgoName = new Date(now.getFullYear(), now.getMonth() - 2).toLocaleString('en', { month: 'long' });

        return {
            triggered: true,
            data: {
                percent: Math.abs(Math.round(changePercent)),
                direction: changePercent > 0 ? 'up' : 'down',
                lastMonth: lastMonthName,
                twoMonthsAgo: twoMonthsAgoName,
                lastMonthAmount: data.lastMonthComplete.toFixed(0),
                twoMonthsAgoAmount: data.twoMonthsAgoComplete.toFixed(0)
            }
        };
    },

    /**
     * Top spending category this month
     */
    top_category: (data, params) => {
        const minPercentage = (params?.min_percentage as number) ?? 25; // Category must be at least 25% of spending

        if (!data.topCategory) return { triggered: false };
        if (data.topCategory.percentage < minPercentage) return { triggered: false };

        return {
            triggered: true,
            data: {
                category: data.topCategory.name,
                amount: data.topCategory.amount.toFixed(0),
                percent: Math.round(data.topCategory.percentage)
            }
        };
    },

    /**
     * Time of day trigger for greetings
     */
    time_of_day: (_data, params) => {
        const now = new Date();
        const hour = now.getHours();
        const startHour = (params?.start_hour as number) ?? 0;
        const endHour = (params?.end_hour as number) ?? 24;

        const triggered = hour >= startHour && hour < endHour;

        return {
            triggered,
            data: {
                greeting: hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
            }
        };
    },

    /**
     * Always true - for fallback tips
     */
    always: () => ({
        triggered: true,
        data: {}
    })
};

/**
 * Evaluate a trigger by ID
 */
export function evaluateTrigger(
    triggerId: string,
    data: InsightData,
    params?: Record<string, unknown>
): TriggerResult {
    const evaluator = triggerEvaluators[triggerId];
    if (!evaluator) {
        console.warn(`Unknown trigger: ${triggerId}`);
        return { triggered: false };
    }
    return evaluator(data, params);
}

/**
 * Get list of all available triggers
 */
export function getAvailableTriggers(): string[] {
    return Object.keys(triggerEvaluators);
}
