/**
 * Low Confidence Recategorization Service
 * 
 * For transactions categorized with low confidence (50-65%),
 * sends them to OpenAI (gpt-5-mini) for detailed review with search grounding.
 * Uses the same model/settings as the manual categorization modal for best accuracy.
 */

import { db } from '$lib/server/db';
import { categorizeBatchWithOpenAI } from './openaiCategorizer';
import { isAIAvailable, aiConfig } from './config';

// ============================================================================
// TYPES
// ============================================================================

interface LowConfidenceTransaction {
    id: number;
    description: string;
    merchantName: string;
    amount: number;
    date: Date;
    category_id: number | null;
    categoryName: string | null;
    category_confidence: number | null;
    merchant_id: number | null;
}

interface RecategorizationResult {
    totalCandidates: number;
    processed: number;
    improved: number;
    unchanged: number;
    errors: number;
    changes: RecategorizationChange[];
}

interface RecategorizationChange {
    transactionId: number;
    merchantName: string;
    amount: number;
    fromCategory: string;
    toCategory: string;
    oldConfidence: number;
    newConfidence: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_OPTIONS = {
    minConfidence: 0.50,  // Lower bound of "low confidence"
    maxConfidence: 0.65,  // Upper bound of "low confidence"
    batchSize: 10,        // Transactions per AI batch
    minNewConfidence: 0.75, // Only apply if new confidence is above this
    maxTransactions: 100, // Max transactions to process per run
};

// ============================================================================
// MAIN LOGIC
// ============================================================================

/**
 * Get transactions with low confidence scores
 */
async function getLowConfidenceTransactions(
    userId: number,
    options: typeof DEFAULT_OPTIONS
): Promise<LowConfidenceTransaction[]> {
    const transactions = await db.transactions.findMany({
        where: {
            user_id: userId,
            is_category_manual: false,
            category_confidence: {
                gte: options.minConfidence,
                lt: options.maxConfidence
            }
        },
        select: {
            id: true,
            description: true,
            merchantName: true,
            amount: true,
            date: true,
            category_id: true,
            category_confidence: true,
            merchant_id: true,
            categories: {
                select: { name: true }
            }
        },
        take: options.maxTransactions,
        orderBy: { category_confidence: 'asc' } // Lowest confidence first
    });

    return transactions.map((tx: {
        id: number;
        description: string;
        merchantName: string;
        amount: unknown;
        date: Date;
        category_id: number | null;
        category_confidence: number | null;
        merchant_id: number | null;
        categories: { name: string } | null;
    }) => ({
        id: tx.id,
        description: tx.description,
        merchantName: tx.merchantName,
        amount: Number(tx.amount),
        date: tx.date,
        category_id: tx.category_id,
        categoryName: tx.categories?.name || null,
        category_confidence: tx.category_confidence,
        merchant_id: tx.merchant_id
    }));
}

/**
 * Recategorize low-confidence transactions using AI
 */
export async function recategorizeLowConfidence(
    userId: number,
    options: Partial<typeof DEFAULT_OPTIONS> = {}
): Promise<RecategorizationResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    console.log(`\n🔄 Low-Confidence Recategorization for user ${userId}`);
    console.log(`   Confidence range: ${opts.minConfidence * 100}% - ${opts.maxConfidence * 100}%`);

    // Check if AI is available
    if (!isAIAvailable()) {
        console.log('   ⚠️ OpenAI not available, skipping recategorization');
        return {
            totalCandidates: 0,
            processed: 0,
            improved: 0,
            unchanged: 0,
            errors: 0,
            changes: []
        };
    }

    // Get candidates
    const candidates = await getLowConfidenceTransactions(userId, opts);
    console.log(`   Found ${candidates.length} transactions with low confidence`);

    if (candidates.length === 0) {
        return {
            totalCandidates: 0,
            processed: 0,
            improved: 0,
            unchanged: 0,
            errors: 0,
            changes: []
        };
    }

    const result: RecategorizationResult = {
        totalCandidates: candidates.length,
        processed: 0,
        improved: 0,
        unchanged: 0,
        errors: 0,
        changes: []
    };

    // Process in batches
    const batches: LowConfidenceTransaction[][] = [];
    for (let i = 0; i < candidates.length; i += opts.batchSize) {
        batches.push(candidates.slice(i, i + opts.batchSize));
    }

    console.log(`   Processing ${batches.length} batches of ${opts.batchSize}...`);

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
        const batch = batches[batchIdx];
        console.log(`   Batch ${batchIdx + 1}/${batches.length}: ${batch.length} transactions`);

        try {
            // Format transactions for AI
            const txsForAI = batch.map(tx => ({
                id: tx.id,
                description: tx.description,
                merchantName: tx.merchantName,
                amount: tx.amount,
                type: 'Payment' as const,
                date: tx.date.toISOString(),
                is_debit: true
            }));

            // Call OpenAI with search grounding (same as manual modal)
            const aiResult = await categorizeBatchWithOpenAI(userId, txsForAI, 'gpt-5-mini', {
                includeReasoning: true,
                includeCleanedMerchantName: true,
                enableSearchGrounding: true,
                useCategoryNames: true,
                temperature: 0.3,
                maxTokens: 4000
            });

            // Process results
            for (const aiTx of aiResult.results) {
                const original = batch.find(t => t.id === aiTx.transactionId);
                if (!original) continue;

                result.processed++;

                // Check if AI suggested a different category with higher confidence
                if (
                    aiTx.categoryId !== null &&
                    aiTx.categoryId !== original.category_id &&
                    aiTx.confidence >= opts.minNewConfidence
                ) {
                    // Get new category name
                    const newCategory = await db.categories.findUnique({
                        where: { id: aiTx.categoryId },
                        select: { name: true }
                    });

                    if (newCategory) {
                        const change: RecategorizationChange = {
                            transactionId: aiTx.transactionId,
                            merchantName: original.merchantName,
                            amount: original.amount,
                            fromCategory: original.categoryName || 'Unknown',
                            toCategory: newCategory.name,
                            oldConfidence: original.category_confidence || 0,
                            newConfidence: aiTx.confidence
                        };

                        result.changes.push(change);
                        result.improved++;

                        console.log(`     ✓ ${original.merchantName.substring(0, 25).padEnd(25)} : ${change.fromCategory} (${(change.oldConfidence * 100).toFixed(0)}%) → ${change.toCategory} (${(change.newConfidence * 100).toFixed(0)}%)`);

                        // Apply the change
                        await db.transactions.update({
                            where: { id: aiTx.transactionId },
                            data: {
                                category_id: aiTx.categoryId,
                                category_confidence: aiTx.confidence,
                                updated_at: new Date()
                            }
                        });
                    }
                } else {
                    result.unchanged++;
                }
            }
        } catch (error) {
            console.error(`     ❌ Batch ${batchIdx + 1} failed:`, error);
            result.errors += batch.length;
        }
    }

    // Summary
    console.log(`\n📊 Recategorization Summary:`);
    console.log(`   Candidates: ${result.totalCandidates}`);
    console.log(`   Processed: ${result.processed}`);
    console.log(`   Improved: ${result.improved}`);
    console.log(`   Unchanged: ${result.unchanged}`);
    console.log(`   Errors: ${result.errors}`);

    return result;
}

// ============================================================================
// EXPORTS
// ============================================================================

export { type RecategorizationResult, type RecategorizationChange };
