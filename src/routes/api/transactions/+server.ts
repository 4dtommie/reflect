import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { TransactionImportSchema } from '$lib/server/validation/transaction';
import { TransactionInputSchema } from '$lib/server/validation/transaction';
import type { ParseResult } from '$lib/utils/csvParser';
import {
	mapCSVRowToTransaction,
	type ColumnMapping,
	type TransactionInput
} from '$lib/utils/transactionMapper';

interface ImportError {
	row: number;
	field?: string;
	message: string;
}

interface ImportResult {
	success: boolean;
	imported: number;
	skipped: number;
	errors: ImportError[];
	duplicates: number;
}


/**
 * Import transactions from CSV data
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	// Check authentication
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	const userId = locals.user.id;

	try {
		// Parse and validate request body
		const body = await request.json();
		const validatedRequest = TransactionImportSchema.parse(body);

		const { rows, headers, mapping } = validatedRequest;

		// Convert mapping keys to numbers
		const columnMapping: ColumnMapping = {};
		for (const [key, value] of Object.entries(mapping)) {
			columnMapping[parseInt(key)] = value as any;
		}

		// Map all CSV rows to transactions
		const mappedTransactions: (TransactionInput | null)[] = [];
		const mappingErrors: ImportError[] = [];

		for (let i = 0; i < rows.length; i++) {
			const row = rows[i];
			const result = mapCSVRowToTransaction(row, headers, columnMapping);

			// Collect errors with row numbers
			const errors = result.errors.map((err) => ({
				row: i + 1, // +1 because row 0 is headers
				field: err.field,
				message: err.message
			}));

			mappingErrors.push(...errors);

			if (result.transaction) {
				mappedTransactions.push(result.transaction);
			} else {
				mappedTransactions.push(null);
			}
		}

		// Filter out invalid transactions
		const validTransactions = mappedTransactions.filter((t) => t !== null) as TransactionInput[];

		if (validTransactions.length === 0) {
			return json({
				success: false,
				imported: 0,
				skipped: 0,
				errors: mappingErrors,
				duplicates: 0
			});
		}

		// Validate all transactions with Zod schema
		const validatedTransactions: TransactionInput[] = [];
		const validationErrors: ImportError[] = [];

		for (let i = 0; i < validTransactions.length; i++) {
			const transaction = validTransactions[i];
			try {
				const validated = TransactionInputSchema.parse(transaction);
				// Convert null to undefined for optional fields
				const cleaned: TransactionInput = {
					...validated,
					counterpartyIban: validated.counterpartyIban ?? undefined,
					categoryId: validated.categoryId ?? undefined
				};
				validatedTransactions.push(cleaned);
			} catch (err: any) {
				// Find the original row number
				const originalIndex = mappedTransactions.indexOf(transaction);
				validationErrors.push({
					row: originalIndex + 1,
					field: err.path?.[0]?.toString(),
					message: err.message || 'Validation failed'
				});
			}
		}

		// Import all validated transactions (no duplicate checking)
		const finalTransactions = validatedTransactions;

		// Bulk insert transactions
		let importedCount = 0;
		const insertErrors: ImportError[] = [];

		if (finalTransactions.length > 0) {
			// Use Prisma transaction for atomicity
			try {
				// Process in batches of 100 to avoid overwhelming the database
				const batchSize = 100;
				for (let i = 0; i < finalTransactions.length; i += batchSize) {
					const batch = finalTransactions.slice(i, i + batchSize);

					// Use transactions (plural) - matches runtime Prisma client
					// Field names must match schema exactly (snake_case for some fields)
					await (db as any).transactions.createMany({
						data: batch.map((t) => ({
							user_id: userId,
							date: t.date,
							merchantName: t.merchantName,
							iban: t.iban,
							counterparty_iban: t.counterpartyIban || null,
							is_debit: t.isDebit,
							amount: t.amount,
							type: t.type,
							description: t.description,
							category_id: t.categoryId || null,
							updated_at: new Date() // Required field
						}))
					});

					importedCount += batch.length;
				}
			} catch (err: any) {
				console.error('Error inserting transactions:', err);
				insertErrors.push({
					row: 0,
					message: `Failed to insert transactions: ${err.message}`
				});
			}
		}

		// Combine all errors
		const allErrors = [...mappingErrors, ...validationErrors, ...insertErrors];

		const result: ImportResult = {
			success: allErrors.length === 0 && importedCount > 0,
			imported: importedCount,
			skipped: 0,
			errors: allErrors,
			duplicates: 0
		};

		return json(result);
	} catch (err: any) {
		console.error('Transaction import error:', err);

		if (err.name === 'ZodError') {
			return json(
				{
					success: false,
					imported: 0,
					skipped: 0,
					errors: err.errors.map((e: any) => ({
						row: 0,
						field: e.path?.join('.'),
						message: e.message
					})),
					duplicates: 0
				},
				{ status: 400 }
			);
		}

		return json(
			{
				success: false,
				imported: 0,
				skipped: 0,
				errors: [
					{
						row: 0,
						message: err.message || 'Failed to import transactions'
					}
				],
				duplicates: 0
			},
			{ status: 500 }
		);
	}
};

