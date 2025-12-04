import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { categorizeSingleTransactionWithAI } from '$lib/server/categorization/categorizationService';

export const POST: RequestHandler = async ({ request, locals }) => {
    const user = locals.user;
    if (!user) {
        throw error(401, 'Unauthorized');
    }

    try {
        const { transactionId } = await request.json();

        if (!transactionId) {
            throw error(400, 'Transaction ID is required');
        }

        const result = await categorizeSingleTransactionWithAI(user.id, transactionId);

        return json(result);
    } catch (e) {
        console.error('Error categorizing transaction:', e);
        throw error(500, e instanceof Error ? e.message : 'Failed to categorize transaction');
    }
};
