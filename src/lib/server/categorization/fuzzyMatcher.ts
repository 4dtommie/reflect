/**
 * Fuzzy Matching Service
 * 
 * Uses Levenshtein distance to match merchant names to known merchants.
 * Optimized with pre-filtering and caching for performance.
 */

import { db } from '$lib/server/db';

export interface FuzzyMatchResult {
	merchant: string;
	distance: number;
	similarity: number;
}

export interface FuzzyMatchingOptions {
	maxDistance?: number; // Default: 2
	minSimilarity?: number; // Default: 0.85
	preFilter?: boolean; // Default: true
}

// Cache for fuzzy match results (in-memory, per request)
const fuzzyMatchCache = new Map<string, FuzzyMatchResult | null>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
	const len1 = str1.length;
	const len2 = str2.length;

	// Create matrix
	const matrix: number[][] = [];

	// Initialize first row and column
	for (let i = 0; i <= len1; i++) {
		matrix[i] = [i];
	}
	for (let j = 0; j <= len2; j++) {
		matrix[0][j] = j;
	}

	// Fill matrix
	for (let i = 1; i <= len1; i++) {
		for (let j = 1; j <= len2; j++) {
			const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
			matrix[i][j] = Math.min(
				matrix[i - 1][j] + 1, // deletion
				matrix[i][j - 1] + 1, // insertion
				matrix[i - 1][j - 1] + cost // substitution
			);
		}
	}

	return matrix[len1][len2];
}

/**
 * Find the closest merchant match using fuzzy matching
 */
export function findClosestMerchant(
	merchantName: string,
	knownMerchants: string[],
	options: FuzzyMatchingOptions = {}
): FuzzyMatchResult | null {
	const {
		maxDistance = 2,
		minSimilarity = 0.85,
		preFilter = true
	} = options;

	const normalized = merchantName.trim().toLowerCase();

	// Check cache first
	const cacheKey = `${normalized}:${maxDistance}:${minSimilarity}`;
	const cached = fuzzyMatchCache.get(cacheKey);
	if (cached !== undefined) {
		return cached;
	}

	// Step 1: Pre-filtering (if enabled)
	let candidates = knownMerchants;
	if (preFilter && normalized.length > 0) {
		const firstLetter = normalized[0];
		const length = normalized.length;

		candidates = knownMerchants.filter((m) => {
			const mNormalized = m.trim().toLowerCase();
			// Same first letter
			if (mNormalized[0] !== firstLetter) return false;
			// Similar length (within 50% difference)
			const lengthDiff = Math.abs(mNormalized.length - length);
			const maxLength = Math.max(mNormalized.length, length);
			if (maxLength > 0 && lengthDiff / maxLength > 0.5) return false;
			return true;
		});
	}

	// Step 2: Early exit - check for exact match
	const exactMatch = candidates.find((m) => m.trim().toLowerCase() === normalized);
	if (exactMatch) {
		const result: FuzzyMatchResult = {
			merchant: exactMatch,
			distance: 0,
			similarity: 1.0
		};
		fuzzyMatchCache.set(cacheKey, result);
		return result;
	}

	// Step 3: Calculate Levenshtein distance to all candidates
	let bestMatch: FuzzyMatchResult | null = null;

	for (const candidate of candidates) {
		const candidateNormalized = candidate.trim().toLowerCase();
		const distance = levenshteinDistance(normalized, candidateNormalized);

		// Skip if distance too large
		if (distance > maxDistance) continue;

		// Calculate similarity
		const maxLength = Math.max(normalized.length, candidateNormalized.length);
		const similarity = maxLength > 0 ? 1 - distance / maxLength : 0;

		// Update best match if better
		if (!bestMatch || similarity > bestMatch.similarity) {
			bestMatch = {
				merchant: candidate,
				distance,
				similarity
			};
		}

		// Early exit if perfect match found
		if (distance === 0) break;
	}

	// Step 4: Return best match if similarity threshold met
	const result = bestMatch && bestMatch.similarity >= minSimilarity ? bestMatch : null;
	fuzzyMatchCache.set(cacheKey, result);
	return result;
}

/**
 * Load all active merchant names from database
 */
export async function loadAllMerchantNames(): Promise<string[]> {
	const merchants = await (db as any).merchants.findMany({
		where: {
			is_active: true
		},
		select: {
			name: true
		}
	});

	return merchants.map((m: { name: string }) => m.name);
}

/**
 * Normalize merchant name using fuzzy matching
 */
export async function normalizeMerchantNameWithFuzzy(
	merchantName: string,
	knownMerchants?: string[]
): Promise<string> {
	if (!merchantName || merchantName.trim().length === 0) {
		return merchantName;
	}

	// Load merchants if not provided
	const merchants = knownMerchants || (await loadAllMerchantNames());

	// Try fuzzy matching
	const match = findClosestMerchant(merchantName, merchants);

	if (match) {
		return match.merchant;
	}

	// Return original if no match found
	return merchantName;
}

/**
 * Clear the fuzzy match cache (useful for testing or when merchants change)
 */
export function clearFuzzyMatchCache(): void {
	fuzzyMatchCache.clear();
}

