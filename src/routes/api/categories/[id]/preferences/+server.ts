import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { CategoryPreferencesSchema } from '$lib/server/validation/category';

export const PUT: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	try {
		const userId = locals.user.id;
		const categoryId = parseInt(params.id);

		if (isNaN(categoryId)) {
			throw error(400, 'Invalid category ID');
		}

		// Check category exists
		const category = await db.categories.findUnique({
			where: { id: categoryId }
		});

		if (!category) {
			throw error(404, 'Category not found');
		}

		// Prevent disabling "Uncategorized"
		if (category.name === 'Uncategorized') {
			// Allow updating sort order but not disabling
			const body = await request.json();
			if (body.isActive === false) {
				throw error(400, 'Cannot disable "Uncategorized" category');
			}
		}

		const body = await request.json();

		// Validate request body
		const validationResult = CategoryPreferencesSchema.safeParse(body);
		if (!validationResult.success) {
			return json({
				message: 'Validation failed',
				errors: validationResult.error.errors
			}, { status: 400 });
		}

		const data = validationResult.data;

		// Upsert user_categories entry
		const userCategory = await db.user_categories.upsert({
			where: {
				user_id_category_id: {
					user_id: userId,
					category_id: categoryId
				}
			},
			update: {
				is_active: data.isActive,
				sort_order: data.sortOrder,
				updated_at: new Date()
			},
			create: {
				user_id: userId,
				category_id: categoryId,
				is_active: data.isActive,
				sort_order: data.sortOrder,
				updated_at: new Date()
			}
		});

		return json({
			success: true,
			preferences: {
				categoryId: userCategory.category_id,
				isActive: userCategory.is_active,
				sortOrder: userCategory.sort_order
			}
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Error updating category preferences:', err);
		throw error(500, 'Failed to update category preferences');
	}
};

