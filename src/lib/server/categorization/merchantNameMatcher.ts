/**
 * Merchant Name Matcher
 * 
 * Matches transactions by finding other transactions with the same cleaned merchant name
 * that already have a category assigned. Learns from past categorizations.
 * 
 * Priority 2 in the categorization cascade (after keyword matching, before AI).
 */

import { db } from '$lib/server/db';
import { cleanMerchantName } from './merchantNameCleaner';

export interface MerchantNameMatch {
	categoryId: number;
	categoryName: string;
	merchantName: string; // The cleaned merchant name that was matched
	matchCount: number; // How many transactions with this merchant name have this category
	hasManualCategory: boolean; // Whether any of the matches were manually categorized
}

/**
 * Match a transaction by finding other transactions with the same cleaned merchant name
 * 
 * @param merchantName - Original merchant name from transaction
 * @param description - Transaction description (for cleaning merchant name)
 * @returns Match result with category, or null if no match found
 */
export async function matchTransactionByMerchantName(
	merchantName: string | null,
	description: string | null
): Promise<MerchantNameMatch | null> {
	if (!merchantName) {
		return null;
	}

	// Clean the merchant name
	const cleanedName = cleanMerchantName(merchantName, description || '');
	
	if (!cleanedName || cleanedName.length === 0) {
		return null;
	}

	// Normalize cleaned name to lowercase for case-insensitive matching
	const cleanedNameLower = cleanedName.toLowerCase();

	// Debug: Check how many transactions with this merchant name have categories
	const debugCount = await db.$queryRaw<[{ count: bigint }]>`
		SELECT COUNT(*) as count 
		FROM transactions 
		WHERE LOWER(cleaned_merchant_name) = ${cleanedNameLower} 
			AND category_id IS NOT NULL
	`;
	
	const count = Number(debugCount[0].count);
	if (count === 0) {
		// No matches found - this is expected if this is the first transaction with this merchant name
		return null;
	}
	
	// Debug logging (only for first few calls to avoid spam)
	if (Math.random() < 0.1) { // 10% chance to log
		console.log(`   🔍 Merchant name match check: "${cleanedName}" found ${count} categorized transactions`);
	}

	// Find all transactions with the same cleaned merchant name that have a category
	// Group by category and count occurrences
	// Prefer categories that appear more frequently
	// Prefer manually categorized transactions
	// Note: This includes transactions just categorized in the current batch
	// Use LOWER() for case-insensitive matching
	const results = await db.$queryRaw<Array<{
		category_id: number;
		category_name: string;
		match_count: bigint;
		has_manual: boolean;
	}>>`
		SELECT 
			t.category_id,
			c.name as category_name,
			COUNT(*) as match_count,
			BOOL_OR(t.is_category_manual) as has_manual
		FROM transactions t
		INNER JOIN categories c ON t.category_id = c.id
		WHERE LOWER(t.cleaned_merchant_name) = ${cleanedNameLower}
			AND t.category_id IS NOT NULL
		GROUP BY t.category_id, c.name
		ORDER BY 
			BOOL_OR(t.is_category_manual) DESC, -- Prefer manual categories
			COUNT(*) DESC -- Then by frequency
		LIMIT 1
	`;

	if (results.length === 0) {
		return null;
	}

	const result = results[0];
	return {
		categoryId: result.category_id,
		categoryName: result.category_name,
		merchantName: cleanedName, // The cleaned merchant name that was matched
		matchCount: Number(result.match_count),
		hasManualCategory: result.has_manual
	};
}

/**
 * Match multiple transactions by merchant name
 * More efficient than matching one at a time
 * 
 * @param transactions - Array of transactions with merchantName and description
 * @returns Map of transaction ID to match result (or null if no match)
 */
export async function matchTransactionsByMerchantName(
	transactions: Array<{ id: number; merchantName: string | null; description: string | null }>
): Promise<Map<number, MerchantNameMatch | null>> {
	const results = new Map<number, MerchantNameMatch | null>();

	if (transactions.length === 0) {
		return results;
	}

	// Clean all merchant names and normalize to lowercase for consistent matching
	const cleanedNames = new Map<number, string>();
	for (const transaction of transactions) {
		if (transaction.merchantName) {
			const cleaned = cleanMerchantName(transaction.merchantName, transaction.description || '');
			if (cleaned && cleaned.length > 0) {
				// Normalize to lowercase for case-insensitive matching
				cleanedNames.set(transaction.id, cleaned.toLowerCase());
			}
		}
	}

	if (cleanedNames.size === 0) {
		// No valid merchant names to match
		for (const transaction of transactions) {
			results.set(transaction.id, null);
		}
		return results;
	}

	// Get unique cleaned names
	const uniqueCleanedNames = Array.from(new Set(cleanedNames.values()));

	// Query for all matches at once using $queryRawUnsafe for dynamic IN clause
	// Escape single quotes in merchant names
	// Use LOWER() for case-insensitive matching since cleaned_merchant_name might not be lowercase
	const inClause = uniqueCleanedNames.map(name => `'${name.replace(/'/g, "''")}'`).join(',');
	
	const query = `
		SELECT 
			t.cleaned_merchant_name,
			t.category_id,
			c.name as category_name,
			COUNT(*) as match_count,
			BOOL_OR(t.is_category_manual) as has_manual
		FROM transactions t
		INNER JOIN categories c ON t.category_id = c.id
		WHERE LOWER(t.cleaned_merchant_name) IN (${inClause})
			AND t.category_id IS NOT NULL
		GROUP BY t.cleaned_merchant_name, t.category_id, c.name
		ORDER BY 
			t.cleaned_merchant_name,
			BOOL_OR(t.is_category_manual) DESC,
			COUNT(*) DESC
	`;
	
	const allMatches = await db.$queryRawUnsafe<Array<{
		cleaned_merchant_name: string;
		category_id: number;
		category_name: string;
		match_count: bigint;
		has_manual: boolean;
	}>>(query);

	console.log(`   🔍 Merchant name batch query: checked ${uniqueCleanedNames.length} unique merchant names, found ${allMatches.length} category groups`);

	// Group matches by cleaned merchant name (lowercase), taking the best match for each
	const bestMatchesByMerchant = new Map<string, MerchantNameMatch & { merchantName: string }>();
	for (const match of allMatches) {
		// Normalize to lowercase for case-insensitive matching
		const key = match.cleaned_merchant_name.toLowerCase();
		if (!bestMatchesByMerchant.has(key)) {
			bestMatchesByMerchant.set(key, {
				categoryId: match.category_id,
				categoryName: match.category_name,
				matchCount: Number(match.match_count),
				hasManualCategory: match.has_manual,
				merchantName: match.cleaned_merchant_name // Store original merchant name for display
			});
			console.log(`   ✅ Found match for "${match.cleaned_merchant_name}": ${match.category_name} (${match.match_count} matches, ${match.has_manual ? 'manual' : 'auto'})`);
		}
	}
	
	console.log(`   📊 Best matches found for ${bestMatchesByMerchant.size} merchant names`);

	// Map results back to transactions
	for (const transaction of transactions) {
		const cleanedName = cleanedNames.get(transaction.id);
		if (cleanedName) {
			const match = bestMatchesByMerchant.get(cleanedName);
			results.set(transaction.id, match || null);
		} else {
			results.set(transaction.id, null);
		}
	}

	return results;
}

