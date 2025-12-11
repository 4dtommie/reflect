/**
 * Keyword Matching Engine
 * 
 * Matches transactions to categories using keyword-based word boundary matching.
 * Case-insensitive matching against merchant name only (not description).
 * 
 * OPTIMIZATION: Pre-compile regexes once via prepareKeywords() instead of
 * creating new RegExp objects for every keyword for every transaction.
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
 * Pre-compiled keyword for efficient matching
 * Contains the original keyword data plus pre-compiled regex and normalized text
 */
export interface CompiledKeyword {
	category_id: number;
	keyword: string;           // Original keyword
	normalized: string;        // Normalized (lowercase, trimmed)
	regex: RegExp;            // Pre-compiled word boundary regex
	isLongEnough: boolean;    // For substring matching (>= 5 chars)
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
 * Pre-compile keywords for efficient matching
 * Call this once after loading keywords, then reuse for all transactions
 * 
 * @param keywords - Raw keywords from database
 * @returns Array of compiled keywords with pre-built regexes
 */
export function prepareKeywords(keywords: Keyword[]): CompiledKeyword[] {
	return keywords
		.map(k => {
			const normalized = normalizeText(k.keyword);
			if (!normalized) return null;

			return {
				category_id: k.category_id,
				keyword: k.keyword,
				normalized,
				regex: createWordBoundaryRegex(normalized),
				isLongEnough: normalized.length >= 5
			};
		})
		.filter((k): k is CompiledKeyword => k !== null);
}

/**
 * Match a transaction to a category using pre-compiled keywords
 * 
 * Only matches against merchant name (not description).
 * 
 * @param description - Transaction description (unused, kept for API compatibility)
 * @param merchantName - Merchant name (only field used for matching)
 * @param compiledKeywords - Array of pre-compiled keywords from prepareKeywords()
 * @returns Match result or null if no match
 */
export function matchTransactionToCategory(
	description: string,
	merchantName: string,
	compiledKeywords: CompiledKeyword[]
): KeywordMatch | null {
	// Normalize merchant name
	const normalizedMerchant = normalizeText(merchantName);

	// If merchant name is empty, no match possible
	if (!normalizedMerchant) {
		return null;
	}

	// Pass 1: Try exact word boundary matching (highest confidence)
	// Uses pre-compiled regex - no regex compilation overhead
	for (const kw of compiledKeywords) {
		if (kw.regex.test(normalizedMerchant)) {
			return {
				categoryId: kw.category_id,
				matchedKeyword: kw.keyword, // Return original keyword (not normalized)
				matchType: 'merchant'
			};
		}
	}

	// Pass 2: Try substring matching for Dutch compound words
	// Only for keywords with 5+ characters to avoid false positives
	// Example: "salaris" matches "salarisadministratie"
	for (const kw of compiledKeywords) {
		if (kw.isLongEnough && normalizedMerchant.includes(kw.normalized)) {
			return {
				categoryId: kw.category_id,
				matchedKeyword: kw.keyword,
				matchType: 'merchant'
			};
		}
	}

	// No match found
	return null;
}

/**
 * Legacy function for backward compatibility
 * Accepts raw Keyword[] and compiles on the fly (less efficient)
 * 
 * @deprecated Use prepareKeywords() + matchTransactionToCategory() with CompiledKeyword[]
 */
export function matchTransactionToCategoryLegacy(
	description: string,
	merchantName: string,
	keywords: Keyword[]
): KeywordMatch | null {
	const compiled = prepareKeywords(keywords);
	return matchTransactionToCategory(description, merchantName, compiled);
}

