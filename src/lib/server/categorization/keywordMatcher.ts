/**
 * Keyword Matching Engine
 * 
 * Matches transactions to categories using keyword-based word boundary matching.
 * Case-insensitive matching against transaction description and merchant name.
 */

export interface KeywordMatch {
	categoryId: number;
	matchedKeyword: string;
	matchType: 'description' | 'merchant';
}

export interface Keyword {
	category_id: number;
	keyword: string;
}

/**
 * Escape special regex characters in a string
 */
export function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalize text for matching (lowercase, trim)
 */
export function normalizeText(text: string): string {
	if (!text || typeof text !== 'string') {
		return '';
	}
	return text.trim().toLowerCase();
}

/**
 * Create a word boundary regex for a keyword
 * Matches whole words only (not partial matches)
 */
export function createWordBoundaryRegex(keyword: string): RegExp {
	const escaped = escapeRegex(keyword);
	return new RegExp(`\\b${escaped}\\b`, 'i'); // 'i' flag for case-insensitive
}

/**
 * Match a transaction to a category using keywords
 * 
 * @param description - Transaction description
 * @param merchantName - Merchant name
 * @param keywords - Array of keywords with category_id
 * @returns Match result or null if no match
 */
export function matchTransactionToCategory(
	description: string,
	merchantName: string,
	keywords: Keyword[]
): KeywordMatch | null {
	// Normalize input text
	const normalizedDescription = normalizeText(description);
	const normalizedMerchant = normalizeText(merchantName);

	// If both are empty, no match possible
	if (!normalizedDescription && !normalizedMerchant) {
		return null;
	}

	// Try each keyword
	for (const keywordData of keywords) {
		const keyword = normalizeText(keywordData.keyword);

		// Skip empty keywords
		if (!keyword) {
			continue;
		}

		// Create regex for word boundary matching
		const regex = createWordBoundaryRegex(keyword);

		// Check description first (more specific)
		if (normalizedDescription && regex.test(normalizedDescription)) {
			return {
				categoryId: keywordData.category_id,
				matchedKeyword: keywordData.keyword, // Return original keyword (not normalized)
				matchType: 'description'
			};
		}

		// Check merchant name
		if (normalizedMerchant && regex.test(normalizedMerchant)) {
			return {
				categoryId: keywordData.category_id,
				matchedKeyword: keywordData.keyword, // Return original keyword (not normalized)
				matchType: 'merchant'
			};
		}
	}

	// No match found
	return null;
}

