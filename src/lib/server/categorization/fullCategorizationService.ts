/**
 * Full Categorization Service
 * 
 * Optimized iterative categorization flow:
 * 1. Keyword matching (with merchant name cleaning)
 * 2. IBAN matching
 * 3. Merchant name matching (learns from past categorizations)
 * 4. AI categorization in batches
 * 5. After each AI batch: reload keywords and re-run keyword matching
 * 6. Repeat until all categorized or no progress
 * 
 * Key optimizations:
 * - Merchant names are cleaned before keyword matching
 * - Keywords are reloaded after each AI batch
 * - Keyword matching is re-run after each AI batch to catch new keywords
 * - Only unmatched transactions are sent to AI
 */

import { db } from '$lib/server/db';
import {
	loadAllKeywords,
	loadAllMerchantsWithIBANs,
	type Keyword
} from './categorizationService';
import {
	matchTransactionToCategory,
	type KeywordMatch
} from './keywordMatcher';
import {
	matchTransactionByIBAN,
	normalizeIBAN,
	type MerchantWithIBANs
} from './ibanMatcher';
import {
	cleanMerchantName,
	findOrCreateMerchant,
	ensureIBANInMerchant
} from './merchantNameCleaner';
import {
	categorizeBatchWithAI,
	batchTransactions,
	type TransactionForAI
} from './aiCategorizer';
import { categorizeBatchWithGemini } from './geminiCategorizer';
import { isAIAvailable, isGeminiAvailable, aiConfig, geminiConfig } from './config';
import { isCancelled } from './progressStore';
import {
	matchTransactionsByMerchantName,
	type MerchantNameMatch
} from './merchantNameMatcher';
import { normalizeDescription } from './descriptionCleaner';

export interface FullCategorizationOptions {
	maxIterations?: number; // Default: 10
	batchSize?: number; // Default: from config
	skipManual?: boolean; // Default: true
	minConfidence?: number; // Default: 0.5 (50%)
	onProgress?: (progress: {
		iteration: number;
		uncategorizedCount: number;
		keywordMatched: number;
		ibanMatched: number;
		merchantNameMatched: number;
		merchantNameReRunMatches?: number;
		aiMatched: number;
		keywordsAdded: number; // Number of keywords added by AI
		message: string;
		matchReasons?: Record<number, string>;
		vectorSearchProgress?: {
			processed: number;
			total: number;
			matched: number;
		};
		vectorSearchError?: string;
		aiProgress?: {
			currentBatch: number;
			totalBatches: number;
			batchSize: number;
			transactionsProcessed: number;
			resultsReceived: number;
			resultsAboveThreshold: number;
		};
	}) => void;
}

export interface FullCategorizationResult {
	success: boolean;
	totalIterations: number;
	finalUncategorizedCount: number;
	totalCategorized: number;
	keywordMatches: number;
	ibanMatches: number;
	vectorMatches: number;
	merchantNameMatches: number;
	merchantNameReRunMatches: number; // Matches found during re-runs after AI batches
	aiMatches: number;
	keywordsAdded: number;
	errors: string[];
	matchReasons?: Record<number, string>; // transactionId -> reason string
	aiDebug?: {
		batchesProcessed: number;
		totalTransactionsProcessed: number;
		totalResultsReceived: number;
		resultsAboveThreshold: number;
		resultsBelowThreshold: number;
		errors: string[];
		lastBatchDetails?: {
			batchSize: number;
			resultsReceived: number;
			resultsAboveThreshold: number;
			resultsBelowThreshold: number;
			tokensUsed?: { prompt: number; completion: number; total: number };
		};
	};
}

/**
 * Transaction data for matching
 */
interface TransactionForMatching {
	id: number;
	description: string;
	merchantName: string;
	counterparty_iban: string | null;
	amount: any;
	type: string;
	is_debit: boolean;
	date: Date;
	is_category_manual: boolean;
}

/**
 * Match result
 */
interface MatchResult {
	transactionId: number;
	categoryId: number | null;
	matchType: 'iban' | 'merchant' | 'merchant_name' | null;
	matchedKeyword: string | null;
	matchedMerchantId?: number;
	confidence?: number;
	similarity?: number; // For vector matches
}

/**
 * Load uncategorized transactions for a user
 */
async function loadUncategorizedTransactions(
	userId: number,
	options?: { skipManual?: boolean }
): Promise<TransactionForMatching[]> {
	const transactions = await (db as any).transactions.findMany({
		where: {
			user_id: userId,
			category_id: null,
			...(options?.skipManual !== false ? { is_category_manual: false } : {})
		},
		orderBy: { date: 'desc' },
		select: {
			id: true,
			description: true,
			merchantName: true,
			counterparty_iban: true,
			amount: true,
			type: true,
			is_debit: true,
			date: true,
			is_category_manual: true
		}
	});

	return transactions;
}

/**
 * Match a single transaction using keywords and IBAN
 * Merchant name is cleaned before keyword matching
 */
function matchTransaction(
	transaction: TransactionForMatching,
	keywords: Keyword[],
	merchantsWithIBANs: MerchantWithIBANs[],
	skipManual: boolean
): MatchResult | null {
	// Skip if manual assignment
	if (skipManual && transaction.is_category_manual) {
		return null;
	}

	// Priority 1: Try keyword matching first (fastest, most reliable)
	// Clean merchant name first to improve match accuracy
	const cleanedMerchantName = cleanMerchantName(transaction.merchantName, transaction.description);

	// Only try keyword matching if we have a cleaned merchant name
	if (cleanedMerchantName && cleanedMerchantName.length > 0) {
		const keywordMatch = matchTransactionToCategory(
			transaction.description,
			cleanedMerchantName, // Use cleaned name for matching
			keywords
		);

		if (keywordMatch) {
			return {
				transactionId: transaction.id,
				categoryId: keywordMatch.categoryId,
				matchType: 'merchant',
				matchedKeyword: keywordMatch.matchedKeyword,
				confidence: 1.0 // Keyword matches are exact, high confidence
			};
		}
	}

	// Priority 2: Try IBAN matching (exact, reliable)
	if (transaction.counterparty_iban) {
		const ibanMatch = matchTransactionByIBAN(transaction.counterparty_iban, merchantsWithIBANs);
		if (ibanMatch) {
			return {
				transactionId: transaction.id,
				categoryId: ibanMatch.defaultCategoryId,
				matchType: 'iban',
				matchedKeyword: ibanMatch.matchedIBAN,
				matchedMerchantId: ibanMatch.merchantId,
				confidence: 1.0 // IBAN matches are exact, high confidence
			};
		}
	}

	// No match found
	return null;
}

/**
 * Apply match results to database
 */
async function applyMatches(
	matches: MatchResult[],
	transactions: Map<number, TransactionForMatching>,
	matchReasons?: Record<number, string> // Optional: track match reasons
): Promise<number> {
	let applied = 0;
	const merchantUpdates = new Map<number, number[]>(); // merchantId -> transactionIds[]

	for (const match of matches) {
		if (match.categoryId === null) {
			continue;
		}

		const transaction = transactions.get(match.transactionId);
		if (!transaction) {
			continue;
		}

		try {
			// Get current transaction to check if it's still uncategorized and if merchant_id is already set
			const currentTransaction = await (db as any).transactions.findUnique({
				where: { id: match.transactionId },
				select: { merchant_id: true, category_id: true }
			});

			// Skip if transaction doesn't exist or is already categorized
			if (!currentTransaction) {
				console.log(`   ⚠️  Transaction ${match.transactionId} not found, skipping`);
				continue;
			}
			if (currentTransaction.category_id !== null) {
				// Already categorized (possibly by another batch), skip
				continue;
			}

			let merchantIdToLink: number | null = currentTransaction.merchant_id || null;

			// Handle merchant linking (only if not already linked)
			if (!merchantIdToLink) {
				if (match.matchType === 'iban' && match.matchedMerchantId) {
					// Link to merchant found by IBAN
					merchantIdToLink = match.matchedMerchantId;

					// Ensure IBAN is stored in merchant record
					if (transaction.counterparty_iban) {
						await ensureIBANInMerchant(db, match.matchedMerchantId, transaction.counterparty_iban);
					}
				} else if (match.matchType === 'merchant') {
					// Clean merchant name and create/link merchant
					const cleanedName = cleanMerchantName(transaction.merchantName, transaction.description);
					if (cleanedName && cleanedName.length > 0) {
						merchantIdToLink = await findOrCreateMerchant(
							db,
							cleanedName,
							match.categoryId,
							transaction.counterparty_iban
						);
					}
				}
			}

			// Track match reason
			if (matchReasons) {
				if (match.matchType === 'iban' && match.matchedKeyword) {
					matchReasons[match.transactionId] = `IBAN: ${match.matchedKeyword}`;
					console.log(`   📝 Tracked IBAN match reason for transaction ${match.transactionId}: ${matchReasons[match.transactionId]}`);
				} else if (match.matchType === 'merchant' && match.matchedKeyword) {
					matchReasons[match.transactionId] = `Keyword: ${match.matchedKeyword}`;
					console.log(`   📝 Tracked keyword match reason for transaction ${match.transactionId}: ${matchReasons[match.transactionId]}`);
				}
				// Note: merchant_name match reasons are tracked separately with more details
			}

			// Update transaction category and merchant link
			await (db as any).transactions.update({
				where: { id: match.transactionId },
				data: {
					category_id: match.categoryId,
					merchant_id: merchantIdToLink,
					updated_at: new Date()
				}
			});
			applied++;
		} catch (err) {
			console.error(`Failed to apply match for transaction ${match.transactionId}:`, err);
		}
	}

	// Batch update merchant links (if needed in future)
	// For now, we just ensure merchants exist and IBANs are stored

	return applied;
}

/**
 * Run keyword and IBAN matching on transactions
 * Returns matches and remaining unmatched transactions
 */
async function runKeywordAndIBANMatching(
	transactions: TransactionForMatching[],
	keywords: Keyword[],
	merchantsWithIBANs: MerchantWithIBANs[],
	skipManual: boolean
): Promise<{
	matches: MatchResult[];
	remaining: TransactionForMatching[];
}> {
	const matches: MatchResult[] = [];
	const matchedIds = new Set<number>();

	// Create transaction map for quick lookup
	const transactionMap = new Map(transactions.map(t => [t.id, t]));

	// Match each transaction
	for (const transaction of transactions) {
		const match = matchTransaction(transaction, keywords, merchantsWithIBANs, skipManual);
		if (match && match.categoryId !== null) {
			matches.push(match);
			matchedIds.add(transaction.id);
		}
	}

	// Get remaining unmatched transactions
	const remaining = transactions.filter(t => !matchedIds.has(t.id));

	return { matches, remaining };
}

/**
 * Process a single AI batch and return results
 */
async function processAIBatch(
	userId: number,
	batch: TransactionForAI[],
	minConfidence: number,
	batchNumber: number,
	totalBatches: number
): Promise<{
	validResults: Array<{
		transactionId: number;
		categoryId: number | null;
		confidence: number;
		suggestedKeywords?: string[];
	}>;
	invalidResults: Array<{
		transactionId: number;
		categoryId: number | null;
		confidence: number;
		suggestedKeywords?: string[];
	}>;
	keywordsAdded: number;
	tokensUsed?: { prompt: number; completion: number; total: number };
}> {
	console.log(`   🔄 Processing AI batch ${batchNumber}/${totalBatches} (${batch.length} transactions)...`);

	try {
		// Prefer Gemini if available, otherwise fallback to OpenAI
		const useGemini = isGeminiAvailable();
		// Use higher max tokens for production (1000) to handle larger batches safely
		const batchResult = useGemini
			? await categorizeBatchWithGemini(userId, batch, 'gemini-2.5-flash-lite', {
				includeReasoning: false,
				temperature: 0.2,
				maxTokens: 1000, // Increased from 800 to handle larger batches safely
				enableSearchGrounding: true,
				includeCleanedMerchantName: true,
				useCategoryNames: true
			})
			: await categorizeBatchWithAI(userId, batch, undefined, {
				reasoningEffort: 'low',
				verbosity: 'low',
				includeReasoning: false
			});

		// Filter by confidence threshold
		const validResults = batchResult.results.filter(r =>
			r.categoryId !== null && r.confidence >= minConfidence
		);
		const invalidResults = batchResult.results.filter(r =>
			r.categoryId === null || r.confidence < minConfidence
		);

		console.log(`   📊 Batch ${batchNumber} results: ${validResults.length} above threshold (≥${minConfidence}), ${invalidResults.length} below`);
		if (invalidResults.length > 0) {
			console.log(`   📉 Below threshold examples:`, invalidResults.slice(0, 3).map(r => ({
				id: r.transactionId,
				confidence: r.confidence,
				hasCategory: r.categoryId !== null
			})));
		}

		return {
			validResults: validResults.map(r => ({
				transactionId: r.transactionId,
				categoryId: r.categoryId,
				confidence: r.confidence,
				suggestedKeywords: r.suggestedKeywords
			})),
			invalidResults: invalidResults.map(r => ({
				transactionId: r.transactionId,
				categoryId: r.categoryId,
				confidence: r.confidence,
				suggestedKeywords: r.suggestedKeywords
			})),
			keywordsAdded: 0,
			tokensUsed: batchResult.tokensUsed
		};
	} catch (err) {
		const errorMsg = `AI batch ${batchNumber} error: ${err instanceof Error ? err.message : 'Unknown error'}`;
		console.error(`   ⚠️  ${errorMsg}`);
		throw new Error(errorMsg);
	}
}


/**
 * Full categorization flow with optimized iterative rounds
 */
export async function categorizeAllTransactions(
	userId: number,
	options?: FullCategorizationOptions
): Promise<FullCategorizationResult> {
	const maxIterations = options?.maxIterations || 10;
	const batchSize = options?.batchSize;
	const skipManual = options?.skipManual !== false;
	const minConfidence = options?.minConfidence || 0.5;

	let iteration = 0;
	let previousUncategorizedCount = Infinity;
	let initialUncategorizedCount: number | null = null; // Track initial count for totalCategorized calculation
	let totalKeywordMatches = 0;
	let totalIBANMatches = 0;
	let totalMerchantNameMatches = 0;
	let totalMerchantNameReRunMatches = 0; // Matches found during re-runs after AI batches
	let totalAIMatches = 0;
	let totalKeywordsAdded = 0; // Keep for compatibility but always 0
	const errors: string[] = [];
	const matchReasons: Record<number, string> = {}; // Track match reasons for each transaction
	const aiDebug: FullCategorizationResult['aiDebug'] = {
		batchesProcessed: 0,
		totalTransactionsProcessed: 0,
		totalResultsReceived: 0,
		resultsAboveThreshold: 0,
		resultsBelowThreshold: 0,
		errors: [],
		lastBatchDetails: undefined
	};

	// Load keywords and merchants once at start
	let keywords = await loadAllKeywords();
	let merchantsWithIBANs = await loadAllMerchantsWithIBANs();

	do {
		// Check for cancellation
		if (isCancelled(userId)) {
			console.log('⏹️  Categorization cancelled by user');
			options?.onProgress?.({
				iteration,
				uncategorizedCount: previousUncategorizedCount,
				keywordMatched: 0,
				ibanMatched: 0,
				merchantNameMatched: 0,
				aiMatched: 0,
				keywordsAdded: 0,
				message: 'Categorization cancelled',
				matchReasons
			});
			break;
		}

		iteration++;
		console.log(`\n🔄 Iteration ${iteration}`);

		options?.onProgress?.({
			iteration,
			uncategorizedCount: 0,
			keywordMatched: 0,
			ibanMatched: 0,
			merchantNameMatched: 0,
			aiMatched: 0,
			keywordsAdded: 0,
			message: `Iteration ${iteration}`,
			matchReasons
		});

		// Step 1: Load uncategorized transactions
		const transactions = await loadUncategorizedTransactions(userId, { skipManual });
		const uncategorizedCount = transactions.length;

		// Store initial uncategorized count for totalCategorized calculation
		if (initialUncategorizedCount === null) {
			initialUncategorizedCount = uncategorizedCount;
		}

		if (uncategorizedCount === 0) {
			console.log('✅ All transactions categorized!');
			options?.onProgress?.({
				iteration,
				uncategorizedCount: 0,
				keywordMatched: 0,
				ibanMatched: 0,
				merchantNameMatched: 0,
				aiMatched: 0,
				keywordsAdded: 0,
				message: 'All transactions categorized!',
				matchReasons
			});
			break;
		}

		console.log(`   📊 Found ${uncategorizedCount} uncategorized transactions`);

		// Step 2: Initial keyword and IBAN matching
		console.log('   🔍 Running initial keyword and IBAN matching...');
		const { matches: initialMatches, remaining: remainingForAI } = await runKeywordAndIBANMatching(
			transactions,
			keywords,
			merchantsWithIBANs,
			skipManual
		);

		// Separate keyword and IBAN matches
		const keywordMatches = initialMatches.filter(m => m.matchType === 'merchant');
		const ibanMatches = initialMatches.filter(m => m.matchType === 'iban');

		const keywordMatched = keywordMatches.length;
		const ibanMatched = ibanMatches.length;
		totalKeywordMatches += keywordMatched;
		totalIBANMatches += ibanMatched;

		console.log(`   ✅ Keyword matched: ${keywordMatched} transactions`);
		console.log(`   ✅ IBAN matched: ${ibanMatched} transactions`);

		// Apply initial matches
		const transactionMap = new Map(transactions.map(t => [t.id, t]));
		if (initialMatches.length > 0) {
			await applyMatches(initialMatches, transactionMap, matchReasons);
		}

		// Step 3: Merchant Name Matching (for remaining unmatched transactions)
		let merchantNameMatched = 0;
		let remainingForMerchantName = remainingForAI;

		console.log(`\n   === MERCHANT NAME MATCHING STEP ===`);
		console.log(`   📋 Transactions remaining for merchant name matching: ${remainingForMerchantName.length}`);

		if (remainingForMerchantName.length > 0) {
			console.log(`   🔍 Running merchant name matching on ${remainingForMerchantName.length} unmatched transactions...`);

			options?.onProgress?.({
				iteration,
				uncategorizedCount,
				keywordMatched,
				ibanMatched,
				merchantNameMatched: 0,
				aiMatched: 0,
				keywordsAdded: 0,
				message: `🔍 Merchant name matching: processing ${remainingForMerchantName.length} transactions...`,
				matchReasons
			});

			try {
				// Match transactions by merchant name
				const merchantNameMatches = await matchTransactionsByMerchantName(
					remainingForMerchantName.map(t => ({
						id: t.id,
						merchantName: t.merchantName,
						description: t.description
					}))
				);

				// Convert to MatchResult format
				const merchantMatches: MatchResult[] = [];
				const merchantMatchedIds = new Set<number>();

				for (const transaction of remainingForMerchantName) {
					const match = merchantNameMatches.get(transaction.id);
					if (match) {
						merchantMatches.push({
							transactionId: transaction.id,
							categoryId: match.categoryId,
							matchType: 'merchant_name',
							matchedKeyword: match.categoryName,
							confidence: match.matchCount
						});
						merchantMatchedIds.add(transaction.id);
					}
				}

				merchantNameMatched = merchantMatches.length;

				if (merchantMatches.length > 0) {
					// Apply merchant name matches
					await applyMatches(merchantMatches, transactionMap, matchReasons);

					// Update remaining transactions (exclude merchant-matched ones)
					remainingForMerchantName = remainingForMerchantName.filter(t => !merchantMatchedIds.has(t.id));

					totalMerchantNameMatches += merchantNameMatched;

					// If this is not the first iteration, these are re-run matches
					// (they match against transactions categorized in previous iterations)
					if (iteration > 1) {
						totalMerchantNameReRunMatches += merchantNameMatched;
						console.log(`   ✅ Merchant name matched: ${merchantNameMatched} transactions (${merchantNameMatched} re-run matches from iteration ${iteration})`);
					} else {
						console.log(`   ✅ Merchant name matched: ${merchantNameMatched} transactions`);
					}

					// Track match reasons
					for (const match of merchantMatches) {
						const merchantMatch = merchantNameMatches.get(match.transactionId);
						if (merchantMatch) {
							const matchType = merchantMatch.hasManualCategory ? 'manual' : 'auto';
							matchReasons[match.transactionId] = `Merchant "${merchantMatch.merchantName}" → ${merchantMatch.categoryName} (${merchantMatch.matchCount} ${matchType} match${merchantMatch.matchCount > 1 ? 'es' : ''})`;
						}
					}
				}

				options?.onProgress?.({
					iteration,
					uncategorizedCount,
					keywordMatched,
					ibanMatched,
					merchantNameMatched,
					merchantNameReRunMatches: iteration > 1 ? merchantNameMatched : 0,
					aiMatched: 0,
					keywordsAdded: 0,
					message: `✅ Merchant name matching complete: ${merchantNameMatched} transactions matched`,
					matchReasons
				});
			} catch (error) {
				console.error('   ❌ Merchant name matching error:', error);
				options?.onProgress?.({
					iteration,
					uncategorizedCount,
					keywordMatched,
					ibanMatched,
					merchantNameMatched: 0,
					aiMatched: 0,
					keywordsAdded: 0,
					message: `❌ Merchant name matching error: ${error instanceof Error ? error.message : 'Unknown error'}`,
					matchReasons
				});
			}
		}

		// Step 4: AI categorization loop (for remaining transactions after merchant name matching)
		let aiMatched = 0;

		if (remainingForMerchantName.length > 0 && isAIAvailable()) {
			console.log(`   🤖 Running AI categorization on ${remainingForMerchantName.length} remaining transactions...`);

			try {
				// Track which transactions have been processed by AI
				const aiProcessedIds = new Set<number>();
				// Track remaining transactions - will be updated after merchant matching
				let currentRemaining = [...remainingForMerchantName];
				const effectiveBatchSize = batchSize && batchSize > 0 ? batchSize : aiConfig.batchSize;
				let batchIndex = 0;

				// Process batches dynamically - recreate batches after merchant matching
				while (currentRemaining.length > 0) {
					// Check for cancellation before each batch
					if (isCancelled(userId)) {
						console.log('⏹️  Categorization cancelled during AI processing');
						break;
					}

					// Filter out already categorized transactions and create new batch
					const uncategorizedForBatch = currentRemaining.filter(t => {
						// Skip transactions already processed by AI
						return !aiProcessedIds.has(t.id);
					});

					if (uncategorizedForBatch.length === 0) {
						console.log(`   ℹ️  No uncategorized transactions remaining for AI processing`);
						break;
					}

					// Convert to TransactionForAI format
					const transactionsForAI: TransactionForAI[] = uncategorizedForBatch.map(t => ({
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

					// Create batch from remaining uncategorized transactions
					const batches = batchTransactions(transactionsForAI, effectiveBatchSize);

					if (batches.length === 0) {
						console.log(`   ℹ️  No batches to process`);
						break;
					}

					// Process first batch (we'll recreate batches after merchant matching if needed)
					const batch = batches[0];
					batchIndex++;
					const batchNumber = batchIndex;
					const totalBatchesEstimate = Math.ceil(uncategorizedForBatch.length / effectiveBatchSize);

					aiDebug.batchesProcessed++;
					aiDebug.totalTransactionsProcessed += batch.length;

					// Report AI progress
					options?.onProgress?.({
						iteration,
						uncategorizedCount: currentRemaining.length,
						keywordMatched: 0,
						ibanMatched: 0,
						aiMatched: 0,
						keywordsAdded: 0,
						message: `Processing AI batch ${batchNumber} (${uncategorizedForBatch.length} remaining)`,
						matchReasons,
						merchantNameMatched: merchantNameMatched,
						aiProgress: {
							currentBatch: batchNumber,
							totalBatches: totalBatchesEstimate,
							batchSize: batch.length,
							transactionsProcessed: aiDebug.totalTransactionsProcessed,
							resultsReceived: aiDebug.totalResultsReceived,
							resultsAboveThreshold: aiDebug.resultsAboveThreshold
						}
					});

					try {
						// Process AI batch
						const batchResult = await processAIBatch(
							userId,
							batch,
							minConfidence,
							batchNumber,
							totalBatchesEstimate
						);

						aiDebug.totalResultsReceived += batchResult.validResults.length + batchResult.invalidResults.length;
						aiDebug.resultsAboveThreshold += batchResult.validResults.length;
						aiDebug.resultsBelowThreshold += batchResult.invalidResults.length;

						// Store last batch details
						aiDebug.lastBatchDetails = {
							batchSize: batch.length,
							resultsReceived: batchResult.validResults.length + batchResult.invalidResults.length,
							resultsAboveThreshold: batchResult.validResults.length,
							resultsBelowThreshold: batchResult.invalidResults.length,
							tokensUsed: batchResult.tokensUsed
						};

						// Mark batch transactions as processed
						batch.forEach(t => aiProcessedIds.add(t.id));

						// Apply valid AI results
						if (batchResult.validResults.length > 0) {
							// For AI results, create/link merchants and update transactions directly
							// We do this directly instead of using applyMatches to avoid overwriting merchant_id
							for (const result of batchResult.validResults) {
								const transaction = transactionMap.get(result.transactionId);
								if (transaction && result.categoryId) {
									try {
										let merchantId: number | null = null;

										// Use AI's cleanedMerchantName if available, otherwise use cleanMerchantName function
										const cleanedName = (result as any).cleanedMerchantName && typeof (result as any).cleanedMerchantName === 'string'
											? (result as any).cleanedMerchantName.trim()
											: cleanMerchantName(transaction.merchantName, transaction.description);

										if (cleanedName && cleanedName.length > 0) {
											merchantId = await findOrCreateMerchant(
												db,
												cleanedName,
												result.categoryId,
												transaction.counterparty_iban
											);

											// Update merchant name if AI provided a cleaned name and it's different from current
											if ((result as any).cleanedMerchantName && merchantId) {
												const merchant = await db.merchants.findUnique({
													where: { id: merchantId },
													select: { name: true }
												});

												if (merchant && merchant.name !== cleanedName) {
													await db.merchants.update({
														where: { id: merchantId },
														data: {
															name: cleanedName,
															updated_at: new Date()
														}
													});
													console.log(`   ✏️  Updated merchant ${merchantId} name: "${merchant.name}" → "${cleanedName}"`);
												}
											}
										}

										// Track AI match reason with confidence
										const confidencePercent = Math.round(result.confidence * 100);
										matchReasons[result.transactionId] = `AI (${confidencePercent}%)`;
										console.log(`   📝 Tracked AI match reason for transaction ${result.transactionId}: ${matchReasons[result.transactionId]}`);

										// Update transaction with category and merchant link in one operation
										await (db as any).transactions.update({
											where: { id: result.transactionId },
											data: {
												category_id: result.categoryId,
												merchant_id: merchantId,
												cleaned_merchant_name: cleanedName || null,
												updated_at: new Date()
											}
										});

										aiMatched++;
									} catch (err) {
										console.error(`Failed to apply AI result for transaction ${result.transactionId}:`, err);
									}
								}
							}

						}

						// After each AI batch, re-run merchant name matching
						// Wait a moment to ensure database updates are committed
						// Then reload uncategorized transactions from database to get current state
						await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to ensure DB commits

						const currentUncategorizedAfterBatch = await loadUncategorizedTransactions(userId, { skipManual });
						const currentUncategorizedIds = new Set(currentUncategorizedAfterBatch.map(t => t.id));

						// Filter currentRemaining to only include transactions that are still uncategorized
						const stillUncategorized = currentRemaining.filter(t => currentUncategorizedIds.has(t.id));

						// Also include transactions from current batch that AI couldn't categorize
						// Create map of batch transactions for lookup - use currentRemaining to get original TransactionForMatching objects
						const currentRemainingMap = new Map(currentRemaining.map(t => [t.id, t]));
						const aiFailedFromBatch = batchResult.invalidResults
							.map(r => currentRemainingMap.get(r.transactionId))
							.filter((t): t is TransactionForMatching => t !== undefined && currentUncategorizedIds.has(t.id));

						// Combine for re-matching - only include transactions that are still uncategorized
						const toRematch = [...stillUncategorized.filter(t => !aiProcessedIds.has(t.id)), ...aiFailedFromBatch];

						console.log(`   📊 After AI batch: ${currentUncategorizedAfterBatch.length} still uncategorized, ${toRematch.length} candidates for re-matching`);

						if (toRematch.length > 0) {
							// Always re-run merchant name matching after AI batch (newly categorized transactions can match others)
							console.log(`   🔍 Re-running merchant name matching after AI batch on ${toRematch.length} remaining transactions...`);

							const merchantNameMatches = await matchTransactionsByMerchantName(
								toRematch.map(t => ({
									id: t.id,
									merchantName: t.merchantName,
									description: t.description
								}))
							);

							const potentialMatches = Array.from(merchantNameMatches.values()).filter(m => m !== null).length;
							console.log(`   📊 Merchant name matching found ${potentialMatches} potential matches`);

							// Debug: Show what's being compared
							if (toRematch.length > 0 && potentialMatches === 0) {
								console.log(`   🔍 Debug: Checking why no matches found...`);
								const sample = toRematch.slice(0, 3);
								for (const t of sample) {
									const cleaned = cleanMerchantName(t.merchantName || '', t.description || '');
									if (cleaned) {
										// Check if any categorized transactions exist with this cleaned name (case-insensitive)
										const cleanedLower = cleaned.toLowerCase();
										const count = await db.$queryRaw<[{ count: bigint }]>`
										SELECT COUNT(*) as count 
										FROM transactions 
										WHERE LOWER(cleaned_merchant_name) = ${cleanedLower}
											AND category_id IS NOT NULL
									`;
										console.log(`      - Transaction ${t.id}: "${t.merchantName}" → cleaned: "${cleaned}" → ${Number(count[0].count)} categorized transactions found`);
									}
								}
							}

							// Convert to MatchResult format
							const merchantMatches: MatchResult[] = [];
							const merchantMatchedIds = new Set<number>();

							for (const transaction of toRematch) {
								const match = merchantNameMatches.get(transaction.id);
								if (match) {
									merchantMatches.push({
										transactionId: transaction.id,
										categoryId: match.categoryId,
										matchType: 'merchant_name',
										matchedKeyword: match.categoryName,
										confidence: match.matchCount
									});
									merchantMatchedIds.add(transaction.id);
								}
							}

							if (merchantMatches.length > 0) {
								console.log(`   ✅ Merchant name re-matched ${merchantMatches.length} transactions after AI batch:`);
								// Log first few matches for visibility
								for (const match of merchantMatches.slice(0, 5)) {
									const merchantMatch = merchantNameMatches.get(match.transactionId);
									if (merchantMatch) {
										const matchType = merchantMatch.hasManualCategory ? 'manual' : 'auto';
										console.log(`      - Transaction ${match.transactionId} → ${match.matchedKeyword} (${merchantMatch.matchCount} ${matchType} match${merchantMatch.matchCount > 1 ? 'es' : ''})`);
									}
								}
								if (merchantMatches.length > 5) {
									console.log(`      ... and ${merchantMatches.length - 5} more`);
								}

								// Apply merchant name matches
								await applyMatches(merchantMatches, transactionMap, matchReasons);

								// Track match reasons - show merchant name → category
								for (const match of merchantMatches) {
									const merchantMatch = merchantNameMatches.get(match.transactionId);
									if (merchantMatch) {
										const matchType = merchantMatch.hasManualCategory ? 'manual' : 'auto';
										matchReasons[match.transactionId] = `Merchant "${merchantMatch.merchantName}" → ${merchantMatch.categoryName} (${merchantMatch.matchCount} ${matchType} match${merchantMatch.matchCount > 1 ? 'es' : ''})`;
									}
								}

								// Update counters
								merchantNameMatched += merchantMatches.length;
								totalMerchantNameMatches += merchantMatches.length;
								totalMerchantNameReRunMatches += merchantMatches.length; // Track re-run matches

								// Update progress with re-run matches count
								options?.onProgress?.({
									iteration,
									uncategorizedCount: currentRemaining.length,
									keywordMatched: 0,
									ibanMatched: 0,
									merchantNameMatched: merchantNameMatched,
									merchantNameReRunMatches: totalMerchantNameReRunMatches,
									aiMatched: aiMatched,
									keywordsAdded: 0,
									message: `✅ Re-matched ${merchantMatches.length} transactions after AI batch`,
									matchReasons
								});
							} else {
								console.log(`   ℹ️  No merchant name matches found after AI batch (checked ${toRematch.length} transactions)`);
							}

						}

						// Update remaining list - reload from database to get current state
						// (Batch transactions are already marked as processed on line 757)
						// This ensures we only process transactions that are still uncategorized
						// After merchant matching, some transactions may have been categorized
						const updatedUncategorized = await loadUncategorizedTransactions(userId, { skipManual });
						currentRemaining = updatedUncategorized.filter(t => {
							// Only include transactions that were in our original list
							return remainingForMerchantName.some(orig => orig.id === t.id);
						});

					} catch (err) {
						const errorMsg = `AI batch ${batchNumber} error: ${err instanceof Error ? err.message : 'Unknown error'}`;
						errors.push(errorMsg);
						aiDebug.errors.push(errorMsg);
						console.error(`   ⚠️  ${errorMsg}`);
						// Continue with next batch
					}
				}

				totalAIMatches += aiMatched;
				console.log(`   ✅ AI matched: ${aiMatched} transactions (above ${minConfidence} confidence)`);

			} catch (err) {
				const errorMsg = `AI categorization error: ${err instanceof Error ? err.message : 'Unknown error'}`;
				errors.push(errorMsg);
				aiDebug.errors.push(errorMsg);
				console.error(`   ⚠️  ${errorMsg}`);
			}
		} else if (remainingForMerchantName.length > 0 && !isAIAvailable()) {
			console.log('   ⚠️  AI not available, skipping AI categorization');
		}

		// Step 5: Final merchant name matching after all AI batches complete
		// This catches cases where newly categorized transactions from AI can match other uncategorized ones
		const finalUncategorized = await loadUncategorizedTransactions(userId, { skipManual });
		if (finalUncategorized.length > 0) {
			console.log(`\n   === FINAL MERCHANT NAME MATCHING STEP ===`);
			console.log(`   📋 Running final merchant name matching on ${finalUncategorized.length} remaining uncategorized transactions...`);

			try {
				const finalMerchantNameMatches = await matchTransactionsByMerchantName(
					finalUncategorized.map(t => ({
						id: t.id,
						merchantName: t.merchantName,
						description: t.description
					}))
				);

				// Convert to MatchResult format
				const finalMerchantMatches: MatchResult[] = [];
				const finalMerchantMatchedIds = new Set<number>();

				for (const transaction of finalUncategorized) {
					const match = finalMerchantNameMatches.get(transaction.id);
					if (match) {
						finalMerchantMatches.push({
							transactionId: transaction.id,
							categoryId: match.categoryId,
							matchType: 'merchant_name',
							matchedKeyword: match.categoryName,
							confidence: match.matchCount
						});
						finalMerchantMatchedIds.add(transaction.id);
					}
				}

				if (finalMerchantMatches.length > 0) {
					const finalTransactionMap = new Map(finalUncategorized.map(t => [t.id, t]));
					await applyMatches(finalMerchantMatches, finalTransactionMap, matchReasons);

					// Track match reasons
					for (const match of finalMerchantMatches) {
						const merchantMatch = finalMerchantNameMatches.get(match.transactionId);
						if (merchantMatch) {
							const matchType = merchantMatch.hasManualCategory ? 'manual' : 'auto';
							matchReasons[match.transactionId] = `Merchant "${merchantMatch.merchantName}" → ${merchantMatch.categoryName} (${merchantMatch.matchCount} ${matchType} match${merchantMatch.matchCount > 1 ? 'es' : ''})`;
						}
					}

					merchantNameMatched += finalMerchantMatches.length;
					totalMerchantNameMatches += finalMerchantMatches.length;
					totalMerchantNameReRunMatches += finalMerchantMatches.length; // Track final re-run matches

					console.log(`   ✅ Final merchant name matching matched ${finalMerchantMatches.length} transactions`);
				} else {
					console.log(`   ℹ️  No final merchant name matches found`);
				}

				options?.onProgress?.({
					iteration,
					uncategorizedCount: finalUncategorized.length - finalMerchantMatches.length,
					keywordMatched: keywordMatched,
					ibanMatched: ibanMatched,
					merchantNameMatched: merchantNameMatched,
					merchantNameReRunMatches: totalMerchantNameReRunMatches,
					aiMatched: aiMatched,
					keywordsAdded: 0,
					message: `✅ Final merchant name matching complete: ${finalMerchantMatches.length} transactions matched`,
					matchReasons
				});
			} catch (error) {
				console.error('   ❌ Final merchant name matching error:', error);
				options?.onProgress?.({
					iteration,
					uncategorizedCount: finalUncategorized.length,
					keywordMatched: keywordMatched,
					ibanMatched: ibanMatched,
					merchantNameMatched: merchantNameMatched,
					aiMatched: aiMatched,
					keywordsAdded: 0,
					message: `❌ Final merchant name matching error: ${error instanceof Error ? error.message : 'Unknown error'}`,
					matchReasons
				});
			}
		}

		// Check if we made progress
		const currentUncategorized = await loadUncategorizedTransactions(userId, { skipManual });
		const currentUncategorizedCount = currentUncategorized.length;

		if (currentUncategorizedCount >= previousUncategorizedCount) {
			console.log(`   ⚠️  No progress made (${currentUncategorizedCount} uncategorized, same as before), stopping`);
			options?.onProgress?.({
				iteration,
				uncategorizedCount: currentUncategorizedCount,
				keywordMatched: keywordMatched,
				ibanMatched: ibanMatched,
				merchantNameMatched: merchantNameMatched,
				merchantNameReRunMatches: totalMerchantNameReRunMatches,
				aiMatched: aiMatched,
				keywordsAdded: 0,
				message: 'No progress made, stopping',
				matchReasons
			});
			break;
		}

		previousUncategorizedCount = currentUncategorizedCount;

		options?.onProgress?.({
			iteration,
			uncategorizedCount: currentUncategorizedCount,
			keywordMatched: keywordMatched,
			ibanMatched: ibanMatched,
			merchantNameMatched: merchantNameMatched,
			merchantNameReRunMatches: totalMerchantNameReRunMatches,
			aiMatched: aiMatched,
			keywordsAdded: 0,
			message: `Iteration ${iteration} complete`,
			matchReasons
		});

	} while (iteration < maxIterations);

	const finalUncategorized = await loadUncategorizedTransactions(userId, { skipManual });
	const finalUncategorizedCount = finalUncategorized.length;
	// Use initial count if available, otherwise fall back to previousUncategorizedCount
	const startingCount = initialUncategorizedCount !== null ? initialUncategorizedCount : previousUncategorizedCount;
	const totalCategorized = startingCount - finalUncategorizedCount;

	console.log(`📊 Categorization summary:`);
	console.log(`   - Started with: ${startingCount} uncategorized transactions`);
	console.log(`   - Ended with: ${finalUncategorizedCount} uncategorized transactions`);
	console.log(`   - Total categorized: ${totalCategorized} transactions`);
	console.log(`   - Breakdown: ${totalKeywordMatches} keywords, ${totalIBANMatches} IBAN, ${totalMerchantNameMatches} merchant name (${totalMerchantNameReRunMatches} re-run), ${totalAIMatches} AI`);

	console.log(`📊 Final match reasons count: ${Object.keys(matchReasons).length}`);
	if (Object.keys(matchReasons).length > 0) {
		console.log(`📊 Sample match reasons:`, Object.entries(matchReasons).slice(0, 5));
	}

	return {
		success: errors.length === 0,
		totalIterations: iteration,
		finalUncategorizedCount,
		totalCategorized,
		keywordMatches: totalKeywordMatches,
		ibanMatches: totalIBANMatches,
		vectorMatches: 0,
		merchantNameMatches: totalMerchantNameMatches,
		merchantNameReRunMatches: totalMerchantNameReRunMatches,
		aiMatches: totalAIMatches,
		keywordsAdded: totalKeywordsAdded,
		errors,
		matchReasons,
		aiDebug
	};
}
