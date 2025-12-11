import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

export const POST: RequestHandler = async ({ request, locals }) => {
    const user = locals.user;
    if (!user) {
        throw error(401, 'Unauthorized');
    }

    try {
        const { merchantName, categoryId, merchantId } = await request.json();

        if (!merchantName && !merchantId) {
            throw error(400, 'Merchant name or merchant ID is required');
        }
        if (!categoryId) {
            throw error(400, 'Category ID is required');
        }

        let count = 0;
        let merchantIdToUpdate = merchantId;

        // Strategy: If we have merchantId, use that. Otherwise, find transactions by merchantName
        // and get their merchant_id to update all related transactions.

        if (!merchantIdToUpdate && merchantName) {
            // Find a transaction with this merchantName to get the merchant_id
            const sampleTransaction = await db.transactions.findFirst({
                where: {
                    user_id: user.id,
                    merchantName: merchantName
                },
                select: { merchant_id: true }
            });
            merchantIdToUpdate = sampleTransaction?.merchant_id;
        }

        if (merchantIdToUpdate) {
            // Update ALL transactions linked to this merchant (regardless of raw merchantName)
            const result = await db.transactions.updateMany({
                where: {
                    user_id: user.id,
                    merchant_id: merchantIdToUpdate,
                    OR: [
                        { category_id: null },
                        { categories: { name: 'Niet gecategoriseerd' } },
                        { categories: { name: 'Uncategorized' } }
                    ]
                },
                data: {
                    category_id: categoryId,
                    category_confidence: 1.0, // Manual = high confidence
                    is_category_manual: true
                }
            });
            count = result.count;

            // Also update the merchant's default_category_id so future transactions get this category
            await db.merchants.update({
                where: { id: merchantIdToUpdate },
                data: {
                    default_category_id: categoryId,
                    updated_at: new Date()
                }
            });
        } else {
            // Fallback: No merchant_id found, use exact merchantName match
            const result = await db.transactions.updateMany({
                where: {
                    user_id: user.id,
                    merchantName: merchantName,
                    OR: [
                        { category_id: null },
                        { categories: { name: 'Niet gecategoriseerd' } },
                        { categories: { name: 'Uncategorized' } }
                    ]
                },
                data: {
                    category_id: categoryId,
                    category_confidence: 1.0,
                    is_category_manual: true
                }
            });
            count = result.count;
        }

        return json({ success: true, count });
    } catch (e) {
        console.error('Error categorizing by merchant:', e);
        throw error(500, 'Failed to categorize transactions');
    }
};
