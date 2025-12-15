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
import { cleanMerchantName } from '$lib/server/categorization/merchantNameCleaner';
import { normalizeDescription } from '$lib/server/categorization/descriptionCleaner';
import { autoMergeDuplicates, type MergeResult } from '$lib/server/categorization/merchantMerger';

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
		const pageSize = Math.min(5000, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20')));
		const skip = (page - 1) * pageSize;
		const uncategorizedOnly = url.searchParams.get('uncategorized') === 'true';
		const recentOnly = url.searchParams.get('recent') === 'true';
		const startDate = url.searchParams.get('startDate');
		const search = url.searchParams.get('search');

		// Build where clause
		const whereClause: any = { user_id: userId };
		if (uncategorizedOnly) {
			whereClause.category_id = null;
		}
		if (recentOnly) {
			// Get transactions categorized in the last 5 minutes
			const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
			whereClause.updated_at = { gte: fiveMinutesAgo };
			whereClause.category_id = { not: null };
		}
		if (startDate) {
			whereClause.date = { gte: new Date(startDate) };
		}
		if (search) {
			const amountSearch = parseFloat(search);
			const orConditions: any[] = [
				{ merchantName: { contains: search, mode: 'insensitive' } },
				{ description: { contains: search, mode: 'insensitive' } },
				{ cleaned_merchant_name: { contains: search, mode: 'insensitive' } },
				{ merchants: { name: { contains: search, mode: 'insensitive' } } }
			];

			if (!isNaN(amountSearch)) {
				orConditions.push({ amount: { equals: amountSearch } });
			}

			whereClause.OR = orConditions;
		}

		// Get total count (filtered)
		const filteredTotalCount = await (db as any).transactions.count({
			where: whereClause
		});

		// Fetch transactions with category and merchant relations
		const transactionsRaw = await (db as any).transactions.findMany({
			where: whereClause,
			take: pageSize,
			skip: skip,
			orderBy: recentOnly ? { updated_at: 'desc' } : { date: 'desc' },
			include: {
				categories: {
					select: {
						id: true,
						name: true,
						color: true,
						icon: true,
						parent_id: true,
						category_keywords: {
							select: {
								keyword: true
							}
						}
					}
				},
				merchants: {
					select: {
						id: true,
						name: true,
						is_potential_recurring: true
					}
				},
				recurring_transaction: {
					select: {
						id: true,
						name: true,
						interval: true,
						type: true
					}
				}
			}
		});

		// Serialize to plain objects - convert Decimal to number, Date to string
		const transactions = transactionsRaw.map((t: any) => {
			// If merchant is linked, use merchant.name (cleaned), otherwise clean merchantName as fallback
			const cleanedMerchantName = t.merchants?.name || t.cleaned_merchant_name || cleanMerchantName(t.merchantName, t.description);

			// Use stored normalized_description, or normalize on-the-fly if not stored
			const normalizedDesc = t.normalized_description || normalizeDescription(t.description);

			return {
				id: t.id,
				date: t.date instanceof Date ? t.date.toISOString() : t.date,
				merchantName: t.merchantName, // Raw merchant name (for tooltip)
				cleaned_merchant_name: t.cleaned_merchant_name || cleanedMerchantName,
				merchant_id: t.merchant_id,
				iban: t.iban,
				counterparty_iban: t.counterparty_iban,
				is_debit: t.is_debit,
				amount: typeof t.amount === 'object' && t.amount?.toNumber ? t.amount.toNumber() : Number(t.amount),
				type: t.type,
				description: t.description, // Original description (for tooltip)
				normalized_description: normalizedDesc, // Cleaned description for display
				category_id: t.category_id,
				category: t.categories ? {
					id: t.categories.id,
					name: t.categories.name,
					color: t.categories.color,
					icon: t.categories.icon,
					parent_id: t.categories.parent_id,
					keywords: t.categories.category_keywords?.map((kw: any) => kw.keyword) || []
				} : null,
				merchant: t.merchants ? {
					id: t.merchants.id,
					name: t.merchants.name,
					is_potential_recurring: t.merchants.is_potential_recurring // Cleaned merchant name from merchant record
				} : (cleanedMerchantName ? {
					id: null,
					name: cleanedMerchantName // Fallback: cleaned merchant name if no merchant linked
				} : null),
				recurring_transaction_id: t.recurring_transaction_id,
				recurring_transaction_type: t.recurring_transaction?.type || null,
				recurring_transaction: t.recurring_transaction ? {
					id: t.recurring_transaction.id,
					name: t.recurring_transaction.name,
					interval: t.recurring_transaction.interval
				} : null,
				merchant_is_potential_recurring: t.merchants?.is_potential_recurring
			};
		});

		// Calculate monthly statistics from ALL transactions (not just current page)
		const allTransactionsForStats = await (db as any).transactions.findMany({
			where: { user_id: userId },
			select: {
				date: true,
				amount: true,
				is_debit: true,
				categories: {
					select: {
						name: true
					}
				}
			}
		});

		// Helper function to get week number (Week 1 = days 1-7, Week 2 = days 8-14, etc.)
		function getWeekOfMonth(date: Date): number {
			return Math.ceil(date.getDate() / 7);
		}

		// Group by month and calculate totals (spending, income, and savings)
		const monthSpendingGroups = new Map<string, number>();
		const monthIncomeGroups = new Map<string, number>();
		const monthSavingsGroups = new Map<string, number>();

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
				const categoryName = transaction.categories?.name;

				if (categoryName === 'Sparen & beleggen') {
					// Savings totals
					monthSavingsGroups.set(monthKey, (monthSavingsGroups.get(monthKey) || 0) + amount);
				} else {
					// Monthly spending totals (debit transactions excluding savings)
					monthSpendingGroups.set(monthKey, (monthSpendingGroups.get(monthKey) || 0) + amount);
				}

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

		// Combine spending, income, and savings by month
		const allMonthKeys = new Set([...monthSpendingGroups.keys(), ...monthIncomeGroups.keys(), ...monthSavingsGroups.keys()]);
		const monthlyTotals = Array.from(allMonthKeys).map((key) => {
			const [year, month] = key.split('-').map(Number);
			const spending = monthSpendingGroups.get(key) || 0;
			const income = monthIncomeGroups.get(key) || 0;
			const savings = monthSavingsGroups.get(key) || 0;

			return {
				year,
				month,
				total: spending + savings, // Total outflow (spending + savings)
				spending: Number(spending),
				income: Number(income),
				savings: Number(savings),
				date: new Date(year, month, 1).toISOString()
			};
		});

		const totalMonthlySpending = monthlyTotals.reduce((sum, m) => sum + m.total, 0);
		const averageMonthlySpending = monthlyTotals.length > 0 ? totalMonthlySpending / monthlyTotals.length : 0;

		// Calculate global stats from the already fetched allTransactionsForStats
		// This avoids 3 extra database COUNT queries
		const globalTotalTransactions = allTransactionsForStats.length;
		const globalCategorizedCount = allTransactionsForStats.filter((t: any) =>
			t.categories &&
			!['Uncategorized', 'Niet gecategoriseerd'].includes(t.categories.name)
		).length;
		const globalCategorizedPercentage = globalTotalTransactions > 0
			? (globalCategorizedCount / globalTotalTransactions) * 100
			: 0;

		return json({
			transactions,
			total: Number(filteredTotalCount),
			pagination: {
				page,
				pageSize,
				totalCount: Number(filteredTotalCount),
				totalPages: Math.ceil(Number(filteredTotalCount) / pageSize),
				hasNextPage: page * pageSize < filteredTotalCount,
				hasPreviousPage: page > 1
			},
			stats: {
				monthlyTotals: monthlyTotals.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
				totalMonthlySpending,
				averageMonthlySpending,
				weeklyAverages: Object.fromEntries(weeklyAverages),
				categorizedCount: globalCategorizedCount,
				categorizedPercentage: globalCategorizedPercentage,
				totalTransactions: globalTotalTransactions,
				topUncategorizedMerchants: await (db as any).transactions.groupBy({
					by: ['merchantName'],
					where: {
						user_id: userId,
						OR: [
							{ category_id: null },
							{ categories: { name: { in: ['Uncategorized', 'Niet gecategoriseerd'] } } }
						]
					},
					_count: {
						_all: true
					},
					orderBy: {
						_count: {
							merchantName: 'desc'
						}
					},
					take: 3
				}).then((results: any[]) => results.map(r => ({
					name: r.merchantName,
					count: r._count._all
				})))
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
	// Merchant merge results
	merchantsMerged?: number;
	mergeResults?: MergeResult[];
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

		const { rows, headers, mapping, accountMapping } = validatedRequest;

		// Handle account mapping (create/update bank accounts)
		if (accountMapping && Object.keys(accountMapping).length > 0) {
			console.log(`🏦  Processing ${Object.keys(accountMapping).length} account names...`);
			for (const [iban, name] of Object.entries(accountMapping)) {
				if (iban && name) {
					// Upsert bank account
					await (db as any).bankAccount.upsert({
						where: {
							user_id_iban: {
								user_id: userId,
								iban: iban
							}
						},
						update: {
							name: name
						},
						create: {
							user_id: userId,
							iban: iban,
							name: name,
							is_own_account: true, // Default to true for imported accounts
							type: 'checking' // Default type
						}
					});
				}
			}
		}

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

					// Clean and normalize data for each transaction
					const cleanedBatch = batch.map((t) => {
						// Step 1: Clean merchant name
						const cleanedMerchantName = cleanMerchantName(t.merchantName, t.description);

						// Step 2: Normalize description
						const normalizedDescription = normalizeDescription(t.description);

						return {
							user_id: userId,
							date: t.date,
							merchantName: t.merchantName, // Keep original
							iban: t.iban,
							counterparty_iban: t.counterpartyIban || null,
							is_debit: t.isDebit,
							amount: t.amount,
							type: t.type,
							description: t.description, // Keep original
							category_id: t.categoryId || null,
							// Store cleaned data
							cleaned_merchant_name: cleanedMerchantName || null,
							normalized_description: normalizedDescription || null,
							updated_at: new Date() // Required field
						};
					});

					// Use transactions (plural) - matches runtime Prisma client
					// Field names must match schema exactly (snake_case for some fields)
					await (db as any).transactions.createMany({
						data: cleanedBatch
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

		// Run merchant deduplication after successful import
		let merchantsMerged = 0;
		let mergeResults: MergeResult[] = [];

		if (importedCount > 0 && allErrors.length === 0) {
			try {
				// 1. Link merchants immediately (so we can deduplicate them)
				await ensureMerchantsAndLink(userId);

				// 2. Run deduplication
				const mergeProgress = await autoMergeDuplicates();
				merchantsMerged = mergeProgress.merchantsMerged;
				mergeResults = mergeProgress.mergeResults;
			} catch (err) {
				console.warn('Merchant linking/deduplication failed (non-fatal):', err);
			}
		}

		const result: ImportResult = {
			success: allErrors.length === 0 && importedCount > 0,
			imported: importedCount,
			skipped: 0,
			errors: allErrors,
			duplicates: 0,
			merchantsMerged,
			mergeResults
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

/**
 * Delete all transactions for the current user
 */
export const DELETE: RequestHandler = async ({ locals }) => {
	// Check authentication
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	const userId = locals.user.id;

	try {
		console.log(`🗑️  Deleting all transactions for user ${userId}...`);

		// Delete all transactions for this user
		const result = await (db as any).transactions.deleteMany({
			where: {
				user_id: userId
			}
		});

		console.log(`✅ Deleted ${result.count} transactions for user ${userId}`);

		return json({
			success: true,
			deletedCount: result.count,
			message: `Successfully deleted ${result.count} transactions`
		});
	} catch (err: any) {
		console.error('Error deleting transactions:', err);
		throw error(500, err.message || 'Failed to delete transactions');
	}
};

/**
 * Ensure merchants exist for unlinked transactions and link them
 * Use raw SQL for performance
 */
async function ensureMerchantsAndLink(userId: number) {
	console.log(`🔗 Linking merchants for user ${userId}...`);

	// 1. Create merchants from cleaned names (if they match no existing merchant)
	// We use ON CONFLICT DO NOTHING to avoid duplicates
	await db.$executeRaw`
		INSERT INTO merchants (name, is_active, updated_at, keywords, ibans)
		SELECT DISTINCT cleaned_merchant_name, true, NOW(), '{}'::text[], '{}'::text[]
		FROM transactions 
		WHERE user_id = ${userId}
		  AND merchant_id IS NULL 
		  AND cleaned_merchant_name IS NOT NULL 
		  AND cleaned_merchant_name != ''
		ON CONFLICT (name) DO UPDATE SET is_active = true, updated_at = NOW()
	`;

	// 2. Link transactions to merchants matching the name (case-insensitive)
	const linked = await db.$executeRaw`
		UPDATE transactions t
		SET merchant_id = m.id
		FROM merchants m
		WHERE t.user_id = ${userId}
		  AND t.merchant_id IS NULL
		  AND t.cleaned_merchant_name IS NOT NULL
		  AND lower(t.cleaned_merchant_name) = lower(m.name)
	`;

	console.log(`   Linked ${linked} transactions to merchants.`);
}

