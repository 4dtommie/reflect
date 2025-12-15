import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getTransactionInsightsFlat } from '$lib/server/insights/insightEngine';
import type { TransactionForInsight } from '$lib/server/insights/triggerEvaluators';

/**
 * Get transaction-level insights for a batch of transactions
 * POST because we send transaction data in the body
 */
export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.user) {
        throw error(401, 'Not authenticated');
    }

    const userId = locals.user.id;

    try {
        const body = await request.json();
        const transactions: TransactionForInsight[] = body.transactions || [];

        if (transactions.length === 0) {
            return json({ insights: [], insightsByTransaction: {} });
        }

        // Evaluate all transactions against patterns
        const insights = await getTransactionInsightsFlat(userId, transactions);

        // Also group by transaction for easy lookup
        const insightsByTransaction: Record<number, typeof insights> = {};
        for (const insight of insights) {
            if (!insightsByTransaction[insight.transactionId]) {
                insightsByTransaction[insight.transactionId] = [];
            }
            insightsByTransaction[insight.transactionId].push(insight);
        }

        return json({
            insights,
            insightsByTransaction,
            count: insights.length
        });
    } catch (err: any) {
        console.error('Error evaluating transaction insights:', err);
        throw error(500, err.message || 'Failed to evaluate insights');
    }
};
