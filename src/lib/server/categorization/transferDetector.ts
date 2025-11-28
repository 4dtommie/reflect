/**
 * Transfer Detection Service
 * 
 * Detects if a transaction is a transfer between persons (not a merchant transaction).
 * These transactions should typically not create merchant records.
 */

import { normalizeIBAN } from './ibanMatcher';

export interface TransferDetectionResult {
	isTransfer: boolean;
	reason?: string; // Why it was detected as a transfer
}

/**
 * Check if a transaction is a transfer between persons
 * 
 * @param transaction - Transaction to check
 * @param ownIbans - Optional list of user's own IBANs (to detect transfers between own accounts)
 * @returns Detection result
 */
export function isTransferBetweenPersons(
	transaction: {
		type: string;
		merchantName: string;
		counterparty_iban?: string | null;
	},
	ownIbans?: string[]
): TransferDetectionResult {
	// 1. Check transaction type
	if (transaction.type === 'Transfer') {
		return {
			isTransfer: true,
			reason: 'transaction_type'
		};
	}

	// 2. Check merchant name patterns (common transfer indicators)
	const transferPatterns = [
		/^OVERBOEKING/i,
		/^TRANSFER/i,
		/^BETALING AAN/i,
		/^BETALING NAAR/i,
		/^PAYMENT TO/i,
		/^SEPA/i,
		/^GIRO/i,
		/^TUSSENREKENING/i,
		/^EIGEN REKENING/i,
		/^OWN ACCOUNT/i
	];

	if (transferPatterns.some(pattern => pattern.test(transaction.merchantName))) {
		return {
			isTransfer: true,
			reason: 'merchant_name_pattern'
		};
	}

	// 3. Check if counterparty IBAN is own account
	if (transaction.counterparty_iban && ownIbans && ownIbans.length > 0) {
		const normalized = normalizeIBAN(transaction.counterparty_iban);
		if (normalized) {
			const isOwnAccount = ownIbans.some(own => normalizeIBAN(own) === normalized);
			if (isOwnAccount) {
				return {
					isTransfer: true,
					reason: 'own_account'
				};
			}
		}
	}

	// 4. Check if name looks like a person (simple heuristic)
	// Pattern: "Jan Jansen" or "J. Jansen" - typically 2-3 words, no business indicators
	const namePattern = /^[A-Z][a-z]+(\s+[A-Z][a-z]*\.?)?\s+[A-Z][a-z]+$/;
	const businessIndicators = /\b(BV|NV|B\.V\.|N\.V\.|LTD|LLC|INC|CORP|GMBH|AG|BANK|BANKING|BEDRIJF|COMPANY|STORE|WINKEL|SHOP|RESTAURANT|CAFE|HOTEL)\b/i;
	
	if (namePattern.test(transaction.merchantName) && 
	    !businessIndicators.test(transaction.merchantName)) {
		return {
			isTransfer: true,
			reason: 'person_name_pattern'
		};
	}

	// Not detected as a transfer
	return {
		isTransfer: false
	};
}

