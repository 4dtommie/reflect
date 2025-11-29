import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { cleanMerchantName } from '$lib/server/categorization/merchantNameCleaner';
import { normalizeDescription } from '$lib/server/categorization/descriptionCleaner';
import type { TransactionInput } from '$lib/utils/transactionMapper';

interface PreviewTransaction extends TransactionInput {
	cleaned_merchant_name: string;
	normalized_description: string;
}

/**
 * Preview transactions with cleaned data
 * Takes mapped transactions and returns them with cleaned merchant names, normalized descriptions, and amount categories
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	// Check authentication
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	try {
		const body = await request.json();
		const { transactions } = body;

		if (!Array.isArray(transactions)) {
			throw error(400, 'Invalid request: transactions must be an array');
		}

		// Clean and normalize each transaction
		const previewTransactions: PreviewTransaction[] = transactions
			.filter((t): t is TransactionInput => t !== null)
			.map((transaction) => {
				// Parse date if it's a string
				const date = typeof transaction.date === 'string' 
					? new Date(transaction.date) 
					: transaction.date;

				// Step 1: Clean merchant name
				const cleanedMerchantName = cleanMerchantName(transaction.merchantName, transaction.description);
				
				// Step 2: Normalize description
				const normalizedDescription = normalizeDescription(transaction.description);

				return {
					...transaction,
					date,
					cleaned_merchant_name: cleanedMerchantName || transaction.merchantName,
					normalized_description: normalizedDescription || transaction.description
				};
			});

		return json({ transactions: previewTransactions });
	} catch (err: any) {
		console.error('Transaction preview error:', err);
		
		if (err.status) {
			throw err;
		}

		throw error(500, err.message || 'Failed to preview transactions');
	}
};

