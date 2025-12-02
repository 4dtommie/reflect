import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
    // Check authentication
    if (!locals.user) {
        throw error(401, 'Not authenticated');
    }

    const userId = locals.user.id;

    try {
        // Fetch all recurring transactions for the user
        const subscriptions = await db.recurringTransaction.findMany({
            where: {
                user_id: userId
            },
            include: {
                merchants: true,
                categories: true,
                transactions: {
                    orderBy: {
                        date: 'desc'
                    },
                    take: 5 // Get last 5 transactions for history
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

        // Calculate Stats
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        let totalActive = 0;
        let totalInactive = 0;
        let monthlyTotal = 0;
        let yearlyTotal = 0;
        let categorizedCount = 0;
        let upcomingThisMonth = 0;
        let overdue = 0;

        const activeSubscriptions = subscriptions.filter(s => s.status === 'active');

        for (const sub of subscriptions) {
            if (sub.status === 'active') {
                totalActive++;

                // Calculate monthly and yearly costs
                const amount = Number(sub.amount);
                let monthlyAmount = 0;
                let yearlyAmount = 0;

                switch (sub.interval) {
                    case 'monthly':
                        monthlyAmount = amount;
                        yearlyAmount = amount * 12;
                        break;
                    case 'yearly':
                        monthlyAmount = amount / 12;
                        yearlyAmount = amount;
                        break;
                    case 'quarterly':
                        monthlyAmount = amount / 3;
                        yearlyAmount = amount * 4;
                        break;
                    case 'weekly':
                        monthlyAmount = amount * 4.33;
                        yearlyAmount = amount * 52;
                        break;
                    case '4-weekly':
                        monthlyAmount = amount * (52 / 13); // approx
                        yearlyAmount = amount * 13;
                        break;
                    default:
                        monthlyAmount = amount;
                        yearlyAmount = amount * 12;
                }

                // Check if it's an expense (not income)
                // Assuming income categories have group 'income'
                const isIncome = sub.categories?.group === 'income';

                if (!isIncome) {
                    monthlyTotal += monthlyAmount;
                    yearlyTotal += yearlyAmount;
                }

                // Check upcoming this month
                if (sub.next_expected_date) {
                    const nextDate = new Date(sub.next_expected_date);
                    if (nextDate.getMonth() === currentMonth && nextDate.getFullYear() === currentYear && nextDate >= now) {
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

        const categorizedPercentage = subscriptions.length > 0
            ? Math.round((categorizedCount / subscriptions.length) * 100)
            : 0;

        // Category Breakdown for Pie Chart
        const categoryMap = new Map<string, { name: string, total: number, count: number }>();

        for (const sub of activeSubscriptions) {
            // Only expenses for now in the breakdown
            if (sub.categories?.group !== 'income') {
                const catName = sub.categories?.name || 'Uncategorized';
                const current = categoryMap.get(catName) || { name: catName, total: 0, count: 0 };

                // Calculate monthly equivalent for the chart
                let monthlyAmount = 0;
                const amount = Number(sub.amount);
                switch (sub.interval) {
                    case 'monthly': monthlyAmount = amount; break;
                    case 'yearly': monthlyAmount = amount / 12; break;
                    case 'quarterly': monthlyAmount = amount / 3; break;
                    case 'weekly': monthlyAmount = amount * 4.33; break;
                    case '4-weekly': monthlyAmount = amount * (52 / 13); break;
                    default: monthlyAmount = amount;
                }

                current.total += monthlyAmount;
                current.count++;
                categoryMap.set(catName, current);
            }
        }

        const categoryBreakdown = Array.from(categoryMap.values())
            .map(item => ({
                ...item,
                percentage: monthlyTotal > 0 ? Math.round((item.total / monthlyTotal) * 100) : 0
            }))
            .sort((a, b) => b.total - a.total);

        const serializedSubscriptions = subscriptions.map(sub => ({
            ...sub,
            amount: Number(sub.amount),
            transactions: sub.transactions.map(tx => ({
                ...tx,
                amount: Number(tx.amount)
            }))
        }));

        return json({
            subscriptions: serializedSubscriptions,
            stats: {
                totalActive,
                totalInactive,
                monthlyTotal,
                yearlyTotal,
                categorizedPercentage,
                upcomingThisMonth,
                overdue
            },
            categories,
            categoryBreakdown
        });

    } catch (err) {
        console.error('Error fetching recurring transactions:', err);
        throw error(500, 'Failed to fetch recurring transactions');
    }
};
