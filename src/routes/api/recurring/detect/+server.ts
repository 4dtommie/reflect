import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { RecurringDetectionService } from '$lib/server/recurring/recurringDetectionService';
import { db } from '$lib/server/db';

export const POST: RequestHandler = async ({ locals }) => {
    if (!locals.user) {
        return new Response('Unauthorized', { status: 401 });
    }

    const service = new RecurringDetectionService();
    const candidates = await service.detectRecurringTransactions(locals.user.id);

    return json({ candidates });
};
