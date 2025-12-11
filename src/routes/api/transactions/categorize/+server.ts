import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { categorizeTransactionsBatch, type CategorizationOptions } from '$lib/server/categorization/categorizationService';
import { db } from '$lib/server/db';
import { z } from 'zod';

// Request body schema (all fields optional)
const CategorizeRequestSchema = z.object({
	skipManual: z.boolean().optional(),
	skipCategorized: z.boolean().optional(),
	limit: z.number().int().positive().optional(),
	transactionIds: z.array(z.number().int().positive()).optional()
});

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	const userId = locals.user.id;

	try {
		// Parse and validate request body (limit and transactionIds optional)
		let options: CategorizationOptions = {
			skipManual: true, // Always skip manually assigned categories
			skipCategorized: true // Always skip already categorized transactions
		};

		try {
			const body = await request.json();
			const validated = CategorizeRequestSchema.parse(body);
			// Only allow limit and transactionIds - skipManual and skipCategorized are always true
			options = {
				skipManual: true,
				skipCategorized: true,
				limit: validated.limit,
				transactionIds: validated.transactionIds
			};
		} catch (err) {
			// If body is empty or invalid, use defaults
			if (err instanceof z.ZodError) {
				console.warn('Invalid request body, using defaults:', err.issues);
			}
			// Continue with default options (skipManual and skipCategorized already set to true)
		}

		console.log(`\n📋 API Request: Categorize transactions for user ${userId}`);
		console.log(`   Options:`, options);

		// Run categorization
		const result = await categorizeTransactionsBatch(userId, options);

		// Fetch sample transactions (5 categorized, 5 not categorized) for display
		const sampleTransactionIds = [
			...result.results.filter(r => r.categoryId && !r.skipped).slice(0, 5).map(r => r.transactionId),
			...result.results.filter(r => !r.categoryId && !r.skipped).slice(0, 5).map(r => r.transactionId)
		].slice(0, 5); // Take first 5 total

		let sampleTransactions: any[] = [];
		if (sampleTransactionIds.length > 0) {
			const transactionsRaw = await (db as any).transactions.findMany({
				where: {
					user_id: userId,
					id: { in: sampleTransactionIds }
				},
				include: {
					categories: {
						select: {
							id: true,
							name: true,
							color: true,
							icon: true
						}
					},
					merchants: {
						select: {
							id: true,
							name: true
						}
					}
				}
			});

			// Serialize to plain objects
			sampleTransactions = transactionsRaw.map((t: any) => ({
				id: t.id,
				date: t.date instanceof Date ? t.date.toISOString() : t.date,
				merchantName: t.merchantName,
				merchant_id: t.merchant_id,
				is_debit: t.is_debit,
				amount: typeof t.amount === 'object' && t.amount?.toNumber ? t.amount.toNumber() : Number(t.amount),
				type: t.type,
				description: t.description,
				category_id: t.category_id,
				category: t.categories ? {
					id: t.categories.id,
					name: t.categories.name,
					color: t.categories.color,
					icon: t.categories.icon
				} : null,
				merchant: t.merchants ? {
					id: t.merchants.id,
					name: t.merchants.name
				} : null
			}));
		}

		// Calculate stats
		const notCategorized = result.processed - result.categorized - result.skipped;
		const aiCategorized = 0; // Dummy for now

		// Return results
		return json({
			success: true,
			total: result.total,
			processed: result.processed,
			categorized: result.categorized,
			aiCategorized: aiCategorized,
			notCategorized: notCategorized,
			skipped: result.skipped,
			message: `Processed ${result.processed} transactions, categorized ${result.categorized} with keywords, ${notCategorized} remain uncategorized`,
			sampleTransactions: sampleTransactions
		});
	} catch (err) {
		console.error('❌ Error in categorization API:', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'Failed to categorize transactions');
	}
};

