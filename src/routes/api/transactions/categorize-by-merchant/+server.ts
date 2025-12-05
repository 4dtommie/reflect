import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

export const POST: RequestHandler = async ({ request, locals }) => {
    const user = locals.user;
    if (!user) {
        throw error(401, 'Unauthorized');
    }

    try {
        const { merchantName, categoryId } = await request.json();

        if (!merchantName) {
            throw error(400, 'Merchant name is required');
        }
        if (!categoryId) {
            throw error(400, 'Category ID is required');
        }

        // Update all transactions for this merchant that are uncategorized or "Niet gecategoriseerd"
        // We also update the merchant name to ensure consistency if the user edited it
        const result = await db.transactions.updateMany({
            where: {
                user_id: user.id,
                merchantName: merchantName, // Exact match for now, maybe fuzzy later?
                OR: [
                    { category_id: null },
                    { categories: { name: 'Niet gecategoriseerd' } },
                    { categories: { name: 'Uncategorized' } }
                ]
            },
            data: {
                category_id: categoryId,
                category_confidence: 0.95,
                // We don't update merchantName here because we are matching BY merchantName.
                // If the user wants to rename the merchant, that's a different operation.
                // But wait, ManualCategorizeModal allows editing merchant name.
                // If they edit it, they probably want to rename the merchant for ALL these transactions.
                // But updateMany doesn't support setting merchantName to a new value based on the old one easily if we are just matching.
                // Actually, if we match by `merchantName` (old), we CAN set `merchantName` (new).
            }
        });

        // If the user provided a DIFFERENT merchant name (renaming), we should handle that.
        // But the modal passes `merchantName` which is the *new* name.
        // So we need the *original* merchant name to find the transactions.
        // The current API design just takes `merchantName`.
        // If I want to support renaming, I need `originalMerchantName` and `newMerchantName`.
        // For now, let's assume no renaming for the "bulk categorize" feature to keep it simple,
        // OR we assume the `merchantName` passed IS the one to match.
        // The user said "categorize all... to the same category".
        // If they change the name in the modal, it might be ambiguous.
        // Let's stick to categorizing for now.

        return json({ success: true, count: result.count });
    } catch (e) {
        console.error('Error categorizing by merchant:', e);
        throw error(500, 'Failed to categorize transactions');
    }
};
