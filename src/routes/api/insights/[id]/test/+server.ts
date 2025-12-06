import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSpecificInsight, getInsightData } from '$lib/server/insights/insightEngine';
import { evaluateTrigger } from '$lib/server/insights/triggerEvaluators';
import { db } from '$lib/server/db';

/**
 * POST /api/insights/[id]/test - Test/preview an insight for the current user
 */
export const POST: RequestHandler = async ({ params, locals }) => {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const userId = locals.user.id;

    try {
        // Get the insight definition
        const def = await db.insightDefinition.findUnique({ where: { id } });
        if (!def) {
            return json({ error: 'Insight not found' }, { status: 404 });
        }

        // Get user's insight data for context
        const userData = await getInsightData(userId);

        // Evaluate the trigger
        const triggerParams = def.trigger_params as Record<string, unknown> | null;
        const result = evaluateTrigger(def.trigger, userData, triggerParams ?? undefined);

        // Fill template if triggered
        let message = def.message_template;
        if (result.triggered && result.data) {
            message = def.message_template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
                return String(result.data?.[key] ?? `{{${key}}}`);
            });
        }

        return json({
            id: def.id,
            triggered: result.triggered,
            message,
            triggerData: result.data ?? {},
            userData: {
                totalTransactions: userData.totalTransactions,
                uncategorizedPercentage: userData.uncategorizedPercentage,
                monthlyIncome: userData.monthlyIncome,
                monthlyExpenses: userData.monthlyExpenses,
                upcomingPaymentsCount: userData.upcomingPayments.length,
                latePaymentsCount: userData.latePayments.length
            }
        });
    } catch (error) {
        console.error('Error testing insight:', error);
        return json({ error: 'Failed to test insight' }, { status: 500 });
    }
};
