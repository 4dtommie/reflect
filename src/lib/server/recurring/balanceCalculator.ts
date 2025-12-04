import { db } from '$lib/server/db';
import { recurringService, type SerializedSubscription } from './recurringService';

// Types for balance data
export interface BalanceData {
	monthlyIncome: number;
	monthlyExpenses: number;
	recurringExpenses: number;
	variableExpenses: number;
	monthlySavings: number;
}

export interface MonthlySpendingData {
	month: string;
	recurring: number;
	variable: number;
	remaining: number;
	savings: number;
	income: number;
}

export interface FullBalanceData extends BalanceData {
	monthlySpending: MonthlySpendingData[];
}

/**
 * Get variable spending stats from saved patterns
 */
async function getVariableSpendingStats(userId: number): Promise<{
	totalMonthlyAverage: number;
	categoryIds: number[];
}> {
	const patterns = await db.variableSpendingPattern.findMany({
		where: {
			user_id: userId,
			status: 'active'
		},
		select: {
			monthly_average: true,
			category_id: true
		}
	});

	const totalMonthlyAverage = patterns.reduce((sum, p) => sum + Number(p.monthly_average), 0);
	const categoryIds = patterns.map((p) => p.category_id);

	return { totalMonthlyAverage, categoryIds };
}

/**
 * Get savings category ID
 */
async function getSavingsCategoryId(): Promise<number | null> {
	const savingsCategory = await db.categories.findFirst({
		where: {
			OR: [
				{ name: 'Savings & Investments' },
				{ name: 'Sparen & beleggen' },
				{ name: { contains: 'Savings', mode: 'insensitive' } },
				{ name: { contains: 'Sparen', mode: 'insensitive' } }
			],
			group: 'financial'
		},
		select: {
			id: true
		}
	});

	return savingsCategory?.id || null;
}

/**
 * Calculate balance data for NetBalanceWidget
 * This is the lightweight version for dashboard use
 */
export async function calculateBalanceData(userId: number): Promise<BalanceData> {
	// Get recurring data
	const recurringData = await recurringService.getRecurringData(userId);

	// Calculate income from subscriptions
	const monthlyIncome = recurringService.calculateMonthlyIncome(recurringData.subscriptions);

	// Get variable spending stats
	const variableStats = await getVariableSpendingStats(userId);

	// Calculate savings average from transactions
	const monthlySavings = await calculateMonthlySavingsAverage(userId);

	return {
		monthlyIncome,
		monthlyExpenses: recurringData.stats.monthlyTotal + variableStats.totalMonthlyAverage,
		recurringExpenses: recurringData.stats.monthlyTotal,
		variableExpenses: variableStats.totalMonthlyAverage,
		monthlySavings
	};
}

/**
 * Calculate monthly savings average from transactions in savings category
 */
async function calculateMonthlySavingsAverage(userId: number): Promise<number> {
	const now = new Date();
	const twelveMonthsAgo = new Date(now);
	twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

	const savingsCategoryId = await getSavingsCategoryId();

	if (!savingsCategoryId) {
		return 0;
	}

	// Get savings transactions
	const savingsTransactions = await db.transactions.findMany({
		where: {
			user_id: userId,
			category_id: savingsCategoryId,
			is_debit: true,
			date: {
				gte: twelveMonthsAgo
			}
		},
		select: {
			amount: true,
			date: true
		}
	});

	if (savingsTransactions.length === 0) {
		return 0;
	}

	// Group by month and calculate average
	const monthMap = new Map<string, number>();
	for (const tx of savingsTransactions) {
		const date = new Date(tx.date);
		const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
		const current = monthMap.get(monthKey) || 0;
		monthMap.set(monthKey, current + Math.abs(Number(tx.amount)));
	}

	const totalSavings = Array.from(monthMap.values()).reduce((sum, amount) => sum + amount, 0);
	return totalSavings / Math.max(1, monthMap.size);
}

/**
 * Calculate full balance data including monthly spending breakdown
 * This is the full version for the recurring page
 */
export async function calculateFullBalanceData(
	userId: number,
	variablePatternCategoryIds: number[] = []
): Promise<FullBalanceData> {
	const now = new Date();
	const twelveMonthsAgo = new Date(now);
	twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

	// Get basic balance data
	const balanceData = await calculateBalanceData(userId);

	// Get additional category IDs for variable spending
	const variableCategories = await db.categories.findMany({
		where: {
			is_variable_spending: true
		},
		select: {
			id: true
		}
	});
	const variableCategoryIds = new Set([
		...variableCategories.map((c) => c.id),
		...variablePatternCategoryIds
	]);

	// Get savings category ID
	const savingsCategoryId = await getSavingsCategoryId();

	// Get all debit transactions from last 12 months
	const transactions = await db.transactions.findMany({
		where: {
			user_id: userId,
			is_debit: true,
			date: {
				gte: twelveMonthsAgo
			}
		},
		include: {
			categories: true,
			recurring_transaction: true
		}
	});

	// Get all credit transactions from last 12 months
	const incomeTransactions = await db.transactions.findMany({
		where: {
			user_id: userId,
			is_debit: false,
			date: {
				gte: twelveMonthsAgo
			}
		}
	});

	// Group expenses by month and type
	const monthMap = new Map<
		string,
		{ recurring: number; variable: number; remaining: number; savings: number; income: number }
	>();

	// Process expense transactions
	for (const tx of transactions) {
		const date = new Date(tx.date);
		const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
		const current = monthMap.get(monthKey) || {
			recurring: 0,
			variable: 0,
			remaining: 0,
			savings: 0,
			income: 0
		};
		const amount = Math.abs(Number(tx.amount));

		// Check if this is a savings transaction first (highest priority)
		if (savingsCategoryId && tx.category_id === savingsCategoryId) {
			current.savings += amount;
		}
		// Recurring: transactions linked to a recurring transaction
		else if (tx.recurring_transaction_id || tx.recurring_transaction) {
			current.recurring += amount;
		}
		// Variable: transactions in variable spending categories
		else if (tx.category_id && variableCategoryIds.has(tx.category_id)) {
			current.variable += amount;
		}
		// Remaining: everything else
		else {
			current.remaining += amount;
		}

		monthMap.set(monthKey, current);
	}

	// Process income transactions
	for (const tx of incomeTransactions) {
		const date = new Date(tx.date);
		const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
		const current = monthMap.get(monthKey) || {
			recurring: 0,
			variable: 0,
			remaining: 0,
			savings: 0,
			income: 0
		};
		const amount = Math.abs(Number(tx.amount));

		current.income += amount;
		monthMap.set(monthKey, current);
	}

	// Convert to array and sort
	const monthlySpending = Array.from(monthMap.entries())
		.map(([month, data]) => ({
			month,
			recurring: data.recurring,
			variable: data.variable,
			remaining: data.remaining,
			savings: data.savings,
			income: data.income
		}))
		.sort((a, b) => a.month.localeCompare(b.month));

	return {
		...balanceData,
		monthlySpending
	};
}


