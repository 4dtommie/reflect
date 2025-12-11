import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;

	// Use raw SQL to group by the effective merchant name (Merged > Cleaned > Raw)
	// This ensures merged merchants appear as one group
	const groupMerchantsSql = (limit: number) => `
		SELECT 
			COALESCE(m.name, t.cleaned_merchant_name, t."merchantName") as name,
			COUNT(*)::int as count,
			MAX(t.id) as sample_id
		FROM transactions t
		LEFT JOIN merchants m ON t.merchant_id = m.id
		LEFT JOIN categories c ON t.category_id = c.id
		WHERE t.user_id = ${userId}
		  AND (t.category_id IS NULL OR c.name = 'Niet gecategoriseerd' OR c.name = 'Uncategorized')
		GROUP BY COALESCE(m.name, t.cleaned_merchant_name, t."merchantName")
		ORDER BY count DESC
		LIMIT ${limit}
	`;

	// Define return type for raw query
	type MerchantGroupRaw = {
		name: string | null;
		count: number;
		sample_id: number;
	};

	const [
		totalCount,
		categorizedCount,
		topMerchantsRaw,
		categories,
		uncategorizedMerchantsRaw,
		manualReviewTransactions
	] = await Promise.all([
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
		(await db.$queryRawUnsafe(groupMerchantsSql(5))) as MerchantGroupRaw[],
		db.categories.findMany({
			where: {
				OR: [{ is_default: true }, { created_by: userId }]
			},
			orderBy: { name: 'asc' }
		}),
		(await db.$queryRawUnsafe(groupMerchantsSql(50))) as MerchantGroupRaw[],
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

	// Fetch sample transactions details
	const sampleIds = uncategorizedMerchantsRaw.map((m: MerchantGroupRaw) => m.sample_id);
	const sampleTransactions = sampleIds.length > 0 ? await db.transactions.findMany({
		where: { id: { in: sampleIds } },
		select: {
			id: true,
			date: true,
			merchantName: true,
			merchant_id: true, // Include merchant_id for proper categorization
			amount: true,
			description: true,
			category_id: true,
			categories: {
				select: {
					id: true,
					name: true,
					icon: true,
					color: true
				}
			}
		}
	}) : [];

	const sampleMap = new Map(sampleTransactions.map((t: any) => [t.id, t]));

	return {
		stats: {
			totalTransactions: totalCount,
			categorizedCount,
			uncategorizedCount,
			categorizedPercentage,
			topUncategorizedMerchants: topMerchantsRaw.map((r: MerchantGroupRaw) => ({
				name: r.name || 'Unknown',
				count: Number(r.count)
			}))
		},
		categories: categories.map((c: any) => ({
			id: c.id,
			name: c.name,
			icon: c.icon,
			color: c.color,
			parentId: c.parent_id
		})),
		uncategorizedMerchants: uncategorizedMerchantsRaw.map((m: MerchantGroupRaw) => {
			const sample = sampleMap.get(m.sample_id) as (typeof sampleTransactions)[0] | undefined;
			return {
				name: m.name || 'Unknown',
				count: Number(m.count),
				sampleTransaction: sample ? {
					id: sample.id,
					date: sample.date,
					merchantName: sample.merchantName,
					merchantId: sample.merchant_id, // Include merchant_id for API
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
		manualReviewTransactions: manualReviewTransactions.map((t: any) => ({
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

