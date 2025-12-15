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
     * Good categorization progress - between 50% and 96% categorized
     * Celebrates progress without requiring perfection
     */
    categorization_good_progress: (data, params) => {
        const minCategorized = (params?.min_percent as number) ?? 50;
        const maxCategorized = (params?.max_percent as number) ?? 96;

        const categorizedPercent = 100 - data.uncategorizedPercentage;
        const triggered = data.totalTransactions > 0 &&
            categorizedPercent > minCategorized &&
            categorizedPercent < maxCategorized;

        if (!triggered) return { triggered: false };

        return {
            triggered: true,
            data: {
                percent: Math.round(categorizedPercent),
                remaining: data.uncategorizedCount,
                total: data.totalTransactions
            }
        };
    },

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
                categoryId: data.topCategory.id,
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
     * User login streak - triggers when streak >= min_days
     */
    user_streak: (data, params) => {
        const minDays = (params?.min_days as number) ?? 5;
        const triggered = data.loginStreak >= minDays;

        return {
            triggered,
            data: {
                days: data.loginStreak
            }
        };
    },

    /**
     * User inactive - triggers when user hasn't been active for X days
     */
    user_inactive: (data, params) => {
        const days = (params?.days as number) ?? 7;
        const triggered = data.daysSinceLastActive >= days;

        return {
            triggered,
            data: {
                days: data.daysSinceLastActive
            }
        };
    },

    /**
     * Christmas season - triggers in December
     */
    christmas_season: (data) => ({
        triggered: data.currentMonth === 12,
        data: {}
    }),

    /**
     * Spending high compared to last month - already spent X% of last month's total
     */
    spending_high_early: (data, params) => {
        const threshold = (params?.threshold_percent as number) ?? 80;

        if (data.lastMonthSpending === 0) return { triggered: false };

        const percentOfLastMonth = (data.currentMonthSpending / data.lastMonthSpending) * 100;
        const triggered = percentOfLastMonth >= threshold && data.dayOfMonth <= 20; // Early in month

        return {
            triggered,
            data: {
                percent: Math.round(percentOfLastMonth),
                currentSpending: data.currentMonthSpending.toFixed(0),
                lastMonthSpending: data.lastMonthSpending.toFixed(0)
            }
        };
    },

    /**
     * Suggest reviewing recurring transactions when user has good categorization progress
     */
    review_recurring: (data, params) => {
        const minCategorized = (params?.min_categorized_percent as number) ?? 50;
        const categorizedPercent = data.totalTransactions > 0
            ? 100 - data.uncategorizedPercentage
            : 0;

        // Trigger when user has made good categorization progress
        const triggered = data.totalTransactions > 0 && categorizedPercent >= minCategorized;

        return {
            triggered,
            data: {
                categorizedPercent: Math.round(categorizedPercent)
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

/**
 * Trigger metadata for admin UI
 */
interface TriggerParam {
    name: string;
    type: 'number' | 'string' | 'boolean';
    description: string;
    default?: unknown;
}

interface TriggerMeta {
    id: string;
    description: string;
    params: TriggerParam[];
    templateVars: string[];
}

const TRIGGER_METADATA: Record<string, Omit<TriggerMeta, 'id'>> = {
    no_transactions: {
        description: 'Triggers when user has no transactions',
        params: [],
        templateVars: []
    },
    has_transactions: {
        description: 'Triggers when user has any transactions',
        params: [],
        templateVars: ['count']
    },
    payment_due_soon: {
        description: 'Triggers when a recurring payment is due within N days',
        params: [
            { name: 'days', type: 'number', description: 'Days until due (default: 3)', default: 3 }
        ],
        templateVars: ['name', 'amount', 'days', 'daysText']
    },
    payment_late: {
        description: 'Triggers when a recurring payment is overdue',
        params: [
            { name: 'max_days', type: 'number', description: 'Max days late to trigger (default: 7)', default: 7 }
        ],
        templateVars: ['name', 'amount', 'daysLate', 'daysText']
    },
    uncategorized_high: {
        description: 'Triggers when uncategorized transactions exceed threshold (but not 100%)',
        params: [
            { name: 'threshold_percent', type: 'number', description: 'Min percentage to trigger (default: 20)', default: 20 }
        ],
        templateVars: ['percent', 'count', 'topMerchant', 'topMerchantCount']
    },
    categorization_complete: {
        description: 'Triggers when all transactions are categorized',
        params: [],
        templateVars: ['count']
    },
    fresh_import: {
        description: 'Triggers when all transactions are uncategorized (100% = fresh import)',
        params: [],
        templateVars: ['count']
    },
    savings_positive: {
        description: 'Triggers when monthly savings are positive',
        params: [],
        templateVars: ['amount', 'income', 'expenses']
    },
    spending_change: {
        description: '[DEPRECATED] Use same_period_change or complete_month_change instead',
        params: [
            { name: 'threshold_percent', type: 'number', description: 'Change threshold (default: 15)', default: 15 },
            { name: 'direction', type: 'string', description: 'up, down, or any (default: any)', default: 'any' }
        ],
        templateVars: ['percent', 'direction', 'currentAmount', 'lastAmount']
    },
    same_period_change: {
        description: 'Compares first X days of this month vs same period last month',
        params: [
            { name: 'threshold_percent', type: 'number', description: 'Change threshold (default: 30)', default: 30 },
            { name: 'direction', type: 'string', description: 'up, down, or any (default: any)', default: 'any' },
            { name: 'min_days', type: 'number', description: 'Min days before triggering (default: 3)', default: 3 }
        ],
        templateVars: ['percent', 'direction', 'days', 'currentAmount', 'lastAmount']
    },
    complete_month_change: {
        description: 'Compares last month vs 2 months ago (fair comparison)',
        params: [
            { name: 'threshold_percent', type: 'number', description: 'Change threshold (default: 15)', default: 15 },
            { name: 'direction', type: 'string', description: 'up, down, or any (default: any)', default: 'any' }
        ],
        templateVars: ['percent', 'direction', 'lastMonth', 'twoMonthsAgo', 'lastMonthAmount', 'twoMonthsAgoAmount']
    },
    top_category: {
        description: 'Triggers for top spending category if above threshold',
        params: [
            { name: 'min_percentage', type: 'number', description: 'Min category % of spending (default: 25)', default: 25 }
        ],
        templateVars: ['category', 'categoryId', 'amount', 'percent']
    },
    time_of_day: {
        description: 'Triggers based on current hour',
        params: [
            { name: 'start_hour', type: 'number', description: 'Start hour 0-23 (default: 0)', default: 0 },
            { name: 'end_hour', type: 'number', description: 'End hour 0-24 (default: 24)', default: 24 }
        ],
        templateVars: ['greeting']
    },
    user_streak: {
        description: 'Triggers when user login streak >= min_days',
        params: [
            { name: 'min_days', type: 'number', description: 'Min streak days to trigger (default: 5)', default: 5 }
        ],
        templateVars: ['days']
    },
    user_inactive: {
        description: 'Triggers when user has been inactive for X days',
        params: [
            { name: 'days', type: 'number', description: 'Days of inactivity to trigger (default: 7)', default: 7 }
        ],
        templateVars: ['days']
    },
    christmas_season: {
        description: 'Triggers in December',
        params: [],
        templateVars: []
    },
    spending_high_early: {
        description: 'Triggers when you\'ve already spent X% of last month\'s total early in the month',
        params: [
            { name: 'threshold_percent', type: 'number', description: 'Percent of last month to trigger (default: 80)', default: 80 }
        ],
        templateVars: ['percent', 'currentSpending', 'lastMonthSpending']
    },
    review_recurring: {
        description: 'Triggers when user has made good categorization progress',
        params: [
            { name: 'min_categorized_percent', type: 'number', description: 'Min categorized % to trigger (default: 50)', default: 50 }
        ],
        templateVars: ['categorizedPercent']
    },
    always: {
        description: 'Always triggers (for fallback tips)',
        params: [],
        templateVars: []
    }
};

/**
 * Get metadata for all triggers
 */
export function getTriggerMetadata(): TriggerMeta[] {
    return Object.entries(TRIGGER_METADATA).map(([id, meta]) => ({
        id,
        ...meta
    }));
}

// =============================================================================
// TRANSACTION-LEVEL INSIGHT SYSTEM
// =============================================================================

/**
 * A single transaction for insight evaluation
 */
export interface TransactionForInsight {
    id: number;
    date: Date | string;
    amount: number;
    merchantName?: string | null;
    cleaned_merchant_name?: string | null;
    merchant_id?: number | null;
    is_debit: boolean;
    type?: string;
    description?: string | null;
    category_id?: number | null;
    category_name?: string | null;
    recurring_transaction_id?: number | null;
    recurring_transaction_type?: string | null;
    merchant_is_potential_recurring?: boolean;
}

/**
 * Context data for evaluating transaction insights
 * This is collected once and shared across all transactions
 */
export interface TransactionContext {
    // Merchant history: merchant_id -> first transaction date
    merchantFirstSeen: Map<number, Date>;
    // Merchant name -> first transaction date (fallback for unlinked)
    merchantNameFirstSeen: Map<string, Date>;
    // Recent transactions by merchant for duplicate detection: merchant_id -> transactions
    recentByMerchant: Map<number, TransactionForInsight[]>;
    // Recurring patterns: recurring_id -> last amount
    recurringLastAmount: Map<number, number>;
    // Credits for refund matching: amount -> transactions
    creditsByAmount: Map<number, TransactionForInsight[]>;
    // Debits for refund matching: amount -> transactions  
    debitsByAmount: Map<number, TransactionForInsight[]>;

    // NEW: Merchant visit counts this month: merchant_id -> count
    merchantMonthlyCount: Map<number, number>;
    // NEW: Merchant last seen before current batch: merchant_id -> date
    merchantLastSeen: Map<number, Date>;
    // NEW: Category spending 3-month average: category_id -> average amount
    categoryAvgSpending: Map<number, number>;
    // NEW: Merchant co-occurrence (same-day pairs): "id1-id2" -> count
    merchantPairs: Map<string, number>;
    // NEW: Holiday-related transaction IDs (detected via patterns)
    holidayTransactionIds: Set<number>;
    // NEW: Eating out count this month for holiday detection
    eatingOutMonthlyCount: number;
    // NEW: Average eating out count per month (for comparison)
    eatingOutMonthlyAvg: number;
}


/**
 * Result of a transaction insight evaluation
 */
export interface TransactionInsight {
    id: string;                     // Unique insight ID
    transactionId: number;          // The transaction this insight is for
    category: 'urgent' | 'action' | 'insight' | 'celebration' | 'roast';
    message: string;
    title?: string; // Derived from definition name
    icon?: string;
    priority: number;               // Higher = more important
    relatedTransactionId?: number;  // For duplicates, refunds, etc.
}

export interface TransactionTriggerResult extends TriggerResult {
    relatedTransactionId?: number;
    // Overrides
    title?: string;
    message?: string;
    category?: 'urgent' | 'action' | 'insight' | 'celebration' | 'roast';
    icon?: string;
}

/**
 * Transaction trigger evaluator function signature
 */
type TransactionTriggerEvaluator = (
    tx: TransactionForInsight,
    context: TransactionContext,
    allTransactions: TransactionForInsight[],
    params?: Record<string, unknown>
) => TransactionTriggerResult;

/**
 * Registry of transaction-level trigger evaluators
 */
export const transactionTriggerEvaluators: Record<string, TransactionTriggerEvaluator> = {
    /**
     * Duplicate transaction detection
     * Same amount + same merchant within 10 minutes
     */
    duplicate_transaction: (tx, context) => {
        // ... (existing implementation)
        if (!tx.merchant_id) return { triggered: false };
        if (tx.amount < 1.0) return { triggered: false };

        const recentSameMerchant = context.recentByMerchant.get(tx.merchant_id) || [];
        const txDate = new Date(tx.date);

        for (const other of recentSameMerchant) {
            if (other.id === tx.id) continue;

            const otherDate = new Date(other.date);
            const diffMinutes = Math.abs(txDate.getTime() - otherDate.getTime()) / (1000 * 60);

            // Same amount within 10 minutes
            if (Math.abs(other.amount - tx.amount) < 0.01 && diffMinutes <= 10) {
                return {
                    triggered: true,
                    data: {
                        amount: tx.amount.toFixed(2),
                        merchant: tx.cleaned_merchant_name || tx.merchantName,
                        timeAgo: Math.round(diffMinutes) + ' mins'
                    },
                    relatedTransactionId: other.id
                };
            }
        }

        return { triggered: false };
    },

    /**
     * New merchant detection
     */
    new_merchant: (tx, context) => {
        if (!tx.is_debit) return { triggered: false };
        const merchantName = tx.cleaned_merchant_name || tx.merchantName;
        if (!merchantName) return { triggered: false };
        if (tx.amount < 25) return { triggered: false };

        const EXCLUDED_CATEGORIES = ['Brandstof', 'Snacks', 'Koffie', 'Lunch', 'Boodschappen'];
        if (tx.category_name && EXCLUDED_CATEGORIES.some(c => tx.category_name?.includes(c))) {
            return { triggered: false };
        }

        let firstSeen: Date | undefined;
        if (tx.merchant_id) {
            firstSeen = context.merchantFirstSeen.get(tx.merchant_id);
        } else {
            firstSeen = context.merchantNameFirstSeen.get(merchantName.toLowerCase());
        }

        const txDate = new Date(tx.date);
        if (firstSeen && Math.abs(firstSeen.getTime() - txDate.getTime()) < 1000 * 60 * 60 * 24) {
            return {
                triggered: true,
                data: {
                    merchant: merchantName,
                    type: tx.amount > 10 ? 'subscription' : 'merchant'
                }
            };
        }

        return { triggered: false };
    },

    /**
     * Price hike detection (for expenses) / Income increase detection (for income)
     */
    price_hike: (tx, context) => {
        if (!tx.recurring_transaction_id) return { triggered: false };
        const lastAmount = context.recurringLastAmount.get(tx.recurring_transaction_id);
        if (!lastAmount) return { triggered: false };

        const diff = tx.amount - lastAmount;
        const percentChange = (diff / lastAmount) * 100;

        // Only trigger if there's a meaningful change (>= €0.50 or >= 5%)
        if (!(Math.abs(diff) >= 0.50 || Math.abs(percentChange) >= 5)) {
            return { triggered: false };
        }

        // For INCOME (credits): Higher is GOOD! 🎉
        if (!tx.is_debit) {
            if (diff > 0) {
                return {
                    triggered: true,
                    title: 'Income boost! 💰',
                    message: `Nice! {{merchant}} is up €{{diff}} (+{{percent}}%)`,
                    category: 'celebration',
                    icon: 'TrendingUp',
                    data: {
                        merchant: tx.cleaned_merchant_name || tx.merchantName || 'Income',
                        diff: diff.toFixed(2),
                        percent: Math.round(percentChange)
                    }
                };
            }
            // Income decreased - that's a warning
            return {
                triggered: true,
                title: 'Income dip 📉',
                message: `Heads up: {{merchant}} is down €{{diff}} ({{percent}}%)`,
                category: 'insight',
                icon: 'TrendingDown',
                data: {
                    merchant: tx.cleaned_merchant_name || tx.merchantName || 'Income',
                    diff: Math.abs(diff).toFixed(2),
                    percent: Math.abs(Math.round(percentChange))
                }
            };
        }

        // For EXPENSES (debits): Higher is BAD (inflation)
        if (diff > 0) {
            return {
                triggered: true,
                data: {
                    merchant: tx.cleaned_merchant_name || tx.merchantName || 'Subscription',
                    diff: diff.toFixed(2),
                    percent: Math.round(percentChange)
                }
            };
        }

        // Expense decreased - that's good!
        return {
            triggered: true,
            title: 'Price drop! 🎉',
            message: `{{merchant}} is €{{diff}} cheaper! ({{percent}}% less)`,
            category: 'celebration',
            icon: 'TrendingDown',
            data: {
                merchant: tx.cleaned_merchant_name || tx.merchantName || 'Subscription',
                diff: Math.abs(diff).toFixed(2),
                percent: Math.abs(Math.round(percentChange))
            }
        };
    },

    /**
     * Refund detection
     */
    refund_detected: (tx, context) => {
        if (tx.is_debit) return { triggered: false };

        const amount = Math.abs(tx.amount);
        const matchingDebits = context.debitsByAmount.get(Math.round(amount * 100)) || [];
        const txDate = new Date(tx.date);

        for (const debit of matchingDebits) {
            const debitDate = new Date(debit.date);
            const daysDiff = (txDate.getTime() - debitDate.getTime()) / (1000 * 60 * 60 * 24);

            if (daysDiff >= 1 && daysDiff <= 60) {
                const sameMerchant = tx.merchant_id && tx.merchant_id === debit.merchant_id;
                const sameAmount = Math.abs(Math.abs(tx.amount) - debit.amount) < 0.01;

                if (sameAmount && (sameMerchant || !tx.merchant_id)) {
                    return {
                        triggered: true,
                        data: {
                            date: debitDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
                            amount: amount.toFixed(2)
                        },
                        relatedTransactionId: debit.id
                    };
                }
            }
        }

        return { triggered: false };
    },

    /**
     * Salary detection (Ka-ching!)
     */
    salary_detected: (tx, context) => {
        if (tx.is_debit) return { triggered: false }; // Income only

        // 1. Explicitly specific recurring type
        if (tx.recurring_transaction_type === 'salary') {
            return {
                triggered: true,
                data: {
                    amount: tx.amount.toFixed(2),
                    merchant: tx.cleaned_merchant_name || tx.merchantName
                }
            };
        }

        // 2. Fallback: Strict keywords + Minimum Amount
        const SALARY_KEYWORDS = ['salaris', 'salary', 'loon', 'bezoldiging', 'stipendium'];
        const text = ((tx.cleaned_merchant_name || tx.merchantName || '') + ' ' + (tx.description || '')).toLowerCase();

        const matchesKeyword = SALARY_KEYWORDS.some(w => text.includes(w));

        // Assume salary is substantial (> 800) unless explicitly labeled
        if (matchesKeyword && tx.amount > 800) {
            return {
                triggered: true,
                data: {
                    amount: tx.amount.toFixed(2),
                    merchant: tx.cleaned_merchant_name || tx.merchantName
                }
            };
        }

        return { triggered: false };
    },

    /**
     * Large expense detection (Whale Alert)
     */
    large_expense: (tx, _, __, params) => {
        if (!tx.is_debit) return { triggered: false };

        // Exclude recurring transactions (bills, subscriptions, rent)
        if (tx.recurring_transaction_id) return { triggered: false };

        const threshold = (params?.threshold as number) ?? 500;

        if (tx.amount > threshold) {
            // Check for savings/investments
            const SAVINGS_TERMS = ['sparen', 'beleggen', 'brand new day', 'meesman', 'degiro', 'savings', 'invest', 'deposito'];
            const category = (tx.category_name || '').toLowerCase();
            const merchant = (tx.cleaned_merchant_name || tx.merchantName || '').toLowerCase();

            const isSavings = SAVINGS_TERMS.some(t => category.includes(t) || merchant.includes(t)) ||
                category === 'sparen & beleggen' ||
                category.includes('financial');

            if (isSavings) {
                return {
                    triggered: true,
                    title: 'Big Stash 💰',
                    message: `WOW! You moved €${tx.amount.toFixed(0)} to savings! Future you says thanks!`,
                    category: 'celebration',
                    icon: 'Sparkles',
                    data: {
                        amount: tx.amount.toFixed(0),
                        merchant: tx.cleaned_merchant_name || tx.merchantName || 'Savings'
                    }
                };
            }

            return {
                triggered: true,
                data: {
                    amount: tx.amount.toFixed(0),
                    merchant: tx.cleaned_merchant_name || tx.merchantName || 'Unknown'
                }
            };
        }
        return { triggered: false };
    },

    /**
     * Round number detection (e.g. 100.00)
     */
    round_number: (tx) => {
        const EXCLUDED_TERMS = [
            'belastingdienst', 'gemeente', 'waterschap', 'ministerie', 'duo', 'cjib', // Institutions
            'tikkie', 'betaalverzoek', 'open verzoek' // P2P / Requests
        ];

        if (tx.amount < 50) return { triggered: false };

        const text = ((tx.cleaned_merchant_name || tx.merchantName || '') + ' ' + (tx.category_name || '')).toLowerCase();
        if (EXCLUDED_TERMS.some(term => text.includes(term))) {
            return { triggered: false };
        }

        // check if amount is integer
        if (Number.isInteger(tx.amount)) {
            return {
                triggered: true,
                data: {
                    amount: tx.amount.toFixed(0)
                }
            };
        }
        return { triggered: false };
    },

    /**
     * Weekend Warrior (Fri/Sat night spending)
     */
    weekend_warrior: (tx) => {
        if (!tx.is_debit) return { triggered: false };
        if (tx.recurring_transaction_id) return { triggered: false }; // Subscriptions aren't fun weekend spending
        if (tx.amount < 15) return { triggered: false };

        const date = new Date(tx.date);
        const day = date.getDay(); // 5 = Friday, 6 = Saturday

        // Allowlist of "fun" categories
        const FUN_CATEGORIES = [
            'restaurant', 'uitgaan', 'entertainment', 'food', 'bar', 'club', 'cinema',
            'shopping', 'kleding', 'electronics', 'hobby', 'sport', 'vakantie'
        ];

        const category = (tx.category_name || '').toLowerCase();
        const hasFunCategory = FUN_CATEGORIES.some(c => category.includes(c));

        // If we have a category and it's not fun, skip. 
        // If no category, we might give it a pass or check merchant? 
        // User said "only work on... categories", so let's be strict if category exists.
        if (tx.category_name && !hasFunCategory) {
            return { triggered: false };
        }

        // Fri/Sat between 20:00 and 04:00 (technically next day for 00-04)
        // Simplified: Fri/Sat evening > 20:00. Note: DB date might be 00:00 so this relies on date match mostly
        // If we have time in description ( Night Owl logic), we could use it, but keeping it simple.
        if (day === 5 || day === 6) {
            return {
                triggered: true,
                data: {
                    day: day === 5 ? 'Friday' : 'Saturday',
                    merchant: tx.cleaned_merchant_name || tx.merchantName
                }
            };
        }
        return { triggered: false };
    },

    /**
     * Late Night (Night Owl)
     */
    late_night: (tx) => {
        if (!tx.is_debit) return { triggered: false };

        // Extract time from description (e.g. "23:45" or "02:30")
        const timeMatch = tx.description?.match(/([0-9]{1,2}):([0-9]{2})/);
        if (!timeMatch) return { triggered: false };

        const hours = parseInt(timeMatch[1], 10);

        // 23:00 - 05:00
        if (hours >= 23 || hours < 5) {
            return {
                triggered: true,
                data: {
                    time: timeMatch[0], // Use the matched string "23:45"
                    merchant: tx.cleaned_merchant_name || tx.merchantName
                }
            };
        }
        return { triggered: false };
    },

    /**
     * Potential Subscription
     */
    potential_subscription: (tx, context) => {
        if (!tx.is_debit) return { triggered: false };
        // If already marked recurring, skip
        if (tx.recurring_transaction_id) return { triggered: false };
        // If merchant explicitly ignored
        if (tx.merchant_is_potential_recurring === false) return { triggered: false };

        // Exclusions
        const EXCLUDED_TERMS = ['sparen', 'saving', 'beleggen', 'invest', 'overboeking', 'transfer', 'creditcard', 'paypal'];
        const EXCLUDED_CATEGORIES = ['Sparen & beleggen', 'Leningen & schuldaflossing', 'Hypotheek & Wonen', 'Verzekeringen']; // Maybe keep Insurance? Usually recurring.

        const text = ((tx.cleaned_merchant_name || tx.merchantName || '') + ' ' + (tx.description || '')).toLowerCase();
        if (EXCLUDED_TERMS.some(t => text.includes(t))) return { triggered: false };

        if (tx.category_name && EXCLUDED_CATEGORIES.some(c => tx.category_name?.includes(c) || c === tx.category_name)) {
            return { triggered: false };
        }

        // Look for similar amount in previous month (simplistic check from context)
        if (!tx.merchant_id) return { triggered: false };

        const history = context.recentByMerchant.get(tx.merchant_id) || [];
        const txDate = new Date(tx.date);

        const match = history.find(h => {
            if (h.id === tx.id) return false;
            const hDate = new Date(h.date);
            const days = Math.abs(txDate.getTime() - hDate.getTime()) / (1000 * 60 * 60 * 24);
            return days >= 26 && days <= 34 && Math.abs(h.amount - tx.amount) < 1;
        });

        if (match) {
            return {
                triggered: true,
                data: {
                    merchant: tx.cleaned_merchant_name || tx.merchantName,
                    amount: tx.amount.toFixed(2)
                },
                relatedTransactionId: match.id
            };
        }

        return { triggered: false };
    },

    /**
     * Merchant Comeback - first visit after 60+ day gap
     * Only triggers for recent transactions (last 30 days)
     */
    merchant_comeback: (tx, context) => {
        if (!tx.is_debit) return { triggered: false };
        if (!tx.merchant_id) return { triggered: false };

        // Only trigger for recent transactions (within last 30 days)
        const now = new Date();
        const txDate = new Date(tx.date);
        const daysSinceTransaction = Math.floor((now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceTransaction > 30) return { triggered: false };

        const lastSeen = context.merchantLastSeen.get(tx.merchant_id);
        if (!lastSeen) return { triggered: false };

        const daysSince = Math.floor((txDate.getTime() - lastSeen.getTime()) / (1000 * 60 * 60 * 24));

        if (daysSince >= 60) {
            const months = Math.floor(daysSince / 30);
            return {
                triggered: true,
                data: {
                    merchant: tx.cleaned_merchant_name || tx.merchantName,
                    months: months,
                    timeAgo: months === 1 ? '1 month' : `${months} months`
                }
            };
        }
        return { triggered: false };
    },

    /**
     * Frequent Flyer - 5+ visits to same merchant this month
     */
    frequent_flyer: (tx, context) => {
        if (!tx.is_debit) return { triggered: false };
        if (!tx.merchant_id) return { triggered: false };

        const count = context.merchantMonthlyCount.get(tx.merchant_id) || 0;

        // Only trigger on the 5th visit (not every subsequent one)
        if (count === 5) {
            return {
                triggered: true,
                data: {
                    merchant: tx.cleaned_merchant_name || tx.merchantName,
                    count: count
                }
            };
        }
        return { triggered: false };
    },

    /**
     * Category Spike - spending 2x+ higher than 3-month average
     */
    category_spike: (tx, context, allTransactions) => {
        if (!tx.is_debit) return { triggered: false };
        if (!tx.category_id) return { triggered: false };

        const avgSpending = context.categoryAvgSpending.get(tx.category_id);
        if (!avgSpending || avgSpending < 50) return { triggered: false }; // Minimum threshold

        // Calculate current month spending for this category
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const currentMonthTotal = allTransactions
            .filter(t => t.category_id === tx.category_id &&
                t.is_debit &&
                new Date(t.date) >= startOfMonth)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        const ratio = currentMonthTotal / avgSpending;

        // Only trigger once when ratio first crosses 2.0
        // Check if this transaction is the one that pushed it over
        const previousTotal = currentMonthTotal - Math.abs(tx.amount);
        const previousRatio = previousTotal / avgSpending;

        if (ratio >= 2.0 && previousRatio < 2.0) {
            return {
                triggered: true,
                data: {
                    category: tx.category_name,
                    categoryId: tx.category_id,
                    ratio: Math.round(ratio * 10) / 10,
                    currentAmount: Math.round(currentMonthTotal),
                    avgAmount: Math.round(avgSpending)
                }
            };
        }
        return { triggered: false };
    },

    /**
     * Holiday/Trip Detection - cluster of foreign/travel transactions
     */
    holiday_trip: (tx, context) => {
        if (!context.holidayTransactionIds.has(tx.id)) return { triggered: false };

        // Count how many holiday transactions are clustered around this one
        const txDate = new Date(tx.date);
        let clusterCount = 0;

        for (const id of context.holidayTransactionIds) {
            // We only have IDs, so we can just count total
            clusterCount++;
        }

        // Only trigger if there's a meaningful cluster (3+ holiday transactions)
        if (clusterCount >= 3) {
            return {
                triggered: true,
                data: {
                    merchant: tx.cleaned_merchant_name || tx.merchantName,
                    hint: '🏖️'
                }
            };
        }
        return { triggered: false };
    },

    /**
     * The Pair - merchants that frequently appear on the same day
     */
    merchant_pair: (tx, context, allTransactions) => {
        if (!tx.is_debit) return { triggered: false };
        if (!tx.merchant_id) return { triggered: false };
        // Exclude subscriptions - same-day billing is just coincidence
        if (tx.recurring_transaction_id) return { triggered: false };

        // Exclude boring categories - these aren't meaningful patterns
        const EXCLUDED_CATEGORIES = [
            'Sparen', 'Savings', 'Beleggen', 'Investments', 'Investment',
            'Verzekeringen', 'Insurance', 'Verzekering',
            'Hypotheek', 'Mortgage', 'Leningen', 'Loans',
            'Interne overboeking', 'Internal transfer', 'Transfer',
            'Creditcard', 'Credit card'
        ];
        const category = (tx.category_name || '').toLowerCase();
        if (EXCLUDED_CATEGORIES.some(c => category.includes(c.toLowerCase()))) {
            return { triggered: false };
        }

        // Helper to check if a category is boring
        const isBoringCategory = (catName: string | null | undefined): boolean => {
            if (!catName) return false;
            const cat = catName.toLowerCase();
            return EXCLUDED_CATEGORIES.some(c => cat.includes(c.toLowerCase()));
        };

        // Find if this merchant has a "pair" (appears same day 3+ times)
        for (const [pairKey, count] of context.merchantPairs.entries()) {
            if (count < 3) continue;

            const [id1, id2] = pairKey.split('-').map(Number);
            if (id1 !== tx.merchant_id && id2 !== tx.merchant_id) continue;

            const pairedMerchantId = id1 === tx.merchant_id ? id2 : id1;

            // Check if the other merchant is in today's transactions
            // Also exclude recurring and boring categories
            const txDate = new Date(tx.date).toDateString();
            const pairedTx = allTransactions.find(t =>
                t.merchant_id === pairedMerchantId &&
                new Date(t.date).toDateString() === txDate &&
                !t.recurring_transaction_id && // Exclude subscriptions
                !isBoringCategory(t.category_name) // Exclude boring categories
            );

            if (pairedTx) {
                return {
                    triggered: true,
                    data: {
                        merchant1: tx.cleaned_merchant_name || tx.merchantName,
                        merchant2: pairedTx.cleaned_merchant_name || pairedTx.merchantName || 'Unknown',
                        count: count
                    }
                };
            }
        }
        return { triggered: false };
    }
};

export interface TransactionInsight {
    id: string;                     // Unique insight ID
    transactionId: number;          // The transaction this insight is for
    category: 'urgent' | 'action' | 'insight' | 'celebration' | 'roast';
    message: string;
    title?: string; // Derived from definition name
    icon?: string;
    priority: number;               // Higher = more important
    relatedTransactionId?: number;  // For duplicates, refunds, etc.
    actionLabel?: string;
    actionHref?: string;
}

/**
 * Evaluate all transaction triggers for a single transaction
 * Now driven by database definitions
 */
export function evaluateTransactionTriggers(
    tx: TransactionForInsight,
    context: TransactionContext,
    allTransactions: TransactionForInsight[],
    definitions: {
        id: string;
        trigger: string;
        name: string | null;
        description: string | null;
        priority: number;
        category: string;
        message_template: string;
        icon: string | null;
        params?: Record<string, unknown> | null;
        action_label?: string | null;
        action_href?: string | null;
    }[]
): TransactionInsight[] {
    const insights: TransactionInsight[] = [];

    for (const def of definitions) {
        const evaluator = transactionTriggerEvaluators[def.trigger];
        if (!evaluator) continue;

        const result = evaluator(tx, context, allTransactions, def.params as Record<string, unknown> | undefined);

        if (result.triggered) {
            // Helper to fill template variables
            const fillTemplate = (template: string) => {
                return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
                    return String(result.data?.[key] ?? `{{${key}}}`);
                });
            };

            // Fill template (use custom message from result if provided, otherwise use definition template)
            const messageTemplate = result.message || def.message_template;
            const message = fillTemplate(messageTemplate);

            // Fill action href template if exists
            let actionHref: string | undefined;
            if (def.action_href) {
                actionHref = fillTemplate(def.action_href);
            }

            insights.push({
                id: def.id.startsWith(def.trigger) ? `${def.id}_${tx.id}` : `${def.id}_${tx.id}`,
                transactionId: tx.id,
                category: result.category || (def.category as any),
                message: message,
                title: result.title || def.name || undefined,
                icon: result.icon || def.icon || undefined,
                priority: def.priority,
                relatedTransactionId: result.relatedTransactionId,
                actionLabel: def.action_label ?? undefined,
                actionHref
            });
        }
    }

    // Sort by priority (highest first)
    return insights.sort((a, b) => b.priority - a.priority);
}
