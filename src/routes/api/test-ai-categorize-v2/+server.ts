import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import {
	categorizeBatchWithAI,
	type TransactionForAI
} from '$lib/server/categorization/aiCategorizer';
import { categorizeBatchWithGemini } from '$lib/server/categorization/geminiCategorizer';
import { isAIAvailable, isGeminiAvailable, aiConfig, geminiConfig } from '$lib/server/categorization/config';
import { createCategorizationPrompt } from '$lib/server/categorization/aiCategorizer';
import { loadCategoriesForAI } from '$lib/server/categorization/aiCategorizer';

/**
 * Test endpoint for AI categorization v2
 * Fetches random uncategorized transactions and categorizes them
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	// Check if at least one provider is available
	const openaiAvailable = isAIAvailable();
	const geminiAvailable = isGeminiAvailable();

	console.log(`🔍 Provider availability check:`, {
		openaiAvailable,
		geminiAvailable,
		openaiApiKeySet: !!process.env.OPENAI_API_KEY,
		geminiApiKeySet: !!process.env.GEMINI_API_KEY
	});

	if (!openaiAvailable && !geminiAvailable) {
		return json({
			success: false,
			results: [],
			errors: [],
			error: 'No AI provider is configured. Please set OPENAI_API_KEY or GEMINI_API_KEY environment variable in your .env file.',
			details: 'Set at least one API key to enable AI categorization'
		}, { status: 400 });
	}

	const userId = locals.user.id;

	try {
		const body = await request.json();
		const {
			transactionCount,
			openaiModel,
			geminiModel,
			temperature,
			maxTokens,
			includeReasoning,
			reasoningEffort,
			verbosity,
			enableSearchGrounding,
			enableMerchantNameCleaning,
			useCategoryNames
		} = body;

		if (!transactionCount || transactionCount < 1 || transactionCount > 20) {
			return json({
				success: false,
				results: [],
				errors: [],
				error: 'transactionCount must be between 1 and 20'
			}, { status: 400 });
		}

		console.log(`🧪 Testing AI categorization with ${transactionCount} random transactions...`);

		// Fetch all uncategorized transactions (we'll randomly select from them)
		const allTransactions = await (db as any).transactions.findMany({
			where: {
				user_id: userId,
				category_id: null
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

		// Shuffle array for true randomness and take requested count
		const shuffled = [...allTransactions].sort(() => Math.random() - 0.5);
		const selectedTransactions = shuffled.slice(0, transactionCount);

		if (selectedTransactions.length === 0) {
			return json({
				success: false,
				results: [],
				errors: [],
				error: 'No uncategorized transactions found'
			}, { status: 404 });
		}

		// Convert to TransactionForAI format
		const transactionsForAI: TransactionForAI[] = selectedTransactions.map((t: any) => ({
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

		// Load categories and create prompt for display (using same settings as actual categorization)
		const categories = await loadCategoriesForAI(userId);
		const prompt = createCategorizationPrompt(
			categories,
			transactionsForAI,
			includeReasoning ?? true,
			enableMerchantNameCleaning ?? false,
			useCategoryNames ?? false
		);

		// Track timing for both providers
		const startTime = Date.now();
		let openaiStartTime = 0;
		let geminiStartTime = 0;
		let openaiEndTime = 0;
		let geminiEndTime = 0;

		// Run both providers in parallel if both are available
		const [openaiResult, geminiResult] = await Promise.allSettled([
			openaiAvailable
				? (async () => {
					openaiStartTime = Date.now();
					const result = await categorizeBatchWithAI(userId, transactionsForAI, openaiModel || aiConfig.model, {
						reasoningEffort: reasoningEffort || 'low',
						verbosity: verbosity || 'low',
						includeReasoning: includeReasoning ?? true,
						temperature,
						maxTokens: maxTokens || 2000,
						includeCleanedMerchantName: enableMerchantNameCleaning ?? false,
						useCategoryNames: useCategoryNames ?? false
					});
					openaiEndTime = Date.now();
					return result;
				})()
				: Promise.resolve(null),
			geminiAvailable
				? (async () => {
					geminiStartTime = Date.now();
					const result = await categorizeBatchWithGemini(userId, transactionsForAI, geminiModel || geminiConfig.model, {
						includeReasoning: includeReasoning ?? true,
						temperature,
						maxTokens: maxTokens || 2000,
						enableSearchGrounding: enableSearchGrounding ?? false,
						includeCleanedMerchantName: enableMerchantNameCleaning ?? false,
						useCategoryNames: useCategoryNames ?? false
					});
					geminiEndTime = Date.now();
					return result;
				})()
				: Promise.resolve(null)
		]);

		// Process results
		let openaiBatchResult = null;
		let geminiBatchResult = null;

		if (openaiResult.status === 'fulfilled' && openaiResult.value) {
			openaiBatchResult = openaiResult.value;
			console.log('✅ OpenAI categorization succeeded');
		} else if (openaiResult.status === 'rejected') {
			console.error('❌ OpenAI categorization failed:', openaiResult.reason);
		} else {
			console.log('⚠️ OpenAI result was null or not available');
		}

		if (geminiResult.status === 'fulfilled' && geminiResult.value) {
			geminiBatchResult = geminiResult.value;
			console.log('✅ Gemini categorization succeeded');
		} else if (geminiResult.status === 'rejected') {
			console.error('❌ Gemini categorization failed:', geminiResult.reason);
		} else {
			console.log('⚠️ Gemini result was null or not available');
		}

		// Use the first available result (or OpenAI if both available)
		const batchResult = openaiBatchResult || geminiBatchResult;

		if (!batchResult) {
			return json({
				success: false,
				results: [],
				errors: [],
				error: 'Both AI providers failed to categorize transactions',
				openaiError: openaiResult.status === 'rejected' ? openaiResult.reason?.message : null,
				geminiError: geminiResult.status === 'rejected' ? geminiResult.reason?.message : null
			}, { status: 500 });
		}

		// Load category names for mapping
		const categoryMap = new Map<number, string>();
		try {
			const allCategories = await (db as any).categories.findMany({
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
			for (const cat of allCategories) {
				categoryMap.set(cat.id, cat.name);
			}
		} catch (err) {
			console.warn('Failed to load category names:', err);
		}

		// Create a map of transaction IDs to original data
		const transactionDataMap = new Map<number, {
			merchantName: string;
			description: string;
			amount: number;
			date: string;
		}>();
		for (const t of selectedTransactions) {
			transactionDataMap.set(t.id, {
				merchantName: t.merchantName,
				description: t.description,
				amount: typeof t.amount === 'object' && t.amount?.toNumber
					? t.amount.toNumber()
					: Number(t.amount),
				date: t.date instanceof Date ? t.date.toISOString() : t.date
			});
		}

		// Map category IDs to names in results and add original transaction data
		const resultsWithCategoryNames = batchResult.results.map(result => {
			const originalData = transactionDataMap.get(result.transactionId);
			return {
				...result,
				categoryName: result.categoryId ? categoryMap.get(result.categoryId) || `Category ${result.categoryId}` : null,
				originalMerchantName: originalData?.merchantName || '',
				originalDescription: originalData?.description || '',
				amount: originalData?.amount,
				date: originalData?.date
			};
		});

		const success = batchResult.errors.length === 0 && batchResult.results.length > 0;

		console.log(`   ✨ Test complete:`);
		console.log(`      - Results: ${batchResult.results.length}`);
		console.log(`      - Errors: ${batchResult.errors.length}`);
		console.log(`      - Total tokens: ${batchResult.tokensUsed?.total || 0}`);

		// Calculate total time taken
		const totalTimeTaken = Date.now() - startTime;
		const providerTimeTaken = openaiBatchResult
			? (openaiEndTime > 0 ? openaiEndTime - openaiStartTime : totalTimeTaken)
			: (geminiEndTime > 0 ? geminiEndTime - geminiStartTime : totalTimeTaken);

		// Prepare results for both providers
		const response: any = {
			success,
			results: resultsWithCategoryNames,
			errors: batchResult.errors,
			tokensUsed: batchResult.tokensUsed,
			prompt, // Include the prompt for display
			model: openaiBatchResult ? (openaiModel || aiConfig.model) : (geminiModel || geminiConfig.model),
			provider: openaiBatchResult ? 'openai' : 'gemini',
			timeTaken: providerTimeTaken
		};

		// If both providers ran, include both results for comparison
		console.log(`📊 Comparison check:`, {
			hasOpenAIResult: !!openaiBatchResult,
			hasGeminiResult: !!geminiBatchResult,
			willCreateComparison: !!(openaiBatchResult && geminiBatchResult)
		});

		if (openaiBatchResult && geminiBatchResult) {
			// Map Gemini results with category names
			const geminiResultsWithNames = geminiBatchResult.results.map(result => {
				const originalData = transactionDataMap.get(result.transactionId);
				// Use originalCategoryName if available (from AI response), otherwise map from categoryId
				// Don't use "Category X" format - if originalCategoryName is "Category X", ignore it
				const originalCatName = (result as any).originalCategoryName;
				const categoryName = originalCatName && !originalCatName.match(/^Category\s+\d+$/i)
					? originalCatName
					: (result.categoryId ? categoryMap.get(result.categoryId) || null : null);
				return {
					...result,
					categoryName,
					originalMerchantName: originalData?.merchantName || '',
					originalDescription: originalData?.description || '',
					amount: originalData?.amount,
					date: originalData?.date
				};
			});

			const openaiTimeTaken = openaiEndTime > 0 ? openaiEndTime - openaiStartTime : 0;
			const geminiTimeTaken = geminiEndTime > 0 ? geminiEndTime - geminiStartTime : 0;

			response.comparison = {
				openai: {
					results: resultsWithCategoryNames,
					errors: openaiBatchResult.errors,
					tokensUsed: openaiBatchResult.tokensUsed,
					model: openaiModel || aiConfig.model,
					timeTaken: openaiTimeTaken
				},
				gemini: {
					results: geminiResultsWithNames,
					errors: geminiBatchResult.errors,
					tokensUsed: geminiBatchResult.tokensUsed,
					model: geminiModel || geminiConfig.model,
					timeTaken: geminiTimeTaken
				}
			};
		}

		return json(response);
	} catch (err: any) {
		console.error('❌ Test error:', err);

		if (err.status) {
			throw err; // Re-throw SvelteKit errors
		}

		return json({
			message: 'Failed to test AI categorization',
			details: err.message || 'Unknown error'
		}, { status: 500 });
	}
};

