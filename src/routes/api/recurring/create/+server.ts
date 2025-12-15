import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.user) {
        throw error(401, 'Not authenticated');
    }

    try {
        const { transactionId, interval = 'monthly', linkedTransactionIds = [], name, mergeMerchant = false, type } = await request.json();

        if (!transactionId) {
            throw error(400, 'Transaction ID is required');
        }

        // Fetch original transaction
        const tx = await db.transactions.findUnique({
            where: {
                id: transactionId,
                user_id: locals.user.id
            }
        });

        if (!tx) {
            throw error(404, 'Transaction not found');
        }

        // Collect all IDs to update
        const allIds = Array.from(new Set([transactionId, ...linkedTransactionIds]));

        // Calculate next date (naive)
        const date = new Date(tx.date);
        const nextDate = new Date(date);
        if (interval === 'monthly') nextDate.setMonth(date.getMonth() + 1);
        else if (interval === 'yearly') nextDate.setFullYear(date.getFullYear() + 1);
        else nextDate.setDate(date.getDate() + 30); // Default

        // Create recurring profile
        const recurring = await db.recurringTransaction.create({
            data: {
                user_id: locals.user.id,
                name: name || tx.cleaned_merchant_name || tx.merchantName || 'Subscription',
                amount: tx.amount,
                interval: interval,
                status: 'active',
                type: type || 'subscription',
                merchant_id: tx.merchant_id,
                category_id: tx.category_id,
                is_debit: tx.is_debit,
                next_expected_date: nextDate
            }
        });

        // Update all linked transactions
        const updateData: any = {
            recurring_transaction_id: recurring.id
        };

        if (mergeMerchant && name) {
            updateData.cleaned_merchant_name = name;
        }

        await db.transactions.updateMany({
            where: {
                id: { in: allIds },
                user_id: locals.user.id
            },
            data: updateData
        });

        console.log(`[API] Created recurring manual entry ${recurring.id} from tx ${tx.id}`);

        return json({ success: true, recurring });

    } catch (err: any) {
        console.error('Error creating recurring transaction:', err);
        throw error(500, err.message || 'Failed to create recurring transaction');
    }
};
