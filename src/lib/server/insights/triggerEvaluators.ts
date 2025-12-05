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
     */
    uncategorized_high: (data, params) => {
        const threshold = (params?.threshold_percent as number) ?? 20;
        const triggered = data.uncategorizedPercentage > threshold;

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
