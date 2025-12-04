import type { PageServerLoad } from './$types';
import { recurringService } from '$lib/server/recurring/recurringService';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		return {
			subscriptions: [],
			stats: null,
			categories: [],
			categoryBreakdown: []
		};
	}

	const userId = locals.user.id;

	// Fetch recurring data using the service layer
	const recurringData = await recurringService.getRecurringData(userId);

	// Filter to only subscription-type items (not income, not variable costs)
	const expenseSubscriptions = recurringData.subscriptions.filter(
		(s) => !s.isIncome && s.status === 'active' && s.type === 'subscription'
	);

	// Calculate stats for subscriptions only
	const subscriptionStats = {
		totalActive: expenseSubscriptions.length,
		monthlyTotal: expenseSubscriptions.reduce((sum, s) => {
			let monthlyAmount = s.amount;
			switch (s.interval) {
				case 'yearly':
					monthlyAmount = s.amount / 12;
					break;
				case 'quarterly':
					monthlyAmount = s.amount / 3;
					break;
				case 'weekly':
					monthlyAmount = s.amount * 4.33;
					break;
				case '4-weekly':
					monthlyAmount = s.amount * (52 / 13);
					break;
			}
			return sum + monthlyAmount;
		}, 0),
		yearlyTotal: expenseSubscriptions.reduce((sum, s) => {
			let yearlyAmount = s.amount * 12;
			switch (s.interval) {
				case 'yearly':
					yearlyAmount = s.amount;
					break;
				case 'quarterly':
					yearlyAmount = s.amount * 4;
					break;
				case 'weekly':
					yearlyAmount = s.amount * 52;
					break;
				case '4-weekly':
					yearlyAmount = s.amount * 13;
					break;
			}
			return sum + yearlyAmount;
		}, 0)
	};

	return {
		subscriptions: recurringData.subscriptions,
		stats: subscriptionStats,
		categories: recurringData.categories,
		categoryBreakdown: recurringData.categoryBreakdown
	};
};


