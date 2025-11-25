/**
 * Transaction Categorization Service
 * 
 * Batch processes transactions and matches them to categories using keywords.
 */

import { db } from '$lib/server/db';
import { matchTransactionToCategory, type Keyword } from './keywordMatcher';
import { cleanMerchantName, findOrCreateMerchant } from './merchantNameCleaner';

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
	}) => void; // Progress callback
}

export interface CategorizationResult {
	transactionId: number;
	categoryId: number | null;
	matchedKeyword: string | null;
	matchType: 'description' | 'merchant' | null;
	skipped: boolean;
	skipReason?: string;
}

export interface CategorizationBatchResult {
	total: number;
	processed: number;
	categorized: number;
	skipped: number;
	results: CategorizationResult[];
}

/**
 * Load all keywords from the database
 * Efficient for batch processing - load once, use many times
 */
export async function loadAllKeywords(): Promise<Keyword[]> {
	console.log('📚 Loading all keywords from database...');
	
	const keywords = await (db as any).category_keywords.findMany({
		select: {
			category_id: true,
			keyword: true
		}
	});

	console.log(`✅ Loaded ${keywords.length} keywords from ${new Set(keywords.map((k: Keyword) => k.category_id)).size} categories`);
	
	return keywords;
}

/**
 * Categorize a single transaction
 */
function categorizeTransaction(
	transaction: {
		id: number;
		description: string;
		merchantName: string;
		category_id: number | null;
		is_category_manual: boolean;
	},
	keywords: Keyword[],
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

	// Try to match
	const match = matchTransactionToCategory(
		transaction.description,
		transaction.merchantName,
		keywords
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
	console.log('🚀 Starting transaction categorization batch...');
	console.log(`   User ID: ${userId}`);
	console.log(`   Options:`, {
		skipManual: options.skipManual !== false,
		skipCategorized: options.skipCategorized !== false,
		limit: options.limit || 'unlimited',
		transactionIds: options.transactionIds?.length || 'all'
	});

	// Load all keywords once (efficient)
	const keywords = await loadAllKeywords();

	if (keywords.length === 0) {
		console.warn('⚠️  No keywords found in database. Cannot categorize transactions.');
		return {
			total: 0,
			processed: 0,
			categorized: 0,
			skipped: 0,
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
		console.log(`   Filtering to ${options.transactionIds.length} specific transactions`);
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

	console.log(`📊 Found ${totalCount} transactions to process`);

	if (totalCount === 0) {
		return {
			total: 0,
			processed: 0,
			categorized: 0,
			skipped: 0,
			results: []
		};
	}

	// Fetch transactions
	const queryOptions: any = {
		where: whereClause,
		select: {
			id: true,
			description: true,
			merchantName: true,
			category_id: true,
			is_category_manual: true
		},
		orderBy: { date: 'desc' }
	};

	if (options.limit) {
		queryOptions.take = options.limit;
		console.log(`   Limiting to ${options.limit} transactions`);
	}

	const transactions = await (db as any).transactions.findMany(queryOptions);

	console.log(`📥 Loaded ${transactions.length} transactions`);

	// Process each transaction
	const results: CategorizationResult[] = [];
	const categoryUpdates = new Map<number, number[]>(); // categoryId -> transactionIds[]
	const merchantUpdates = new Map<number, number[]>(); // merchantId -> transactionIds[]

	let processed = 0;
	let categorized = 0;
	let skipped = 0;
	let merchantsCreated = 0;
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

	for (const transaction of transactions) {
		const result = categorizeTransaction(transaction, keywords, options);
		results.push(result);

		if (result.skipped) {
			skipped++;
			if (result.skipReason === 'manual_assignment') {
				console.log(`   ⏭️  Transaction ${transaction.id}: Skipped (manual assignment)`);
			} else if (result.skipReason === 'already_categorized') {
				console.log(`   ⏭️  Transaction ${transaction.id}: Skipped (already categorized)`);
			}
		} else if (result.categoryId !== null) {
			categorized++;
			// Group by category for batch update
			if (!categoryUpdates.has(result.categoryId)) {
				categoryUpdates.set(result.categoryId, []);
			}
			categoryUpdates.get(result.categoryId)!.push(result.transactionId);
			
			// Clean merchant name and link to merchant
			try {
				const cleanedName = cleanMerchantName(transaction.merchantName, transaction.description);
				// Only create merchant if we have a valid cleaned name (not empty)
				if (cleanedName && cleanedName.length > 0 && cleanedName !== transaction.merchantName) {
					const merchantId = await findOrCreateMerchant(db, cleanedName, result.categoryId);
					
					// Group by merchant for batch update
					if (!merchantUpdates.has(merchantId)) {
						merchantUpdates.set(merchantId, []);
					}
					merchantUpdates.get(merchantId)!.push(result.transactionId);
					
					console.log(
						`   ✅ Transaction ${transaction.id}: Matched to category ${result.categoryId} via "${result.matchedKeyword}" in ${result.matchType}, merchant: "${cleanedName}"`
					);
				} else {
					console.log(
						`   ✅ Transaction ${transaction.id}: Matched to category ${result.categoryId} via "${result.matchedKeyword}" in ${result.matchType}`
					);
				}
			} catch (err) {
				console.warn(`   ⚠️  Transaction ${transaction.id}: Failed to clean merchant name:`, err);
				console.log(
					`   ✅ Transaction ${transaction.id}: Matched to category ${result.categoryId} via "${result.matchedKeyword}" in ${result.matchType}`
				);
			}
		} else {
			// Even for unmatched transactions, try to clean merchant name (without category)
			try {
				const cleanedName = cleanMerchantName(transaction.merchantName, transaction.description);
				// Only create merchant if we have a valid cleaned name (not empty)
				if (cleanedName && cleanedName.length > 0 && cleanedName !== transaction.merchantName) {
					const merchantId = await findOrCreateMerchant(db, cleanedName, null);
					
					// Group by merchant for batch update
					if (!merchantUpdates.has(merchantId)) {
						merchantUpdates.set(merchantId, []);
					}
					merchantUpdates.get(merchantId)!.push(result.transactionId);
					
					console.log(`   ❌ Transaction ${transaction.id}: No match found, but cleaned merchant: "${cleanedName}"`);
				} else {
					console.log(`   ❌ Transaction ${transaction.id}: No match found`);
				}
			} catch (err) {
				console.warn(`   ⚠️  Transaction ${transaction.id}: Failed to clean merchant name:`, err);
				console.log(`   ❌ Transaction ${transaction.id}: No match found`);
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
				message: `Processed ${processed} of ${total} transactions...`
			});
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

	// Batch update database
	console.log(`\n💾 Updating database...`);
	
	// Update categories
	let categoryUpdateCount = 0;
	if (categoryUpdates.size > 0) {
		console.log(`   Updating ${categoryUpdates.size} category assignments...`);
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
			console.log(`   ✓ Updated ${count.count} transactions to category ${categoryId}`);
		}
	}

	// Update merchants
	let merchantUpdateCount = 0;
	if (merchantUpdates.size > 0) {
		console.log(`   Linking ${merchantUpdates.size} merchants to transactions...`);
		for (const [merchantId, transactionIds] of merchantUpdates.entries()) {
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
			const merchant = await (db as any).merchants.findUnique({
				where: { id: merchantId },
				select: { name: true }
			});
			console.log(`   ✓ Linked ${count.count} transactions to merchant "${merchant?.name || merchantId}"`);
		}
	}

	const duration = Date.now() - startTime;
	const notCategorized = processed - categorized - skipped;
	
	console.log(`\n✨ Categorization complete!`);
	console.log(`   Total: ${totalCount}`);
	console.log(`   Processed: ${processed}`);
	console.log(`   Categorized: ${categorized}`);
	console.log(`   Skipped: ${skipped}`);
	console.log(`   No match: ${notCategorized}`);
	console.log(`   Merchants linked: ${merchantUpdateCount}`);
	console.log(`   Duration: ${duration}ms`);

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
		skipped,
		results
	};
}

