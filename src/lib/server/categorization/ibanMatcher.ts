/**
 * IBAN Matching Engine
 * 
 * Matches transactions to merchants using counterparty IBAN.
 * IBANs are normalized (uppercase, no spaces) for matching.
 */

export interface IBANMatch {
	merchantId: number;
	merchantName: string;
	defaultCategoryId: number | null;
	matchedIBAN: string;
}

export interface MerchantWithIBANs {
	id: number;
	name: string;
	ibans: string[];
	default_category_id: number | null;
}

/**
 * Normalize IBAN for matching (uppercase, remove spaces)
 */
export function normalizeIBAN(iban: string | null | undefined): string | null {
	if (!iban || typeof iban !== 'string') {
		return null;
	}
	
	// Remove spaces and convert to uppercase
	return iban.trim().replace(/\s/g, '').toUpperCase();
}

/**
 * Match a transaction's counterparty IBAN to a merchant
 * 
 * @param counterpartyIban - Transaction counterparty IBAN
 * @param merchants - Array of merchants with their IBANs
 * @returns Match result or null if no match
 */
export function matchTransactionByIBAN(
	counterpartyIban: string | null | undefined,
	merchants: MerchantWithIBANs[]
): IBANMatch | null {
	const normalizedIban = normalizeIBAN(counterpartyIban);
	
	if (!normalizedIban) {
		return null;
	}
	
	// Try each merchant's IBANs
	for (const merchant of merchants) {
		if (!merchant.ibans || merchant.ibans.length === 0) {
			continue;
		}
		
		// Check if any of the merchant's IBANs match
		for (const merchantIban of merchant.ibans) {
			const normalizedMerchantIban = normalizeIBAN(merchantIban);
			if (normalizedMerchantIban === normalizedIban) {
				return {
					merchantId: merchant.id,
					merchantName: merchant.name,
					defaultCategoryId: merchant.default_category_id,
					matchedIBAN: merchantIban // Return original IBAN (not normalized)
				};
			}
		}
	}
	
	// No match found
	return null;
}

