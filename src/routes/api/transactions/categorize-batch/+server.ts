import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { categorizeBatchWithOpenAI } from '$lib/server/categorization/openaiCategorizer';
import type { RequestHandler } from './$types';
import type { TransactionForAI } from '$lib/server/categorization/aiCategorizer';

export const POST: RequestHandler = async ({ request, locals }) => {
    const user = locals.user;
    if (!user) {
        return new Response('Unauthorized', { status: 401 });
    }

    const userId = user.id;
    const { transactionIds } = await request.json();

    if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
        return json({ error: 'Invalid transactionIds' }, { status: 400 });
    }

    // Limit batch size to prevent timeouts
    if (transactionIds.length > 5) {
        return json({ error: 'Batch size limit exceeded (max 5)' }, { status: 400 });
    }

    console.log(`[Batch AI] Processing ${transactionIds.length} transactions for user ${userId}`);

    try {
        // 1. Fetch transaction details
        const transactions = await (db as any).transactions.findMany({
            where: {
                id: { in: transactionIds },
                user_id: userId
            },
            select: {
                id: true,
                description: true,
                merchantName: true,
                amount: true,
                type: true,
                is_debit: true,
                date: true
            }
        });

        if (transactions.length === 0) {
            return json({ results: [] });
        }

        // 2. Prepare for AI
        const transactionsForAI: TransactionForAI[] = transactions.map((t: any) => ({
            id: t.id,
            description: t.description || '',
            merchantName: t.merchantName || '',
            amount: typeof t.amount === 'object' && t.amount?.toNumber
                ? t.amount.toNumber()
                : Number(t.amount),
            type: t.type,
            is_debit: t.is_debit,
            date: t.date instanceof Date ? t.date.toISOString() : t.date
        }));

        // 3. Call OpenAI with Deep AI settings
        // Model: gpt-5-mini
        // Features: Search Grounding, Reasoning, Cleaned Merchant Name
        console.log(`[Batch AI] Calling OpenAI...`);

        const batchResult = await categorizeBatchWithOpenAI(
            userId,
            transactionsForAI,
            'gpt-5-mini',
            {
                includeReasoning: true,
                includeCleanedMerchantName: true,
                enableSearchGrounding: true,
                useCategoryNames: true,
                temperature: 0.3,
                maxTokens: 4000
            }
        );

        console.log(`[Batch AI] OpenAI response received. Results: ${batchResult.results.length}`);

        return json({ results: batchResult.results });
    } catch (error) {
        console.error('[Batch AI] Error:', error);
        return json({ error: 'Failed to categorize transactions' }, { status: 500 });
    }
};
