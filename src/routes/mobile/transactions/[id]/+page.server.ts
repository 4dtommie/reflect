import { db } from '$lib/server/db';
import type { PageServerLoad } from './$types';
import { applyDateOffset, getOffsetFromUrl } from '$lib/server/utils/dateShifter';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const userId = locals.user?.id;
	const transactionId = parseInt(params.id, 10);
	const manualOffset = getOffsetFromUrl(url);

	if (!userId) {
		throw error(401, 'Niet ingelogd');
	}

	if (isNaN(transactionId)) {
		throw error(400, 'Ongeldige transactie ID');
	}

	// Find the latest transaction date for base offset calculation
	const latestTransaction = await db.transactions.findFirst({
		where: { user_id: userId },
		orderBy: { date: 'desc' },
		select: { date: true }
	});

	let baseOffset = 0;
	if (latestTransaction) {
		const latestDate = new Date(latestTransaction.date);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		latestDate.setHours(0, 0, 0, 0);

		const diffDays = Math.floor((today.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24));
		baseOffset = diffDays + 26;
	}

	// Fetch the transaction with all related data
	const transaction = await db.transactions.findFirst({
		where: {
			id: transactionId,
			user_id: userId
		},
		include: {
			categories: true,
			merchants: true,
			recurring_transaction: true
		}
	});

	if (!transaction) {
		throw error(404, 'Transactie niet gevonden');
	}

	// Apply date offset for display
	const originalDate = new Date(transaction.date);
	const displayDate = applyDateOffset(originalDate, baseOffset);

	// Format date and time
	const months = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
	const days = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];
	
	const dayName = days[displayDate.getDay()];
	const dateFormatted = `${displayDate.getDate()} ${months[displayDate.getMonth()]} ${displayDate.getFullYear()}`;
	
	// Extract time from description if available (format: "22:29" pattern)
	let timeFormatted = '';
	if (transaction.description) {
		const timeMatch = transaction.description.match(/\b(\d{1,2}:\d{2})\b/);
		if (timeMatch) {
			timeFormatted = timeMatch[1];
		}
	}

	// Calculate current month boundaries for stats
	const now = new Date();
	const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
	const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

	// Get similar transactions (same merchant, different dates)
	const similarTransactions = await db.transactions.findMany({
		where: {
			user_id: userId,
			merchant_id: transaction.merchant_id,
			id: { not: transaction.id }
		},
		orderBy: { date: 'desc' },
		take: 5,
		include: {
			categories: true
		}
	});

	// Calculate average amount for this merchant (current month only)
	const merchantStats = await db.transactions.aggregate({
		where: {
			user_id: userId,
			merchant_id: transaction.merchant_id,
			date: {
				gte: currentMonthStart,
				lte: currentMonthEnd
			}
		},
		_avg: { amount: true },
		_count: true,
		_sum: { amount: true }
	});

	// Get spending comparison insight
	let insight = null;
	if (transaction.category_id && merchantStats._avg.amount) {
		const avgAmount = Number(merchantStats._avg.amount);
		const currentAmount = Number(transaction.amount);
		const percentDiff = Math.round(((currentAmount - avgAmount) / avgAmount) * 100);
		
		if (Math.abs(percentDiff) >= 10) {
			insight = {
				percentDiff,
				isMore: percentDiff > 0,
				avgAmount,
				category: transaction.categories?.name || 'deze categorie'
			};
		}
	}

	return {
		transaction: {
			id: transaction.id,
			merchant: transaction.merchants?.name || transaction.cleaned_merchant_name || transaction.merchantName,
			amount: Number(transaction.amount),
			isDebit: transaction.is_debit,
			category: transaction.categories?.name || 'Overig',
			categoryIcon: transaction.categories?.icon || null,
			categoryColor: transaction.categories?.color || null,
			categoryId: transaction.category_id,
			description: transaction.description,
			iban: transaction.counterparty_iban || transaction.iban,
			date: dateFormatted,
			dayName,
			time: timeFormatted,
			isRecurring: !!transaction.recurring_transaction_id,
			recurringInterval: transaction.recurring_transaction?.interval || null
		},
		insight,
		similarTransactions: similarTransactions.map(t => {
			const date = applyDateOffset(new Date(t.date), baseOffset);
			return {
				id: t.id,
				amount: Number(t.amount),
				isDebit: t.is_debit,
				date: `${date.getDate()} ${months[date.getMonth()]}`
			};
		}),
		merchantStats: {
			totalTransactions: merchantStats._count,
			totalSpent: Number(merchantStats._sum.amount || 0)
		},
		baseOffset
	};
};
