import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { z } from 'zod';
import { normalizeIBAN } from '$lib/server/categorization/ibanMatcher';

// Merchant update schema
const MerchantUpdateSchema = z.object({
	name: z.string().min(1).optional(),
	default_category_id: z.number().nullable().optional(),
	ibans: z.array(z.string()).optional()
});

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	try {
		const merchantId = parseInt(params.id);

		if (isNaN(merchantId)) {
			throw error(400, 'Invalid merchant ID');
		}

		// Fetch merchant with default category and transaction count
		const merchant = await (db as any).merchants.findUnique({
			where: { id: merchantId },
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
			}
		});

		if (!merchant) {
			throw error(404, 'Merchant not found');
		}

		return json({
			merchant: {
				id: merchant.id,
				name: merchant.name,
				ibans: merchant.ibans || [],
				default_category_id: merchant.default_category_id,
				default_category: merchant.categories,
				transaction_count: merchant._count.transactions,
				created_at: merchant.created_at,
				updated_at: merchant.updated_at
			}
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Error fetching merchant:', err);
		throw error(500, 'Failed to fetch merchant');
	}
};

export const PUT: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	try {
		const merchantId = parseInt(params.id);

		if (isNaN(merchantId)) {
			throw error(400, 'Invalid merchant ID');
		}

		// Check merchant exists
		const merchant = await (db as any).merchants.findUnique({
			where: { id: merchantId }
		});

		if (!merchant) {
			throw error(404, 'Merchant not found');
		}

		const body = await request.json();

		// Validate request body
		const validationResult = MerchantUpdateSchema.safeParse(body);
		if (!validationResult.success) {
			return json({
				message: 'Validation failed',
				errors: validationResult.error.issues
			}, { status: 400 });
		}

		const data = validationResult.data;

		// Validate default_category_id if provided
		if (data.default_category_id !== undefined && data.default_category_id !== null) {
			const category = await db.categories.findUnique({
				where: { id: data.default_category_id }
			});

			if (!category) {
				throw error(404, 'Category not found');
			}
		}

		// Normalize IBANs if provided
		let normalizedIbans: string[] | undefined;
		if (data.ibans !== undefined) {
			normalizedIbans = data.ibans
				.map((iban: string) => normalizeIBAN(iban))
				.filter((iban: string | null): iban is string => iban !== null);
		}

		// Build update data
		const updateData: any = {
			updated_at: new Date()
		};

		if (data.default_category_id !== undefined) {
			updateData.default_category_id = data.default_category_id;
		}

		if (data.name !== undefined) {
			updateData.name = data.name;
		}

		if (normalizedIbans !== undefined) {
			updateData.ibans = normalizedIbans;
		}

		// Update merchant
		const updatedMerchant = await (db as any).merchants.update({
			where: { id: merchantId },
			data: updateData,
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
			}
		});

		return json({
			success: true,
			merchant: {
				id: updatedMerchant.id,
				name: updatedMerchant.name,
				ibans: updatedMerchant.ibans || [],
				default_category_id: updatedMerchant.default_category_id,
				default_category: updatedMerchant.categories,
				transaction_count: updatedMerchant._count.transactions,
				created_at: updatedMerchant.created_at,
				updated_at: updatedMerchant.updated_at
			}
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Error updating merchant:', err);
		throw error(500, 'Failed to update merchant');
	}
};

