import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;

	const [totalCount, categorizedCount, topUncategorizedMerchants, categories] = await Promise.all([
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
			take: 10
		}),
		db.categories.findMany({
			where: {
				OR: [{ is_default: true }, { created_by: userId }]
			},
			orderBy: { name: 'asc' }
		})
	]);

	const uncategorizedCount = totalCount - categorizedCount;
	const categorizedPercentage = totalCount > 0 ? (categorizedCount / totalCount) * 100 : 0;

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
			color: c.color
		}))
	};
};

