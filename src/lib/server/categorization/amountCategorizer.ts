/**
 * Amount Categorization Service
 * 
 * Categorizes transaction amounts into size buckets for embedding generation.
 * Helps distinguish similar merchants based on transaction size context.
 */

export type AmountCategory = 'tiny' | 'small' | 'medium' | 'large' | 'huge';

export interface AmountCategorizationOptions {
	considerType?: boolean; // Consider transaction type context
	considerRefund?: boolean; // Handle refunds specially
}

/**
 * Categorize an amount into a size bucket
 * 
 * @param amount - Transaction amount (absolute value)
 * @param type - Transaction type
 * @param isDebit - Whether this is a debit (expense) transaction
 * @param options - Optional categorization options
 */
export function categorizeAmount(
	amount: number,
	type: string,
	isDebit: boolean,
	options: AmountCategorizationOptions = {}
): AmountCategory {
	const absAmount = Math.abs(amount);

	// Handle refunds specially (use original amount category if known, otherwise treat as expense)
	if (options.considerRefund && type === 'Refund') {
		// Refunds should use expense category logic
		return categorizeAmount(absAmount, 'Payment', true, { ...options, considerRefund: false });
	}

	// Handle fees (usually tiny/small)
	if (type === 'Fee') {
		if (absAmount < 5) return 'tiny';
		if (absAmount < 25) return 'small';
		return 'medium'; // Large fees are rare
	}

	// Handle interest (usually small/medium)
	if (type === 'Interest') {
		if (absAmount < 25) return 'small';
		if (absAmount < 100) return 'medium';
		return 'large';
	}

	// Standard categorization based on amount
	if (absAmount < 5) {
		return 'tiny'; // Small purchases, fees
	} else if (absAmount < 25) {
		return 'small'; // Coffee, snacks, small items
	} else if (absAmount < 100) {
		return 'medium'; // Groceries, meals, moderate purchases
	} else if (absAmount < 500) {
		return 'large'; // Shopping, bills, larger purchases
	} else {
		return 'huge'; // Major purchases, rent, large bills
	}
}

