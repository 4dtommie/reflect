import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updateTransactionCategory } from '$lib/server/categorization/categorizationService';

export const POST: RequestHandler = async ({ request, params, locals }) => {
    const user = locals.user;
    if (!user) {
        throw error(401, 'Unauthorized');
    }

    const transactionId = parseInt(params.id);
    if (isNaN(transactionId)) {
        throw error(400, 'Invalid transaction ID');
    }

    try {
        const { categoryId, merchantName } = await request.json();

        if (!categoryId) {
            throw error(400, 'Category ID is required');
        }
        if (!merchantName) {
            throw error(400, 'Merchant name is required');
        }

        await updateTransactionCategory(user.id, transactionId, categoryId, merchantName);

        return json({ success: true });
    } catch (e) {
        console.error('Error updating transaction:', e);
        throw error(500, e instanceof Error ? e.message : 'Failed to update transaction');
    }
};
