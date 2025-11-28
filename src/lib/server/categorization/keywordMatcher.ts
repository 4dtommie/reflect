/**
 * Keyword Matching Engine
 * 
 * Matches transactions to categories using keyword-based word boundary matching.
 * Case-insensitive matching against merchant name only (not description).
 */

export interface KeywordMatch {
	categoryId: number;
	matchedKeyword: string;
	matchType: 'merchant';
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
 * Only matches against merchant name (not description).
 * 
 * @param description - Transaction description (unused, kept for API compatibility)
 * @param merchantName - Merchant name (only field used for matching)
 * @param keywords - Array of keywords with category_id
 * @returns Match result or null if no match
 */
export function matchTransactionToCategory(
	description: string,
	merchantName: string,
	keywords: Keyword[]
): KeywordMatch | null {
	// Normalize merchant name
	const normalizedMerchant = normalizeText(merchantName);

	// If merchant name is empty, no match possible
	if (!normalizedMerchant) {
		return null;
	}

	// Pass 1: Try exact word boundary matching (highest confidence)
	for (const keywordData of keywords) {
		const keyword = normalizeText(keywordData.keyword);

		// Skip empty keywords
		if (!keyword) {
			continue;
		}

		// Create regex for word boundary matching
		const regex = createWordBoundaryRegex(keyword);

		// Check merchant name only
		if (regex.test(normalizedMerchant)) {
			return {
				categoryId: keywordData.category_id,
				matchedKeyword: keywordData.keyword, // Return original keyword (not normalized)
				matchType: 'merchant'
			};
		}
	}

	// Pass 2: Try substring matching for Dutch compound words
	// Only for keywords with 5+ characters to avoid false positives
	// Example: "salaris" matches "salarisadministratie"
	for (const keywordData of keywords) {
		const keyword = normalizeText(keywordData.keyword);

		// Skip short keywords (too likely to cause false positives)
		if (!keyword || keyword.length < 5) {
			continue;
		}

		// Check if keyword is contained within the merchant name
		if (normalizedMerchant.includes(keyword)) {
			return {
				categoryId: keywordData.category_id,
				matchedKeyword: keywordData.keyword,
				matchType: 'merchant'
			};
		}
	}

	// No match found
	return null;
}

