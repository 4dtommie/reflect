import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ request, params, locals }) => {
    if (!locals.user) {
        throw error(401, 'Not authenticated');
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
        throw error(400, 'Invalid recurring ID');
    }

    try {
        const body = await request.json();
        const { category_id } = body;

        // Verify ownership
        const recurring = await db.recurringTransaction.findFirst({
            where: {
                id,
                user_id: locals.user.id
            }
        });

        if (!recurring) {
            throw error(404, 'Recurring transaction not found');
        }

        // Update the recurring transaction
        const updated = await db.recurringTransaction.update({
            where: { id },
            data: {
                category_id: category_id ?? null
            }
        });

        // Also update all linked transactions to have the same category
        if (category_id) {
            await db.transactions.updateMany({
                where: {
                    recurring_transaction_id: id,
                    user_id: locals.user.id
                },
                data: {
                    category_id
                }
            });
        }

        return json({ success: true, recurring: updated });

    } catch (err: any) {
        console.error('Error updating recurring transaction:', err);
        if (err.status) throw err;
        throw error(500, err.message || 'Failed to update recurring transaction');
    }
};
