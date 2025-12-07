import { db } from '$lib/server/db';
import type { categories, merchants, transactions, RecurringTransaction } from '@prisma/client';

// Types for recurring service
export interface RecurringStats {
	totalActive: number;
	totalInactive: number;
	monthlyTotal: number;
	yearlyTotal: number;
	categorizedPercentage: number;
	upcomingThisMonth: number;
	overdue: number;
}

export interface CategoryBreakdownItem {
	name: string;
	total: number;
	count: number;
	percentage: number;
}

export interface SerializedTransaction {
	id: number;
	amount: number;
	date: Date;
	is_debit: boolean;
	merchantName: string | null;
	cleaned_merchant_name: string | null;
}

export interface SerializedSubscription {
	id: number;
	name: string;
	amount: number;
	interval: string | null;
	status: string;
	type: string | null;
	next_expected_date: Date | null;
	merchant_id: number | null;
	category_id: number | null;
	user_id: number;
	created_at: Date;
	updated_at: Date;
	isIncome: boolean;
	merchants: merchants | null;
	categories: categories | null;
	transactions: SerializedTransaction[];
}

export interface RecurringData {
	subscriptions: SerializedSubscription[];
	stats: RecurringStats;
	categories: categories[];
	categoryBreakdown: CategoryBreakdownItem[];
}

type SubscriptionWithRelations = RecurringTransaction & {
	merchants: merchants | null;
	categories: categories | null;
	transactions: transactions[];
};

/**
 * Calculate monthly amount from an interval and amount
 */
export function calculateMonthlyAmount(amount: number, interval: string | null): number {
	switch (interval) {
		case 'monthly':
			return amount;
		case 'yearly':
			return amount / 12;
		case 'quarterly':
			return amount / 3;
		case 'weekly':
			return amount * 4.33;
		case '4-weekly':
			return amount * (52 / 13);
		default:
			return amount;
	}
}

/**
 * Calculate yearly amount from an interval and amount
 */
export function calculateYearlyAmount(amount: number, interval: string | null): number {
	switch (interval) {
		case 'monthly':
			return amount * 12;
		case 'yearly':
			return amount;
		case 'quarterly':
			return amount * 4;
		case 'weekly':
			return amount * 52;
		case '4-weekly':
			return amount * 13;
		default:
			return amount * 12;
	}
}

/**
 * Check if a subscription is income based on category and transactions
 */
export function checkIsIncome(sub: SubscriptionWithRelations): boolean {
	// Check category group first
	if (sub.categories?.group === 'income') return true;

	// Check linked transactions - if most are NOT debits, it's income
	if (sub.transactions.length > 0) {
		const nonDebitCount = sub.transactions.filter((tx) => !tx.is_debit).length;
		return nonDebitCount > sub.transactions.length / 2;
	}

	return false;
}

/**
 * RecurringService - shared business logic for recurring transactions
 */
export class RecurringService {
	/**
	 * Get all recurring data for a user including subscriptions, stats, and breakdown
	 */
	async getRecurringData(userId: number): Promise<RecurringData> {
		// Calculate date range: last 12 months
		const now = new Date();
		const twelveMonthsAgo = new Date(now);
		twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

		// Fetch all recurring transactions for the user
		const subscriptions = await db.recurringTransaction.findMany({
			where: {
				user_id: userId
			},
			include: {
				merchants: true,
				categories: true,
				transactions: {
					where: {
						date: {
							gte: twelveMonthsAgo
						}
					},
					orderBy: {
						date: 'desc'
					}
				}
			},
			orderBy: {
				next_expected_date: 'asc'
			}
		});

		// Fetch all categories for filtering
		const categories = await db.categories.findMany({
			orderBy: {
				name: 'asc'
			}
		});

		// Calculate stats
		const stats = this.calculateStats(subscriptions, now);

		// Calculate category breakdown
		const categoryBreakdown = this.calculateCategoryBreakdown(subscriptions, stats.monthlyTotal);

		// Serialize subscriptions for JSON response
		const serializedSubscriptions = this.serializeSubscriptions(subscriptions);

		return {
			subscriptions: serializedSubscriptions,
			stats,
			categories,
			categoryBreakdown
		};
	}

	/**
	 * Calculate statistics from subscriptions
	 */
	private calculateStats(
		subscriptions: SubscriptionWithRelations[],
		now: Date
	): RecurringStats {
		const currentMonth = now.getMonth();
		const currentYear = now.getFullYear();

		let totalActive = 0;
		let totalInactive = 0;
		let monthlyTotal = 0;
		let yearlyTotal = 0;
		let categorizedCount = 0;
		let upcomingThisMonth = 0;
		let overdue = 0;

		for (const sub of subscriptions) {
			if (sub.status === 'active') {
				totalActive++;

				const amount = Number(sub.amount);
				const monthlyAmount = calculateMonthlyAmount(amount, sub.interval);
				const yearlyAmount = calculateYearlyAmount(amount, sub.interval);

				// Check if it's an expense (not income)
				const isIncome = checkIsIncome(sub);

				if (!isIncome) {
					monthlyTotal += monthlyAmount;
					yearlyTotal += yearlyAmount;
				}

				// Check upcoming this month
				if (sub.next_expected_date) {
					const nextDate = new Date(sub.next_expected_date);
					if (
						nextDate.getMonth() === currentMonth &&
						nextDate.getFullYear() === currentYear &&
						nextDate >= now
					) {
						upcomingThisMonth++;
					}
					// Check overdue
					if (nextDate < now) {
						overdue++;
					}
				}
			} else {
				totalInactive++;
			}

			if (sub.category_id) {
				categorizedCount++;
			}
		}

		const categorizedPercentage =
			subscriptions.length > 0 ? Math.round((categorizedCount / subscriptions.length) * 100) : 0;

		return {
			totalActive,
			totalInactive,
			monthlyTotal,
			yearlyTotal,
			categorizedPercentage,
			upcomingThisMonth,
			overdue
		};
	}

	/**
	 * Calculate category breakdown for active subscriptions
	 */
	private calculateCategoryBreakdown(
		subscriptions: SubscriptionWithRelations[],
		monthlyTotal: number
	): CategoryBreakdownItem[] {
		const activeSubscriptions = subscriptions.filter((s) => s.status === 'active');
		const categoryMap = new Map<string, { name: string; total: number; count: number }>();

		for (const sub of activeSubscriptions) {
			// Only expenses for the breakdown
			if (!checkIsIncome(sub)) {
				const catName = sub.categories?.name || 'Uncategorized';
				const current = categoryMap.get(catName) || { name: catName, total: 0, count: 0 };

				const amount = Number(sub.amount);
				const monthlyAmount = calculateMonthlyAmount(amount, sub.interval);

				current.total += monthlyAmount;
				current.count++;
				categoryMap.set(catName, current);
			}
		}

		return Array.from(categoryMap.values())
			.map((item) => ({
				...item,
				percentage: monthlyTotal > 0 ? Math.round((item.total / monthlyTotal) * 100) : 0
			}))
			.sort((a, b) => b.total - a.total);
	}

	/**
	 * Serialize subscriptions for JSON response
	 */
	private serializeSubscriptions(
		subscriptions: SubscriptionWithRelations[]
	): SerializedSubscription[] {
		return subscriptions.map((sub) => ({
			id: sub.id,
			name: sub.name,
			amount: Number(sub.amount),
			interval: sub.interval,
			status: sub.status,
			type: sub.type,
			next_expected_date: sub.next_expected_date,
			merchant_id: sub.merchant_id,
			category_id: sub.category_id,
			user_id: sub.user_id,
			created_at: sub.created_at,
			updated_at: sub.updated_at,
			isIncome: checkIsIncome(sub),
			merchants: sub.merchants,
			categories: sub.categories,
			transactions: sub.transactions.map((tx) => ({
				id: tx.id,
				amount: Number(tx.amount),
				date: tx.date,
				is_debit: tx.is_debit,
				merchantName: tx.merchantName,
				cleaned_merchant_name: tx.cleaned_merchant_name
			}))
		}));
	}

	/**
	 * Delete all recurring data for a user
	 */
	async deleteAllRecurring(userId: number): Promise<void> {
		// Delete all recurring transactions for the user
		await db.recurringTransaction.deleteMany({
			where: {
				user_id: userId
			}
		});

		// Delete all variable spending patterns for the user
		await db.variableSpendingPattern.deleteMany({
			where: {
				user_id: userId
			}
		});

		// Unlink any transactions that were linked to recurring transactions
		await db.transactions.updateMany({
			where: {
				user_id: userId,
				recurring_transaction_id: { not: null }
			},
			data: {
				recurring_transaction_id: null
			}
		});
	}

	/**
	 * Calculate monthly income from active income subscriptions
	 */
	calculateMonthlyIncome(subscriptions: SerializedSubscription[]): number {
		let monthlyTotal = 0;

		for (const sub of subscriptions) {
			if (sub.status === 'active' && sub.isIncome) {
				monthlyTotal += calculateMonthlyAmount(sub.amount, sub.interval);
			}
		}

		return monthlyTotal;
	}

	/**
	 * Backfill categories for recurring patterns that don't have one set
	 * Uses the most common category from linked transactions
	 */
	async backfillCategories(userId: number): Promise<number> {
		// Find recurring patterns without a category that have linked transactions
		const patternsToUpdate = await db.recurringTransaction.findMany({
			where: {
				user_id: userId,
				category_id: null
			},
			include: {
				transactions: {
					where: {
						category_id: { not: null }
					},
					select: {
						category_id: true
					}
				}
			}
		});

		let updatedCount = 0;

		for (const pattern of patternsToUpdate) {
			if (pattern.transactions.length === 0) continue;

			// Find the most common category
			const categoryCount = new Map<number, number>();
			for (const tx of pattern.transactions) {
				if (tx.category_id) {
					categoryCount.set(tx.category_id, (categoryCount.get(tx.category_id) || 0) + 1);
				}
			}

			if (categoryCount.size === 0) continue;

			let maxCount = 0;
			let mostCommonCategoryId: number | null = null;

			for (const [categoryId, count] of categoryCount) {
				if (count > maxCount) {
					maxCount = count;
					mostCommonCategoryId = categoryId;
				}
			}

			if (mostCommonCategoryId) {
				await db.recurringTransaction.update({
					where: { id: pattern.id },
					data: { category_id: mostCommonCategoryId }
				});
				updatedCount++;
				console.log(`[RecurringService] Backfilled category ${mostCommonCategoryId} for pattern ${pattern.id} (${pattern.name})`);
			}
		}

		console.log(`[RecurringService] Backfill complete: updated ${updatedCount} patterns`);
		return updatedCount;
	}
}

// Export singleton instance
export const recurringService = new RecurringService();


