import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	try {
		// Get all merchants with their default category and transaction count
		const merchants = await (db as any).merchants.findMany({
			where: {
				is_active: true
			},
			include: {
				categories: {
					select: {
						id: true,
						name: true,
						color: true,
						icon: true
					}
				},
				_count: {
					select: {
						transactions: true
					}
				}
			},
			orderBy: {
				name: 'asc'
			}
		});

		// Transform to include transaction count
		const merchantsWithCount = merchants.map((merchant: any) => ({
			id: merchant.id,
			name: merchant.name,
			ibans: merchant.ibans || [],
			default_category_id: merchant.default_category_id,
			default_category: merchant.categories,
			transaction_count: merchant._count.transactions,
			created_at: merchant.created_at,
			updated_at: merchant.updated_at
		}));

		return json({ merchants: merchantsWithCount });
	} catch (err) {
		console.error('Error fetching merchants:', err);
		throw error(500, 'Failed to fetch merchants');
	}
};

