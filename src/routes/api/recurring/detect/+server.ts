import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { RecurringDetectionService } from '$lib/server/recurring/recurringDetectionService';

export const POST: RequestHandler = async ({ locals }) => {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const service = new RecurringDetectionService();
        const candidates = await service.detectRecurringTransactions(locals.user.id);

        return json({ candidates });
    } catch (error) {
        console.error('Error detecting recurring transactions:', error);
        return json({ error: 'Internal Server Error' }, { status: 500 });
    }
};
