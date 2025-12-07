import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { RecurringDetectionService } from '$lib/server/recurring/recurringDetectionService';
import { VariableSpendingService } from '$lib/server/recurring/variableSpendingService';
import { recurringService } from '$lib/server/recurring/recurringService';

export const POST: RequestHandler = async ({ locals }) => {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Run both detection services
        const detectionService = new RecurringDetectionService();
        const variableService = new VariableSpendingService();

        const [recurringCandidates, variablePatterns] = await Promise.all([
            detectionService.detectRecurringTransactions(locals.user.id),
            variableService.detectVariableSpending(locals.user.id)
        ]);

        // Backfill categories for any patterns that don't have one
        const backfilledCount = await recurringService.backfillCategories(locals.user.id);

        return json({
            candidates: recurringCandidates,
            variableSpending: variablePatterns,
            backfilledCategories: backfilledCount
        });
    } catch (error) {
        console.error('Error detecting recurring transactions:', error);
        return json({ error: 'Internal Server Error' }, { status: 500 });
    }
};
