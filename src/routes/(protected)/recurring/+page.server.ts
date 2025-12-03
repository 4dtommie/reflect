import type { PageServerLoad } from './$types';
import { recurringService } from '$lib/server/recurring/recurringService';
import { calculateFullBalanceData } from '$lib/server/recurring/balanceCalculator';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		return {
			subscriptions: [],
			stats: null,
			categories: [],
			categoryBreakdown: [],
			variableSpending: [],
			variableStats: null,
			monthlySpending: [],
			monthlySavingsAverage: 0
		};
	}

	const userId = locals.user.id;

	// Fetch recurring data using the service layer
	const recurringData = await recurringService.getRecurringData(userId);

	// Fetch variable spending patterns from database
	const savedPatterns = await db.variableSpendingPattern.findMany({
		where: {
			user_id: userId,
			status: 'active'
		},
		include: {
			categories: true
		},
		orderBy: {
			monthly_average: 'desc'
		}
	});

	// Calculate variable spending stats
	const totalMonthlyAverage = savedPatterns.reduce((sum, p) => sum + Number(p.monthly_average), 0);
	const totalVisitsPerMonth = savedPatterns.reduce((sum, p) => sum + Number(p.visits_per_month), 0);
	const totalTransactions = savedPatterns.reduce((sum, p) => sum + p.total_transactions, 0);

	// Serialize patterns for response
	const variableSpending = savedPatterns.map((p) => ({
		id: p.id,
		categoryName: p.category_name,
		categoryId: p.category_id,
		categoryColor: p.categories?.color,
		categoryIcon: p.categories?.icon,
		monthlyAverage: Number(p.monthly_average),
		visitsPerMonth: Number(p.visits_per_month),
		averagePerVisit: Number(p.average_per_visit),
		totalSpent: Number(p.total_spent),
		totalTransactions: p.total_transactions,
		uniqueMerchants: p.unique_merchants,
		topMerchants: p.top_merchants,
		minAmount: Number(p.min_amount),
		maxAmount: Number(p.max_amount),
		firstTransaction: p.first_transaction.toISOString(),
		lastTransaction: p.last_transaction.toISOString(),
		status: p.status,
		updatedAt: p.updated_at.toISOString()
	}));

	const variableStats = {
		totalCategories: variableSpending.length,
		totalMonthlyAverage: Math.round(totalMonthlyAverage * 100) / 100,
		totalVisitsPerMonth: Math.round(totalVisitsPerMonth * 10) / 10,
		totalTransactions
	};

	// Get variable pattern category IDs for monthly spending calculation
	const variablePatternCategoryIds = savedPatterns.map((p) => p.category_id);

	// Calculate full balance data including monthly spending
	const fullBalanceData = await calculateFullBalanceData(userId, variablePatternCategoryIds);

	return {
		...recurringData,
		variableSpending,
		variableStats,
		monthlySpending: fullBalanceData.monthlySpending,
		monthlySavingsAverage: fullBalanceData.monthlySavings
	};
};
