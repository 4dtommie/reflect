import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.user) {
        throw error(401, 'Not authenticated');
    }

    try {
        const { transactionId } = await request.json();

        if (!transactionId) {
            throw error(400, 'Transaction ID is required');
        }

        // Fetch transaction to find merchant
        const tx = await db.transactions.findUnique({
            where: {
                id: transactionId,
                user_id: locals.user.id
            },
            include: { merchants: true } // Assuming relation name is 'merchants' but mapped? Checking schema... relation is 'merchants'
        });

        // Schema says: merchants merchants? @relation(...)
        // So include: { merchants: true }

        if (!tx) {
            throw error(404, 'Transaction not found');
        }

        if (!tx.merchant_id) {
            console.log('[API/ignore] Transaction has no merchant, cannot ignore merchant-based pattern');
            return json({ success: false, message: 'No merchant linked' });
        }

        // Update merchant
        await db.merchants.update({
            where: { id: tx.merchant_id },
            data: { is_potential_recurring: false }
        });

        console.log(`[API] Set merchant ${tx.merchant_id} (${tx.merchantName}) as NOT potential recurring`);

        return json({ success: true });

    } catch (err: any) {
        console.error('Error ignoring subscription:', err);
        throw error(500, err.message || 'Failed to ignore subscription');
    }
};
