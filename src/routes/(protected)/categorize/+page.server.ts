import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;

	const [totalCount, categorizedCount, topUncategorizedMerchants, categories, uncategorizedMerchants, manualReviewTransactions] = await Promise.all([
		db.transactions.count({
			where: { user_id: userId }
		}),
		db.transactions.count({
			where: {
				user_id: userId,
				category_id: { not: null },
				categories: {
					name: { notIn: ['Niet gecategoriseerd', 'Uncategorized'] }
				}
			}
		}),
		db.transactions.groupBy({
			by: ['merchantName'],
			where: {
				user_id: userId,
				OR: [
					{ category_id: null },
					{ categories: { name: 'Niet gecategoriseerd' } }
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
			take: 5
		}),
		db.categories.findMany({
			where: {
				OR: [{ is_default: true }, { created_by: userId }]
			},
			orderBy: { name: 'asc' }
		}),
		// Fetch uncategorized merchants with transaction counts
		// Include transactions with null category_id OR category "Niet gecategoriseerd"
		db.transactions.groupBy({
			by: ['merchantName'],
			where: {
				user_id: userId,
				OR: [
					{ category_id: null },
					{ categories: { name: 'Niet gecategoriseerd' } }
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
			take: 50
		}),
		// Fetch transactions with lowest confidence for manual review
		// Show transactions with confidence < 0.9 (90%) - these need manual review
		// Exclude "Niet gecategoriseerd" category (those are shown in the left column)
		db.transactions.findMany({
			where: {
				user_id: userId,
				category_id: { not: null },
				category_confidence: { lt: 0.9 },
				categories: {
					name: { not: 'Niet gecategoriseerd' }
				}
			},
			orderBy: {
				category_confidence: 'asc'
			},
			take: 10,
			include: {
				categories: {
					select: {
						id: true,
						name: true,
						icon: true,
						color: true
					}
				}
			}
		})
	]);

	const uncategorizedCount = totalCount - categorizedCount;
	const categorizedPercentage = totalCount > 0 ? (categorizedCount / totalCount) * 100 : 0;

	// Debug logging for confidence query
	console.log('🔍 [Categorize Page] Debug confidence query:');
	console.log(`   - Total transactions: ${totalCount}`);
	console.log(`   - Categorized transactions: ${categorizedCount}`);

	// Check how many transactions have confidence values
	const transactionsWithConfidence = await db.transactions.count({
		where: {
			user_id: userId,
			category_confidence: { not: null }
		}
	});
	console.log(`   - Transactions with confidence: ${transactionsWithConfidence}`);

	// Check distribution of confidence values
	const confidenceStats = await db.transactions.groupBy({
		by: ['category_confidence'],
		where: {
			user_id: userId,
			category_confidence: { not: null },
			category_id: { not: null }
		},
		_count: {
			_all: true
		}
	});
	console.log(`   - Confidence value distribution:`, confidenceStats.map(s => ({
		confidence: s.category_confidence,
		count: s._count._all
	})));

	// Check transactions with category but no confidence
	const transactionsWithCategoryNoConfidence = await db.transactions.count({
		where: {
			user_id: userId,
			category_id: { not: null },
			category_confidence: null
		}
	});
	console.log(`   - Transactions with category but no confidence: ${transactionsWithCategoryNoConfidence}`);

	// Check what the manual review query finds
	console.log(`   - Manual review transactions found: ${manualReviewTransactions.length}`);
	if (manualReviewTransactions.length > 0) {
		console.log(`   - Sample confidence values:`, manualReviewTransactions.slice(0, 5).map(t => ({
			id: t.id,
			merchant: t.merchantName,
			confidence: t.category_confidence
		})));
	}

	// Get the list of merchant names
	const merchantNames = uncategorizedMerchants.map(m => m.merchantName).filter(n => n !== null);

	// Fetch one sample transaction for each merchant
	// We use findMany with distinct to get one per merchant efficiently
	const sampleTransactions = await db.transactions.findMany({
		where: {
			user_id: userId,
			merchantName: { in: merchantNames as string[] },
			OR: [
				{ category_id: null },
				{ categories: { name: 'Niet gecategoriseerd' } }
			]
		},
		distinct: ['merchantName'],
		select: {
			id: true,
			date: true,
			merchantName: true,
			amount: true,
			description: true,
			category_id: true, // Include to be safe, though likely null
			categories: {
				select: {
					id: true,
					name: true,
					icon: true,
					color: true
				}
			}
		}
	});

	// Create a map for easy lookup
	const sampleMap = new Map(sampleTransactions.map(t => [t.merchantName, t]));

	return {
		stats: {
			totalTransactions: totalCount,
			categorizedCount,
			uncategorizedCount,
			categorizedPercentage,
			topUncategorizedMerchants: topUncategorizedMerchants.map((r) => ({
				name: r.merchantName,
				count: r._count._all
			}))
		},
		categories: categories.map((c) => ({
			id: c.id,
			name: c.name,
			icon: c.icon,
			color: c.color,
			parentId: c.parent_id
		})),
		uncategorizedMerchants: uncategorizedMerchants.map((m) => {
			const sample = sampleMap.get(m.merchantName);
			return {
				name: m.merchantName,
				count: m._count._all,
				sampleTransaction: sample ? {
					id: sample.id,
					date: sample.date,
					merchantName: sample.merchantName,
					amount: sample.amount.toString(),
					description: sample.description,
					category: sample.categories ? {
						id: sample.categories.id,
						name: sample.categories.name,
						icon: sample.categories.icon,
						color: sample.categories.color
					} : null
				} : null
			};
		}),
		manualReviewTransactions: manualReviewTransactions.map((t) => ({
			id: t.id,
			date: t.date,
			merchantName: t.merchantName,
			amount: t.amount.toString(),
			description: t.description,
			category_confidence: t.category_confidence,
			category: t.categories ? {
				id: t.categories.id,
				name: t.categories.name,
				icon: t.categories.icon,
				color: t.categories.color
			} : null
		}))
	};
};

