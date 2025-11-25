/**
 * Merchant Name Cleaning Service
 * 
 * Cleans raw merchant names from bank transactions using pattern-based rules.
 * Removes transaction IDs, dates, location codes, and normalizes formatting.
 */

/**
 * Clean a merchant name by removing common patterns and normalizing
 */
export function cleanMerchantName(rawName: string, description?: string): string {
	if (!rawName || typeof rawName !== 'string') {
		return '';
	}

	// Check if merchant name is "Notprovided" or similar
	// Leave these for AI to handle - don't try to extract from description
	const trimmedName = rawName.trim();
	const notProvidedPattern = /^(notprovided|not\s+provided|niet\s+opgegeven|onbekend|unknown|n\/a|na|geen|none|leeg|empty)\s*$/i;
	if (notProvidedPattern.test(trimmedName) || trimmedName.length === 0) {
		// Return empty string - let AI handle this later
		return '';
	}

	let cleaned = rawName.trim();

	// Remove transaction IDs and long numbers (likely transaction references)
	// Pattern: TRX123456, TXN789, or standalone 10+ digit numbers
	cleaned = cleaned.replace(/\b(TRX|TXN|REF|ID)[\s\-]?\d+\b/gi, '');
	cleaned = cleaned.replace(/\b\d{10,}\b/g, ''); // Long numbers (10+ digits)

	// Remove dates (various formats)
	// Pattern: 2024-01-15, 15/01/2024, 15-01-24, etc.
	cleaned = cleaned.replace(/\b\d{4}-\d{2}-\d{2}\b/g, ''); // YYYY-MM-DD
	cleaned = cleaned.replace(/\b\d{2}[\/\-]\d{2}[\/\-]\d{2,4}\b/g, ''); // DD/MM/YYYY or DD-MM-YY

	// Remove store numbers followed by city names
	// Pattern: "Albert Heijn 1595 Sgravenhage" → "Albert Heijn"
	// This matches: merchant name, then number, then city
	cleaned = cleaned.replace(/\s+\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s*$/i, '');

	// Remove location codes and common location names
	// Pattern: NL123, AMSTERDAM, ROTTERDAM, etc.
	const locationPatterns = [
		/\bNL\d+\b/gi, // Dutch postal codes
		/\b\d{4}\s?[A-Z]{2}\b/gi, // Dutch postal codes (1234 AB)
		/\b(AMSTERDAM|ROTTERDAM|UTRECHT|DEN HAAG|THE HAGUE|HAARLEM|EINDHOVEN|GRONINGEN|TILBURG|ALMERE|BREDA|NIJMEGEN|ENSCHEDE|HAARLEMMERMEER|SGRAVENHAGE|'S-GRAVENHAGE|DEN HAAG)\b/gi
	];
	for (const pattern of locationPatterns) {
		cleaned = cleaned.replace(pattern, '');
	}

	// Remove standalone numbers at the end (store numbers)
	// Pattern: "Albert Heijn 1595" → "Albert Heijn"
	cleaned = cleaned.replace(/\s+\d+\s*$/, '');

	// Remove store numbers and location identifiers
	// Pattern: #123, STORE 456, LOC 789
	cleaned = cleaned.replace(/#\d+\b/gi, '');
	cleaned = cleaned.replace(/\b(STORE|LOC|LOCATION|WINKEL|FILIAAL)[\s\-]?\d+\b/gi, '');

	// Remove common business suffixes (but keep if it's part of the name)
	// Only remove if at the end: BV, NV, B.V., N.V., LTD, LLC, etc.
	cleaned = cleaned.replace(/\s+(BV|NV|B\.V\.|N\.V\.|LTD|LLC|INC|CORP|GMBH|AG)\s*$/i, '');

	// Remove extra whitespace and normalize
	cleaned = cleaned.replace(/\s+/g, ' '); // Multiple spaces to single space
	cleaned = cleaned.replace(/^\s+|\s+$/g, ''); // Trim

	// Normalize capitalization (Title Case with proper name handling)
	cleaned = toTitleCaseWithNames(cleaned);

	// Remove leading/trailing dashes and clean up
	cleaned = cleaned.replace(/^[\s\-]+|[\s\-]+$/g, '');
	cleaned = cleaned.trim();

	return cleaned || rawName; // Fallback to original if cleaning results in empty string
}

/**
 * Convert string to Title Case with proper name handling
 * Handles special cases like "AH", "ING", "McDonald's", "van den Berg", etc.
 */
function toTitleCaseWithNames(str: string): string {
	if (!str) return '';

	// Common abbreviations that should stay uppercase
	const abbreviations = ['AH', 'ING', 'ASN', 'SNS', 'RABO', 'ABN', 'AMRO', 'NS', 'OV', 'TNT', 'UPS', 'DHL', 'IBM', 'HP', 'BMW', 'VW', 'KLM', 'TUI', 'T.M.C.', 'TMC'];

	// Dutch/German prepositions and articles that should be lowercase (unless at start)
	const lowercaseWords = ['van', 'den', 'der', 'de', 'het', 'een', 'te', 'ten', 'ter', 'op', 'aan', 'in', 'uit', 'voor', 'bij', 'over', 'onder', 'tussen', 'door', 'met', 'zonder', 'tot', 'naar', 'vanaf', 'tot', 'von', 'zu', 'zum', 'zur', 'und', 'der', 'die', 'das'];

	// Split by spaces and process each word
	const words = str.split(/\s+/);
	return words
		.map((word, index) => {
			// Skip empty words
			if (!word) return '';

			const originalWord = word;
			const upperWord = word.toUpperCase();
			const lowerWord = word.toLowerCase();

			// Handle initials with dots first (T.m.c. → T.M.C., t.m.c. → T.M.C.)
			// Pattern: one or more single letters followed by dots
			if (word.match(/^[a-z]\.([a-z]\.)*$/i)) {
				const parts = word.split('.').filter(part => part.length > 0);
				if (parts.every(part => part.length === 1)) {
					// All parts are single letters - convert to uppercase
					return parts.map(part => part.toUpperCase()).join('.') + (word.endsWith('.') ? '.' : '');
				}
			}

			// Check if it's an abbreviation (all caps, 2-4 letters, or contains dots like T.M.C.)
			if (abbreviations.includes(upperWord) || 
			    (word.includes('.') && word.split('.').filter(p => p).every(part => part.length <= 2 && part.length > 0)) ||
			    (word.length <= 4 && word === upperWord && word.length >= 2 && !word.includes('.'))) {
				return upperWord;
			}

			// Handle prepositions/articles (lowercase unless at start)
			if (index > 0 && lowercaseWords.includes(lowerWord)) {
				return lowerWord;
			}

			// Handle special cases
			// McDonald's, O'Brien, etc.
			if (word.includes("'")) {
				return word
					.split("'")
					.map((part, i) => {
						if (i === 0) {
							return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
						}
						return part.toLowerCase();
					})
					.join("'");
			}

			// Handle hyphens (e.g., "To-Go", "Co-op")
			if (word.includes('-')) {
				return word
					.split('-')
					.map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
					.join('-');
			}

			// Standard title case
			return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
		})
		.join(' ');
}

/**
 * Find or create a merchant record
 * Returns the merchant ID
 */
export async function findOrCreateMerchant(
	db: any,
	cleanedName: string,
	categoryId?: number | null
): Promise<number> {
	if (!cleanedName || cleanedName.trim().length === 0) {
		throw new Error('Merchant name cannot be empty');
	}

	// Try to find existing merchant by name (case-insensitive)
	const existing = await db.merchants.findFirst({
		where: {
			name: {
				equals: cleanedName,
				mode: 'insensitive'
			}
		}
	});

	if (existing) {
		// Update default category if provided and different
		if (categoryId && existing.default_category_id !== categoryId) {
			await db.merchants.update({
				where: { id: existing.id },
				data: {
					default_category_id: categoryId,
					updated_at: new Date()
				}
			});
		}
		return existing.id;
	}

	// Create new merchant
	const newMerchant = await db.merchants.create({
		data: {
			name: cleanedName,
			keywords: [],
			ibans: [],
			default_category_id: categoryId || null,
			is_active: true,
			updated_at: new Date()
		}
	});

	return newMerchant.id;
}

