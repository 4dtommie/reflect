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

/**
 * Get paginated transactions for the current user
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	// Check authentication
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	const userId = locals.user.id;

	try {
		// Get pagination parameters from URL
		const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
		const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20')));
		const skip = (page - 1) * pageSize;

		// Get total count
		const totalCount = await (db as any).transactions.count({
			where: { user_id: userId }
		});

		// Fetch transactions
		const transactionsRaw = await (db as any).transactions.findMany({
			where: { user_id: userId },
			take: pageSize,
			orderBy: { date: 'desc' }
		});

		// Serialize to plain objects - convert Decimal to number, Date to string
		const transactions = transactionsRaw.map((t: any) => ({
			id: t.id,
			date: t.date instanceof Date ? t.date.toISOString() : t.date,
			merchantName: t.merchantName,
			iban: t.iban,
			counterparty_iban: t.counterparty_iban,
			is_debit: t.is_debit,
			amount: typeof t.amount === 'object' && t.amount?.toNumber ? t.amount.toNumber() : Number(t.amount),
			type: t.type,
			description: t.description,
			category_id: t.category_id
		}));

		// Calculate monthly statistics from ALL transactions (not just current page)
		const allTransactionsForStats = await (db as any).transactions.findMany({
			where: { user_id: userId },
			select: {
				date: true,
				amount: true,
				is_debit: true
			}
		});

		// Helper function to get week number (Week 1 = days 1-7, Week 2 = days 8-14, etc.)
		function getWeekOfMonth(date: Date): number {
			return Math.ceil(date.getDate() / 7);
		}

		// Group by month and calculate totals (both spending and income)
		const monthSpendingGroups = new Map<string, number>();
		const monthIncomeGroups = new Map<string, number>();
		
		// Group transactions by actual week (year-month-weekNumber) and sum
		const actualWeeks = new Map<string, number>();
		
		for (const transaction of allTransactionsForStats) {
			const d = transaction.date instanceof Date ? transaction.date : new Date(transaction.date);
			const amount = typeof transaction.amount === 'object' && transaction.amount?.toNumber 
				? transaction.amount.toNumber() 
				: Number(transaction.amount);
			const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
			
			// is_debit = true means expense (spending), is_debit = false means income
			if (transaction.is_debit) {
				// Monthly spending totals (debit transactions)
				monthSpendingGroups.set(monthKey, (monthSpendingGroups.get(monthKey) || 0) + amount);
				
				// Weekly totals by actual week (year-month-weekNumber) - only for spending
				const weekNumber = getWeekOfMonth(d);
				const weekKey = `${d.getFullYear()}-${d.getMonth()}-${weekNumber}`;
				actualWeeks.set(weekKey, (actualWeeks.get(weekKey) || 0) + amount);
			} else {
				// Monthly income totals (credit transactions where is_debit = false)
				monthIncomeGroups.set(monthKey, (monthIncomeGroups.get(monthKey) || 0) + amount);
			}
		}
		
		// Now group by week number (1-4) and calculate averages across all months
		const weeklyAveragesByNumber = new Map<number, { total: number; count: number }>();
		for (const [weekKey, total] of actualWeeks.entries()) {
			const parts = weekKey.split('-');
			const weekNum = Number(parts[2]); // weekNumber is the third part
			if (!weeklyAveragesByNumber.has(weekNum)) {
				weeklyAveragesByNumber.set(weekNum, { total: 0, count: 0 });
			}
			const weekData = weeklyAveragesByNumber.get(weekNum)!;
			weekData.total += total;
			weekData.count += 1;
		}

		const weeklyAverages = new Map<number, number>();
		for (const [weekNum, data] of weeklyAveragesByNumber.entries()) {
			weeklyAverages.set(weekNum, data.count > 0 ? data.total / data.count : 0);
		}

		// Combine spending and income by month
		const allMonthKeys = new Set([...monthSpendingGroups.keys(), ...monthIncomeGroups.keys()]);
		const monthlyTotals = Array.from(allMonthKeys).map((key) => {
			const [year, month] = key.split('-').map(Number);
			const spending = monthSpendingGroups.get(key) || 0;
			const income = monthIncomeGroups.get(key) || 0;
			
			return { 
				year, 
				month, 
				total: spending, // Keep 'total' for backward compatibility (spending)
				spending: Number(spending),
				income: Number(income),
				date: new Date(year, month, 1).toISOString() 
			};
		});

		const totalMonthlySpending = monthlyTotals.reduce((sum, m) => sum + m.total, 0);
		const averageMonthlySpending = monthlyTotals.length > 0 ? totalMonthlySpending / monthlyTotals.length : 0;

		return json({
			transactions,
			pagination: {
				page,
				pageSize,
				totalCount: Number(totalCount),
				totalPages: Math.ceil(Number(totalCount) / pageSize),
				hasNextPage: page * pageSize < totalCount,
				hasPreviousPage: page > 1
			},
			stats: {
				monthlyTotals: monthlyTotals.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
				totalMonthlySpending,
				averageMonthlySpending,
				weeklyAverages: Object.fromEntries(weeklyAverages)
			}
		});
	} catch (err: any) {
		console.error('Error fetching transactions:', err);
		throw error(500, 'Failed to fetch transactions');
	}
};

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

