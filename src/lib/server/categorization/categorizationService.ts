/**
 * Transaction Categorization Service
 * 
 * Batch processes transactions and matches them to categories using keywords.
 */

import { db } from '$lib/server/db';
import { matchTransactionToCategory, prepareKeywords, type Keyword, type CompiledKeyword } from './keywordMatcher';
import { matchTransactionByIBAN, type MerchantWithIBANs, normalizeIBAN } from './ibanMatcher';
import { cleanMerchantName, findOrCreateMerchant, ensureIBANInMerchant } from './merchantNameCleaner';
import { matchTransactionsBatchWithVector, isVectorMatchingAvailable, type TransactionForEmbedding } from './vectorMatcher';
import { isTransferBetweenPersons } from './transferDetector';
import {
	type AICategorizationResult,
	type TransactionForAI
} from './aiCategorizer';
import { categorizeBatchWithGemini } from './geminiCategorizer';
import { categorizeBatchWithOpenAI } from './openaiCategorizer';

// Re-export Keyword for use by other modules
export type { Keyword } from './keywordMatcher';

export interface CategorizationOptions {
	skipManual?: boolean; // Skip transactions with is_category_manual = true (default: true)
	skipCategorized?: boolean; // Skip transactions that already have category_id (default: true)
	limit?: number; // Limit number of transactions to process
	transactionIds?: number[]; // Specific transaction IDs to process
	onProgress?: (progress: {
		processed: number;
		total: number;
		categorized: number;
		skipped: number;
		notCategorized: number;
		message?: string;
		vectorSearchProgress?: {
			processed: number;
			total: number;
			matched: number;
		};
		vectorSearchError?: string;
	}) => void; // Progress callback
}

export interface CategorizationResult {
	transactionId: number;
	categoryId: number | null;
	matchedKeyword: string | null;
	matchType: 'iban' | 'merchant' | 'merchant_name' | 'vector' | null; // 'iban' = matched by IBAN, 'merchant' = matched by keyword, 'merchant_name' = matched by merchant name, 'vector' = matched by vector similarity
	skipped: boolean;
	skipReason?: string;
	matchedMerchantId?: number; // Merchant ID if matched by IBAN
	similarity?: number; // Similarity score for vector matches (0.0 - 1.0)
}

export interface CategorizationBatchResult {
	total: number;
	processed: number;
	categorized: number;
	keywordCategorized: number; // Categorized via keyword matching
	ibanCategorized: number; // Categorized via IBAN matching
	vectorCategorized: number; // Categorized via vector search
	skipped: number;
	personsDetected: number; // Number of transfers between persons detected
	results: CategorizationResult[];
}

/**
 * Load all keywords from the database
 * Efficient for batch processing - load once, use many times
 */
export async function loadAllKeywords(): Promise<Keyword[]> {
	// console.log('📚 Loading all keywords from database...');

	const keywords = await (db as any).category_keywords.findMany({
		select: {
			category_id: true,
			keyword: true
		}
	});

	// console.log(`✅ Loaded ${keywords.length} keywords from ${new Set(keywords.map((k: Keyword) => k.category_id)).size} categories`);

	return keywords;
}

/**
 * Load all merchants with their IBANs from the database
 * Efficient for batch processing - load once, use many times
 */
export async function loadAllMerchantsWithIBANs(): Promise<MerchantWithIBANs[]> {
	// console.log('📚 Loading all merchants with IBANs from database...');

	const merchants = await (db as any).merchants.findMany({
		where: {
			is_active: true
		},
		select: {
			id: true,
			name: true,
			ibans: true,
			default_category_id: true
		}
	});

	// Filter to only merchants that have IBANs
	const merchantsWithIBANs = merchants.filter((m: MerchantWithIBANs) =>
		m.ibans && Array.isArray(m.ibans) && m.ibans.length > 0
	);

	// console.log(`✅ Loaded ${merchantsWithIBANs.length} merchants with IBANs (out of ${merchants.length} total)`);

	return merchantsWithIBANs;
}

/**
 * Merchant data for in-memory lookups
 */
interface MerchantData {
	id: number;
	name: string;
	default_category_id: number | null;
	ibans: string[];
}

/**
 * Load all merchants from the database for in-memory lookups
 * Returns both a Map by ID and a Map by name (lowercase) for O(1) lookups
 */
export async function loadAllMerchants(): Promise<{
	byId: Map<number, MerchantData>;
	byName: Map<string, MerchantData>;
}> {
	// console.log('📚 Loading all merchants for in-memory lookups...');

	const merchants = await (db as any).merchants.findMany({
		where: { is_active: true },
		select: {
			id: true,
			name: true,
			default_category_id: true,
			ibans: true
		}
	});

	const byId = new Map<number, MerchantData>();
	const byName = new Map<string, MerchantData>();

	for (const m of merchants) {
		const merchantData: MerchantData = {
			id: m.id,
			name: m.name,
			default_category_id: m.default_category_id,
			ibans: m.ibans || []
		};
		byId.set(m.id, merchantData);
		byName.set(m.name.toLowerCase(), merchantData);
	}

	// console.log(`✅ Loaded ${merchants.length} merchants into memory`);

	return { byId, byName };
}

/**
 * Categorize a single transaction
 */
function categorizeTransaction(
	transaction: {
		id: number;
		description: string;
		merchantName: string;
		counterparty_iban: string | null;
		category_id: number | null;
		is_category_manual: boolean;
	},
	compiledKeywords: CompiledKeyword[],
	merchantsWithIBANs: MerchantWithIBANs[],
	options: CategorizationOptions
): CategorizationResult {
	// Skip if manual assignment
	if (options.skipManual !== false && transaction.is_category_manual) {
		return {
			transactionId: transaction.id,
			categoryId: transaction.category_id,
			matchedKeyword: null,
			matchType: null,
			skipped: true,
			skipReason: 'manual_assignment'
		};
	}

	// Skip if already categorized (if option is set)
	if (options.skipCategorized && transaction.category_id !== null) {
		return {
			transactionId: transaction.id,
			categoryId: transaction.category_id,
			matchedKeyword: null,
			matchType: null,
			skipped: true,
			skipReason: 'already_categorized'
		};
	}

	// Priority 1: Try keyword matching first (fastest, most reliable)
	const match = matchTransactionToCategory(
		transaction.description,
		transaction.merchantName,
		compiledKeywords
	);

	if (match) {
		return {
			transactionId: transaction.id,
			categoryId: match.categoryId,
			matchedKeyword: match.matchedKeyword,
			matchType: match.matchType,
			skipped: false
		};
	}

	// Priority 2: Try IBAN matching (exact, reliable)
	if (transaction.counterparty_iban) {
		const ibanMatch = matchTransactionByIBAN(transaction.counterparty_iban, merchantsWithIBANs);
		if (ibanMatch) {
			// Use merchant's default category if available
			const categoryId = ibanMatch.defaultCategoryId;
			return {
				transactionId: transaction.id,
				categoryId: categoryId,
				matchedKeyword: ibanMatch.matchedIBAN,
				matchType: 'iban',
				matchedMerchantId: ibanMatch.merchantId,
				skipped: false
			};
		}
	}

	// No match found
	return {
		transactionId: transaction.id,
		categoryId: null,
		matchedKeyword: null,
		matchType: null,
		skipped: false
	};
}

/**
 * Batch process transactions and categorize them
 */
export async function categorizeTransactionsBatch(
	userId: number,
	options: CategorizationOptions = {}
): Promise<CategorizationBatchResult> {
	const startTime = Date.now();

	// ===== TIMING INSTRUMENTATION =====
	const timing = { preload: 0, fetchTransactions: 0, patternMatching: 0, vectorSearch: 0, dbWrites: 0 };
	let phaseStart: number;

	// ===== PHASE: PRELOAD =====
	phaseStart = Date.now();
	const keywords = await loadAllKeywords();
	const compiledKeywords = prepareKeywords(keywords); // Pre-compile regexes once
	const merchantsWithIBANs = await loadAllMerchantsWithIBANs();
	const allMerchants = await loadAllMerchants();
	timing.preload = Date.now() - phaseStart;

	if (compiledKeywords.length === 0 && merchantsWithIBANs.length === 0) {
		// console.warn('⚠️  No keywords or merchants with IBANs found in database. Cannot categorize transactions.');
		return {
			total: 0,
			processed: 0,
			categorized: 0,
			keywordCategorized: 0,
			ibanCategorized: 0,
			vectorCategorized: 0,
			skipped: 0,
			personsDetected: 0,
			results: []
		};
	}

	// Build query filters
	const whereClause: any = {
		user_id: userId
	};

	// Filter by transaction IDs if provided
	if (options.transactionIds && options.transactionIds.length > 0) {
		whereClause.id = { in: options.transactionIds };

	}

	// Filter by manual assignment
	if (options.skipManual !== false) {
		whereClause.is_category_manual = false;
	}

	// Filter by existing category (default: skip already categorized)
	if (options.skipCategorized !== false) {
		whereClause.category_id = null;
	}

	// Count total transactions matching criteria
	const totalCount = await (db as any).transactions.count({
		where: whereClause
	});



	if (totalCount === 0) {
		return {
			total: 0,
			processed: 0,
			categorized: 0,
			keywordCategorized: 0,
			ibanCategorized: 0,
			vectorCategorized: 0,
			skipped: 0,
			personsDetected: 0,
			results: []
		};
	}

	// Fetch transactions (include cleaning fields for vector search and merchant_id for default category)
	const queryOptions: any = {
		where: whereClause,
		select: {
			id: true,
			description: true,
			merchantName: true,
			counterparty_iban: true,
			category_id: true,
			is_category_manual: true,
			cleaned_merchant_name: true,
			normalized_description: true,
			type: true,
			is_debit: true,
			amount: true,
			merchant_id: true,
			iban: true // For detecting own accounts
		},
		orderBy: { date: 'desc' }
	};

	if (options.limit) {
		queryOptions.take = options.limit;

	}

	// ===== PHASE: FETCH TRANSACTIONS =====
	phaseStart = Date.now();
	const transactions = await (db as any).transactions.findMany(queryOptions);
	timing.fetchTransactions = Date.now() - phaseStart;

	// Get user's own IBANs for transfer detection (from transactions)
	const ownIbans = new Set<string>();
	for (const t of transactions) {
		if (t.iban) {
			const normalized = normalizeIBAN(t.iban);
			if (normalized) {
				ownIbans.add(normalized);
			}
		}
	}

	// Process each transaction
	const results: CategorizationResult[] = [];
	const categoryUpdates = new Map<number, number[]>(); // categoryId -> transactionIds[]
	const merchantUpdates = new Map<number, number[]>(); // merchantId -> transactionIds[]

	// Pending operations for batch processing (avoid per-transaction DB queries)
	const pendingIbanUpdates = new Map<number, Set<string>>(); // merchantId -> Set of IBANs to add
	// For merchants that need to be created: cleanedName -> { categoryId, ibans, transactionIds }
	const pendingMerchantsByName = new Map<string, {
		cleanedName: string;
		categoryId: number | null;
		ibans: Set<string>;
		transactionIds: number[];
	}>();

	let processed = 0;
	let categorized = 0;
	let keywordCategorized = 0;
	let ibanCategorized = 0;
	let vectorCategorized = 0;
	let skipped = 0;
	let merchantsCreated = 0;
	let personsDetected = 0; // Count of transfers between persons
	const total = transactions.length;

	// Send initial progress
	if (options.onProgress) {
		options.onProgress({
			processed: 0,
			total,
			categorized: 0,
			skipped: 0,
			notCategorized: 0,
			message: `Starting categorization of ${total} transactions...`
		});
	}

	// ===== PHASE: PATTERN MATCHING =====
	phaseStart = Date.now();

	for (const transaction of transactions) {
		// Check if transaction already has a merchant_id - if so, try to use default category
		let result: CategorizationResult;

		// First check if this is a person-to-person transfer
		// If so, don't use merchant's default category - each transfer should be categorized independently
		const transferCheck = isTransferBetweenPersons(transaction, Array.from(ownIbans));

		if (transaction.merchant_id && !transaction.category_id && !transaction.is_category_manual && !transferCheck.isTransfer) {
			// Transaction has merchant but no category, and is NOT a person transfer
			// Check merchant's default category (in-memory lookup)
			const merchant = allMerchants.byId.get(transaction.merchant_id);

			if (merchant?.default_category_id) {
				// Use merchant's default category
				result = {
					transactionId: transaction.id,
					categoryId: merchant.default_category_id,
					matchedKeyword: null,
					matchType: 'merchant',
					matchedMerchantId: transaction.merchant_id,
					skipped: false
				};
			} else {
				// No default category, try normal categorization
				result = categorizeTransaction(transaction, compiledKeywords, merchantsWithIBANs, options);
			}
		} else {
			// Normal categorization flow (includes person-to-person transfers)
			// Each transfer will be categorized based on its own description keywords
			result = categorizeTransaction(transaction, compiledKeywords, merchantsWithIBANs, options);
		}

		results.push(result);

		// Detect if this is a transfer between persons
		const transferDetection = isTransferBetweenPersons(transaction, Array.from(ownIbans));
		if (transferDetection.isTransfer) {
			personsDetected++;
		}

		if (result.skipped) {
			skipped++;
			if (result.skipReason === 'manual_assignment') {

			} else if (result.skipReason === 'already_categorized') {

			}
		} else if (result.categoryId !== null) {
			categorized++;
			// Group by category for batch update
			if (!categoryUpdates.has(result.categoryId)) {
				categoryUpdates.set(result.categoryId, []);
			}
			categoryUpdates.get(result.categoryId)!.push(result.transactionId);

			// Handle merchant linking and IBAN storage
			try {
				// If matched by IBAN, use the matched merchant ID
				if (result.matchType === 'iban' && result.matchedMerchantId) {
					// Link transaction to the merchant found by IBAN
					if (!merchantUpdates.has(result.matchedMerchantId)) {
						merchantUpdates.set(result.matchedMerchantId, []);
					}
					merchantUpdates.get(result.matchedMerchantId)!.push(result.transactionId);

					// Defer IBAN update - collect for batch processing later
					const normalizedIban = normalizeIBAN(transaction.counterparty_iban);
					if (normalizedIban) {
						if (!pendingIbanUpdates.has(result.matchedMerchantId)) {
							pendingIbanUpdates.set(result.matchedMerchantId, new Set());
						}
						pendingIbanUpdates.get(result.matchedMerchantId)!.add(normalizedIban);
					}

					// Use in-memory lookup for merchant name (for logging only)
					const merchant = allMerchants.byId.get(result.matchedMerchantId);


				} else {
					// Keyword match - clean merchant name and link to merchant
					// Check if this is a transfer between persons first
					const transferDetection = isTransferBetweenPersons(transaction, Array.from(ownIbans));

					if (!transferDetection.isTransfer) {
						// Not a transfer - find or schedule merchant creation
						const cleanedName = cleanMerchantName(transaction.merchantName, transaction.description);
						// Only process merchant if we have a valid cleaned name (not empty)
						if (cleanedName && cleanedName.length > 0) {
							const nameLower = cleanedName.toLowerCase();
							const normalizedIban = normalizeIBAN(transaction.counterparty_iban);

							// Check if merchant already exists (in-memory lookup)
							const existingMerchant = allMerchants.byName.get(nameLower);

							if (existingMerchant) {
								// Merchant exists - use its ID
								if (!merchantUpdates.has(existingMerchant.id)) {
									merchantUpdates.set(existingMerchant.id, []);
								}
								merchantUpdates.get(existingMerchant.id)!.push(result.transactionId);

								// Schedule IBAN update if needed
								if (normalizedIban && !existingMerchant.ibans.includes(normalizedIban)) {
									if (!pendingIbanUpdates.has(existingMerchant.id)) {
										pendingIbanUpdates.set(existingMerchant.id, new Set());
									}
									pendingIbanUpdates.get(existingMerchant.id)!.add(normalizedIban);
								}
							} else {
								// Merchant doesn't exist - defer creation
								if (!pendingMerchantsByName.has(nameLower)) {
									pendingMerchantsByName.set(nameLower, {
										cleanedName,
										categoryId: result.categoryId,
										ibans: new Set(),
										transactionIds: []
									});
								}
								const pending = pendingMerchantsByName.get(nameLower)!;
								pending.transactionIds.push(result.transactionId);
								if (normalizedIban) {
									pending.ibans.add(normalizedIban);
								}
								// Use category if this transaction has one and the pending one doesn't
								if (result.categoryId && !pending.categoryId) {
									pending.categoryId = result.categoryId;
								}
							}


						} else {

						}
					} else {
						// Transfer between persons - skip merchant creation

					}
				}
			} catch (err) {

			}
		} else {
			// Even for unmatched transactions, try to clean merchant name (without category)
			// Also store IBAN if available for future matching
			// But skip if it's a transfer between persons
			const transferDetection = isTransferBetweenPersons(transaction, Array.from(ownIbans));

			if (!transferDetection.isTransfer) {
				try {
					const cleanedName = cleanMerchantName(transaction.merchantName, transaction.description);
					// Only process merchant if we have a valid cleaned name (not empty)
					if (cleanedName && cleanedName.length > 0) {
						const nameLower = cleanedName.toLowerCase();
						const normalizedIban = normalizeIBAN(transaction.counterparty_iban);

						// Check if merchant already exists (in-memory lookup)
						const existingMerchant = allMerchants.byName.get(nameLower);

						if (existingMerchant) {
							// Merchant exists - use its ID
							if (!merchantUpdates.has(existingMerchant.id)) {
								merchantUpdates.set(existingMerchant.id, []);
							}
							merchantUpdates.get(existingMerchant.id)!.push(result.transactionId);

							// Schedule IBAN update if needed
							if (normalizedIban && !existingMerchant.ibans.includes(normalizedIban)) {
								if (!pendingIbanUpdates.has(existingMerchant.id)) {
									pendingIbanUpdates.set(existingMerchant.id, new Set());
								}
								pendingIbanUpdates.get(existingMerchant.id)!.add(normalizedIban);
							}
						} else {
							// Merchant doesn't exist - defer creation
							if (!pendingMerchantsByName.has(nameLower)) {
								pendingMerchantsByName.set(nameLower, {
									cleanedName,
									categoryId: null,
									ibans: new Set(),
									transactionIds: []
								});
							}
							const pending = pendingMerchantsByName.get(nameLower)!;
							pending.transactionIds.push(result.transactionId);
							if (normalizedIban) {
								pending.ibans.add(normalizedIban);
							}
						}


					} else {

					}
				} catch (err) {

				}
			} else {

			}
		}

		processed++;

		// Send progress update every 10 transactions or at the end
		if (options.onProgress && (processed % 10 === 0 || processed === total)) {
			const notCategorized = processed - categorized - skipped;
			options.onProgress({
				processed,
				total,
				categorized,
				skipped,
				notCategorized,
				message: `Processed ${processed} of ${total} transactions... (${keywordCategorized} keywords, ${ibanCategorized} IBAN, ${vectorCategorized} vector)`
			});
		}
	}

	timing.patternMatching = Date.now() - phaseStart;

	// ===== PHASE: VECTOR SEARCH =====
	phaseStart = Date.now();

	// Priority 3: Vector Similarity Search for unmatched transactions
	const unmatchedTransactions = transactions.filter((t: any, index: number) => {
		const result = results[index];
		return !result.skipped && result.categoryId === null;
	});

	if (unmatchedTransactions.length > 0) {
		const vectorAvailable = await isVectorMatchingAvailable();

		if (vectorAvailable) {
			// console.log(`\n🔍 Running vector similarity search on ${unmatchedTransactions.length} unmatched transactions...`);

			if (options.onProgress) {
				options.onProgress({
					processed,
					total,
					categorized,
					skipped,
					notCategorized: unmatchedTransactions.length,
					message: `🔍 Starting vector similarity search on ${unmatchedTransactions.length} transactions...`,
					vectorSearchProgress: {
						processed: 0,
						total: unmatchedTransactions.length,
						matched: 0
					}
				});
			}

			try {
				// Process in smaller batches (25 at a time) for better progress updates
				const vectorBatchSize = 25;
				let vectorProcessed = 0;
				let vectorMatches = 0;

				for (let i = 0; i < unmatchedTransactions.length; i += vectorBatchSize) {
					const batch = unmatchedTransactions.slice(i, i + vectorBatchSize);

					// Prepare transactions for vector matching
					const transactionsForVector: TransactionForEmbedding[] = batch.map((t: any) => {
						// Use cleaned data if available, otherwise calculate on the fly
						let cleanedName = t.cleaned_merchant_name;
						let normalizedDesc = t.normalized_description;

						// If cleaning fields are missing, calculate them
						if (!cleanedName) {
							cleanedName = cleanMerchantName(t.merchantName, t.description);
						}
						if (!normalizedDesc) {
							// Use description as-is for now (could add description cleaner here)
							normalizedDesc = t.description;
						}

						return {
							id: t.id,
							cleaned_merchant_name: cleanedName,
							normalized_description: normalizedDesc,
							type: t.type,
							is_debit: t.is_debit
						};
					});

					// Run vector matching on this batch
					const vectorResults = await matchTransactionsBatchWithVector(transactionsForVector, userId);

					// Update results with vector matches
					for (const vectorMatch of vectorResults.results) {
						if (vectorMatch.matched) {
							const resultIndex = results.findIndex(r => r.transactionId === vectorMatch.transactionId);
							if (resultIndex !== -1) {
								const result = results[resultIndex];
								result.categoryId = vectorMatch.categoryId;
								result.matchType = 'vector';
								result.matchedKeyword = vectorMatch.categoryName;
								result.similarity = vectorMatch.similarity;

								// Update counters
								categorized++;
								vectorCategorized++;
								vectorMatches++;

								// Group by category for batch update
								if (!categoryUpdates.has(vectorMatch.categoryId)) {
									categoryUpdates.set(vectorMatch.categoryId, []);
								}
								categoryUpdates.get(vectorMatch.categoryId)!.push(vectorMatch.transactionId);
							}
						}
					}

					vectorProcessed += batch.length;

					// Update progress after each batch
					if (options.onProgress) {
						const remaining = unmatchedTransactions.length - vectorProcessed;
						options.onProgress({
							processed,
							total,
							categorized,
							skipped,
							notCategorized: remaining,
							message: `🔍 Vector search: ${vectorProcessed}/${unmatchedTransactions.length} processed, ${vectorMatches} matched...`,
							vectorSearchProgress: {
								processed: vectorProcessed,
								total: unmatchedTransactions.length,
								matched: vectorMatches
							}
						});
					}
				}

				// console.log(`   ✅ Vector search matched ${vectorMatches} transactions`);

				if (options.onProgress) {
					options.onProgress({
						processed,
						total,
						categorized,
						skipped,
						notCategorized: unmatchedTransactions.length - vectorMatches,
						message: `✅ Vector search complete: ${vectorMatches} transactions matched`,
						vectorSearchProgress: {
							processed: unmatchedTransactions.length,
							total: unmatchedTransactions.length,
							matched: vectorMatches
						}
					});
				}
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : 'Unknown error';
				// console.error('   ❌ Error in vector search:', err);

				if (options.onProgress) {
					options.onProgress({
						processed,
						total,
						categorized,
						skipped,
						notCategorized: unmatchedTransactions.length,
						message: `❌ Vector search failed: ${errorMessage}`,
						vectorSearchError: errorMessage
					});
				}
			}
		} else {
			// console.log(`   ⏭️  Vector search skipped (not available - no category embeddings found)`);
		}
	}

	// Send progress update before database updates
	if (options.onProgress) {
		const notCategorized = processed - categorized - skipped;
		options.onProgress({
			processed,
			total,
			categorized,
			skipped,
			notCategorized,
			message: `Updating database...`
		});
	}

	timing.vectorSearch = Date.now() - phaseStart;

	// ===== PHASE: DATABASE WRITES =====
	phaseStart = Date.now();

	// Step 1: Create pending merchants in batch
	if (pendingMerchantsByName.size > 0) {
		// console.log(`   Creating ${pendingMerchantsByName.size} new merchants...`);
		for (const [nameLower, pending] of pendingMerchantsByName.entries()) {
			try {
				// Create the merchant
				const newMerchant = await (db as any).merchants.create({
					data: {
						name: pending.cleanedName,
						keywords: [],
						ibans: Array.from(pending.ibans),
						default_category_id: pending.categoryId || null,
						is_active: true,
						updated_at: new Date()
					}
				});

				merchantsCreated++;

				// Add transactions to merchantUpdates for linking
				if (!merchantUpdates.has(newMerchant.id)) {
					merchantUpdates.set(newMerchant.id, []);
				}
				merchantUpdates.get(newMerchant.id)!.push(...pending.transactionIds);

				// console.log(`   ✓ Created merchant "${pending.cleanedName}" (ID: ${newMerchant.id}) with ${pending.transactionIds.length} transactions`);
			} catch (err) {
				// console.warn(`   ⚠️  Failed to create merchant "${pending.cleanedName}":`, err);
			}
		}
	}

	// Step 2: Batch update IBANs for existing merchants
	if (pendingIbanUpdates.size > 0) {
		// console.log(`   Updating IBANs for ${pendingIbanUpdates.size} merchants...`);
		for (const [merchantId, newIbans] of pendingIbanUpdates.entries()) {
			try {
				// Get current IBANs
				const merchant = await (db as any).merchants.findUnique({
					where: { id: merchantId },
					select: { ibans: true }
				});

				if (merchant) {
					const currentIbans = merchant.ibans || [];
					const ibansToAdd = Array.from(newIbans).filter((iban: string) => !currentIbans.includes(iban));

					if (ibansToAdd.length > 0) {
						await (db as any).merchants.update({
							where: { id: merchantId },
							data: {
								ibans: [...currentIbans, ...ibansToAdd],
								updated_at: new Date()
							}
						});
						// console.log(`   ✓ Added ${ibansToAdd.length} IBANs to merchant ${merchantId}`);
					}
				}
			} catch (err) {
				// console.warn(`   ⚠️  Failed to update IBANs for merchant ${merchantId}:`, err);
			}
		}
	}

	// Step 3: Update categories
	let categoryUpdateCount = 0;
	if (categoryUpdates.size > 0) {
		// console.log(`   Updating ${categoryUpdates.size} category assignments...`);
		for (const [categoryId, transactionIds] of categoryUpdates.entries()) {
			const count = await (db as any).transactions.updateMany({
				where: {
					id: { in: transactionIds },
					user_id: userId
				},
				data: {
					category_id: categoryId,
					updated_at: new Date()
				}
			});
			categoryUpdateCount += count.count;
			// console.log(`   ✓ Updated ${count.count} transactions to category ${categoryId}`);
		}
	}

	// Update merchants and apply default categories
	let merchantUpdateCount = 0;
	if (merchantUpdates.size > 0) {
		// console.log(`   Linking ${merchantUpdates.size} merchants to transactions...`);
		for (const [merchantId, transactionIds] of merchantUpdates.entries()) {
			// Try in-memory lookup first, fall back to DB for newly created merchants
			let merchant = allMerchants.byId.get(merchantId);

			// For newly created merchants, we need their info (they're not in allMerchants)
			if (!merchant) {
				const dbMerchant = await (db as any).merchants.findUnique({
					where: { id: merchantId },
					select: { name: true, default_category_id: true, ibans: true }
				});
				if (dbMerchant) {
					merchant = {
						id: merchantId,
						name: dbMerchant.name,
						default_category_id: dbMerchant.default_category_id,
						ibans: dbMerchant.ibans || []
					};
				}
			}

			// Update merchant_id for all transactions
			const count = await (db as any).transactions.updateMany({
				where: {
					id: { in: transactionIds },
					user_id: userId
				},
				data: {
					merchant_id: merchantId,
					updated_at: new Date()
				}
			});
			merchantUpdateCount += count.count;

			// If merchant has default category, apply it to transactions that don't have a category yet
			if (merchant?.default_category_id) {
				const categoryCount = await (db as any).transactions.updateMany({
					where: {
						id: { in: transactionIds },
						user_id: userId,
						category_id: null,
						is_category_manual: false
					},
					data: {
						category_id: merchant.default_category_id,
						updated_at: new Date()
					}
				});

				if (categoryCount.count > 0) {
					// console.log(`   ✓ Linked ${count.count} transactions to merchant "${merchant.name || merchantId}" and applied default category to ${categoryCount.count} transactions`);

					// Update result counters
					categorized += categoryCount.count;
					// Add to category updates for tracking
					if (!categoryUpdates.has(merchant.default_category_id)) {
						categoryUpdates.set(merchant.default_category_id, []);
					}
					categoryUpdates.get(merchant.default_category_id)!.push(...transactionIds);
				} else {
					// console.log(`   ✓ Linked ${count.count} transactions to merchant "${merchant.name || merchantId}"`);
				}
			} else {
				// console.log(`   ✓ Linked ${count.count} transactions to merchant "${merchant?.name || merchantId}"`);
			}
		}
	}

	timing.dbWrites = Date.now() - phaseStart;
	const duration = Date.now() - startTime;
	const notCategorized = processed - categorized - skipped;

	// ===== TIMING SUMMARY =====
	console.log(`\n⏱️  CATEGORIZATION TIMING (${transactions.length} transactions):`);
	console.log(`   Preload (keywords/merchants): ${timing.preload}ms`);
	console.log(`   Fetch transactions:           ${timing.fetchTransactions}ms`);
	console.log(`   Pattern matching:             ${timing.patternMatching}ms`);
	console.log(`   Vector search:                ${timing.vectorSearch}ms`);
	console.log(`   Database writes:              ${timing.dbWrites}ms`);
	console.log(`   ──────────────────────────────`);
	console.log(`   TOTAL:                        ${duration}ms`);
	console.log(`   Results: ${categorized} categorized, ${skipped} skipped, ${notCategorized} unmatched`);

	// Send final progress update
	if (options.onProgress) {
		options.onProgress({
			processed,
			total,
			categorized,
			skipped,
			notCategorized,
			message: `Complete! Categorized ${categorized} transactions, ${notCategorized} remain uncategorized.`
		});
	}

	return {
		total: totalCount,
		processed,
		categorized,
		keywordCategorized,
		ibanCategorized,
		vectorCategorized,
		skipped,
		personsDetected,
		results
	};
}

/**
 * Categorize a single transaction using Deep AI (Gemini 3 Pro)
 */
export async function categorizeSingleTransactionWithAI(
	userId: number,
	transactionId: number
): Promise<AICategorizationResult> {
	// console.log(`[Deep AI] Starting categorization for transaction ${transactionId}`);

	// 1. Fetch transaction details
	const transaction = await (db as any).transactions.findUnique({
		where: {
			id: transactionId,
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

	if (!transaction) {
		throw new Error(`Transaction ${transactionId} not found`);
	}

	// 2. Prepare for AI
	const transactionForAI: TransactionForAI = {
		id: transaction.id,
		description: transaction.description || '',
		merchantName: transaction.merchantName || '',
		amount: typeof transaction.amount === 'object' && transaction.amount?.toNumber
			? transaction.amount.toNumber()
			: Number(transaction.amount),
		type: transaction.type,
		is_debit: transaction.is_debit,
		date: transaction.date instanceof Date ? transaction.date.toISOString() : transaction.date
	};

	// 3. Call OpenAI with Deep AI settings
	// Model: gpt-5-mini
	// Features: Search Grounding, Reasoning, Cleaned Merchant Name
	// console.log(`[Deep AI] Calling OpenAI for transaction ${transactionId}...`);
	try {
		const batchResult = await categorizeBatchWithOpenAI(
			userId,
			[transactionForAI],
			'gpt-5-mini',
			{
				includeReasoning: true,
				includeCleanedMerchantName: true,
				includeMerchantNameOptions: true, // Show 3 merchant name variations for individual categorization
				enableSearchGrounding: true,
				useCategoryNames: true,
				temperature: 0.3,
				maxTokens: 4000
			}
		);

		// console.log(`[Deep AI] Gemini response received. Results: ${batchResult.results.length}`);

		if (batchResult.results.length === 0) {
			throw new Error('AI returned no results');
		}

		return batchResult.results[0];
	} catch (error) {
		// console.error(`[Deep AI] Error calling OpenAI:`, error);
		throw error;
	}
}

/**
 * Update a transaction's category and merchant name manually
 * Handles merchant creation/linking logic
 */
export async function updateTransactionCategory(
	userId: number,
	transactionId: number,
	categoryId: number,
	merchantName: string
): Promise<void> {
	// 1. Verify transaction ownership
	const transaction = await (db as any).transactions.findUnique({
		where: {
			id: transactionId,
			user_id: userId
		}
	});

	if (!transaction) {
		throw new Error(`Transaction ${transactionId} not found`);
	}

	// 2. Handle Merchant Logic
	let merchantId: number | null = transaction.merchant_id;

	// If merchant name changed or wasn't linked, try to find/create merchant
	if (merchantName !== transaction.merchantName || !merchantId) {
		// Clean the name just in case, though user input is taken as truth here
		const cleanedName = merchantName.trim();

		if (cleanedName) {
			merchantId = await findOrCreateMerchant(
				db,
				cleanedName,
				categoryId,
				transaction.counterparty_iban
			);
		}
	}

	// 3. Update Transaction
	await (db as any).transactions.update({
		where: { id: transactionId },
		data: {
			category_id: categoryId,
			merchantName: merchantName, // Update the display name too
			merchant_id: merchantId,
			category_confidence: 0.95, // Manual update = 95% confidence (as requested)
			is_category_manual: true, // Mark as manually categorized
			updated_at: new Date()
		}
	});

	// 4. Update Merchant's default category if it was just created or updated
	if (merchantId) {
		await (db as any).merchants.update({
			where: { id: merchantId },
			data: {
				default_category_id: categoryId
			}
		});
	}
}


