import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import {
	categorizeBatchWithAI,
	addSuggestedKeywords,
	batchTransactions,
	type TransactionForAI
} from '$lib/server/categorization/aiCategorizer';
import { isAIAvailable, aiConfig } from '$lib/server/categorization/config';

/**
 * Test endpoint for AI categorization
 * Allows testing with specific transactions and seeing detailed results
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	if (!isAIAvailable()) {
		return json({
			success: false,
			results: [],
			errors: [],
			error: 'OpenAI API is not configured. Please set OPENAI_API_KEY environment variable in your .env file.',
			details: 'Set OPENAI_API_KEY environment variable to enable AI categorization'
		}, { status: 400 });
	}

	const userId = locals.user.id;

	try {
		const body = await request.json();
		const { transactionIds, batchSize, model, reasoningEffort, verbosity, includeReasoning, temperature } = body;

		if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
			return json({
				success: false,
				results: [],
				errors: [],
				error: 'transactionIds array is required and must not be empty'
			}, { status: 400 });
		}

		console.log(`🧪 Testing AI categorization with ${transactionIds.length} transactions...`);

		// Fetch transactions from database
		const transactions = await (db as any).transactions.findMany({
			where: {
				id: { in: transactionIds },
				user_id: userId
			},
			select: {
				id: true,
				description: true,
				merchantName: true,
				counterparty_iban: true,
				amount: true,
				type: true,
				is_debit: true,
				date: true
			}
		});

		if (transactions.length === 0) {
			return json({
				success: false,
				results: [],
				errors: [],
				error: 'No transactions found with the provided IDs'
			}, { status: 404 });
		}

		if (transactions.length !== transactionIds.length) {
			console.warn(
				`⚠️  Requested ${transactionIds.length} transactions but found ${transactions.length}`
			);
		}

		// Convert to TransactionForAI format
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

		// Split into batches if batchSize is specified
		const batches = batchSize && batchSize > 0
			? batchTransactions(transactionsForAI, batchSize)
			: [transactionsForAI];

		console.log(`   📦 Processing ${batches.length} batch(es)...`);

		// Process all batches
		const allResults: any[] = [];
		const allErrors: Array<{ transactionId: number; error: string }> = [];
		let totalTokens = { prompt: 0, completion: 0, total: 0 };
		const prompts: string[] = []; // Store prompts for debugging

		for (let i = 0; i < batches.length; i++) {
			const batch = batches[i];
			console.log(`   🔄 Processing batch ${i + 1}/${batches.length} (${batch.length} transactions)...`);

			try {
				const batchResult = await categorizeBatchWithAI(userId, batch, model, {
					reasoningEffort: reasoningEffort || 'minimal',
					verbosity: verbosity || 'low',
					includeReasoning: includeReasoning ?? false,
					temperature
				});

				allResults.push(...batchResult.results);
				allErrors.push(...batchResult.errors);

				if (batchResult.tokensUsed) {
					totalTokens.prompt += batchResult.tokensUsed.prompt;
					totalTokens.completion += batchResult.tokensUsed.completion;
					totalTokens.total += batchResult.tokensUsed.total;
				}

				// Store prompt for debugging (use the last batch's prompt if multiple batches)
				if (batchResult.prompt) {
					prompts.push(batchResult.prompt);
				}
			} catch (err) {
				console.error(`   ❌ Error processing batch ${i + 1}:`, err);
				// Add errors for all transactions in this batch
				for (const transaction of batch) {
					allErrors.push({
						transactionId: transaction.id,
						error: err instanceof Error ? err.message : 'Unknown error processing batch'
					});
				}
			}
		}

		// Add suggested keywords to database (for testing, we'll do this but log it)
		let keywordsAdded = 0;
		if (allResults.length > 0) {
			try {
				keywordsAdded = await addSuggestedKeywords(allResults);
				console.log(`   ✅ Added ${keywordsAdded} suggested keywords to database`);
			} catch (err) {
				console.warn('   ⚠️  Failed to add suggested keywords:', err);
			}
		}

		const success = allErrors.length === 0 && allResults.length > 0;

		console.log(`   ✨ Test complete:`);
		console.log(`      - Results: ${allResults.length}`);
		console.log(`      - Errors: ${allErrors.length}`);
		console.log(`      - Keywords added: ${keywordsAdded}`);
		console.log(`      - Total tokens: ${totalTokens.total}`);

		// Load category names for mapping
		const categoryMap = new Map<number, string>();
		try {
			const categories = await (db as any).categories.findMany({
				where: {
					OR: [
						{ is_default: true },
						{ created_by: userId }
					]
				},
				select: {
					id: true,
					name: true
				}
			});
			for (const cat of categories) {
				categoryMap.set(cat.id, cat.name);
			}
		} catch (err) {
			console.warn('Failed to load category names:', err);
		}

		// Create a map of transaction IDs to original data for debugging
		const transactionDataMap = new Map<number, { merchantName: string; description: string; counterpartyIban: string | null; type: string }>();
		for (const t of transactions) {
			transactionDataMap.set(t.id, {
				merchantName: t.merchantName,
				description: t.description,
				counterpartyIban: t.counterparty_iban,
				type: t.type
			});
		}

		// Map category IDs to names in results and add original transaction data
		const resultsWithCategoryNames = allResults.map(result => {
			const originalData = transactionDataMap.get(result.transactionId);
			return {
				...result,
				categoryName: result.categoryId ? categoryMap.get(result.categoryId) || `Category ${result.categoryId}` : null,
				originalMerchantName: originalData?.merchantName || '',
				originalDescription: originalData?.description || '',
				hasCounterpartyIban: !!originalData?.counterpartyIban,
				transactionType: originalData?.type || 'Other'
			};
		});

		return json({
			success,
			results: resultsWithCategoryNames,
			errors: allErrors,
			tokensUsed: totalTokens.total > 0 ? totalTokens : undefined,
			keywordsAdded,
			batchCount: batches.length,
			prompt: prompts.length > 0 ? prompts[prompts.length - 1] : undefined, // Return the last prompt (or first if only one)
			model: model || aiConfig.model // Return which model was used
		});
	} catch (err: any) {
		console.error('❌ Test error:', err);

		if (err.status) {
			throw err; // Re-throw SvelteKit errors
		}

		throw error(500, {
			message: 'Failed to test AI categorization',
			details: err.message || 'Unknown error'
		});
	}
};

