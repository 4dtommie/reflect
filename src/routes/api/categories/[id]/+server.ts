import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { CategoryUpdateSchema } from '$lib/server/validation/category';

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	try {
		const categoryId = parseInt(params.id);

		if (isNaN(categoryId)) {
			throw error(400, 'Invalid category ID');
		}

		// Fetch category with keywords
		const category = await db.categories.findUnique({
			where: { id: categoryId },
			include: {
				category_keywords: {
					select: {
						keyword: true
					}
				}
			}
		});

		if (!category) {
			throw error(404, 'Category not found');
		}

		// Count transactions using this category
		const transactionCount = await db.transactions.count({
			where: { category_id: categoryId }
		});

		const canEdit = category.created_by === locals.user.id;
		const canDelete = canEdit && transactionCount === 0;

		const responseCategory = {
			...category,
			keywords: category.category_keywords.map((ck) => ck.keyword)
		};

		return json({
			category: responseCategory,
			canEdit,
			canDelete,
			transactionCount
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Error fetching category:', err);
		throw error(500, 'Failed to fetch category');
	}
};

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

		// Check user owns the category
		if (category.created_by !== userId) {
			throw error(403, 'You can only edit your own categories');
		}

		// Cannot edit system categories
		if (category.is_default) {
			throw error(403, 'Cannot edit system categories');
		}

		const body = await request.json();

		// Validate request body
		const validationResult = CategoryUpdateSchema.safeParse(body);
		if (!validationResult.success) {
			throw error(400, {
				message: 'Validation failed',
				errors: validationResult.error.errors
			});
		}

		const data = validationResult.data;

		// Check name uniqueness if name is being changed
		if (data.name && data.name !== category.name) {
			const existingCategory = await db.categories.findFirst({
				where: {
					name: data.name,
					created_by: userId,
					id: { not: categoryId }
				}
			});

			if (existingCategory) {
				throw error(409, 'Category with this name already exists');
			}
		}

		// Validate parent category if provided
		if (data.parentId !== undefined && data.parentId !== null) {
			const parentCategory = await db.categories.findUnique({
				where: { id: data.parentId }
			});

			if (!parentCategory) {
				throw error(404, 'Parent category not found');
			}

			// Parent must be a system category or belong to the user
			if (parentCategory.created_by !== null && parentCategory.created_by !== userId) {
				throw error(403, 'Cannot use parent category from another user');
			}

			// Prevent circular references
			if (data.parentId === categoryId) {
				throw error(400, 'Category cannot be its own parent');
			}
		}

		// Build update data
		const updateData: any = {
			updated_at: new Date()
		};

		if (data.name !== undefined) updateData.name = data.name;
		if (data.description !== undefined) updateData.description = data.description || null;
		if (data.color !== undefined) updateData.color = data.color || null;
		if (data.icon !== undefined) updateData.icon = data.icon || null;
		if (data.parentId !== undefined) updateData.parent_id = data.parentId || null;
		if (data.group !== undefined) updateData.group = data.group;

		// Update category
		await db.categories.update({
			where: { id: categoryId },
			data: updateData
		});

		// Handle keywords update if provided
		if (data.keywords !== undefined && Array.isArray(data.keywords)) {
			// Delete existing keywords
			await (db as any).category_keywords.deleteMany({
				where: { category_id: categoryId }
			});

			// Create new keywords
			if (data.keywords.length > 0) {
				await (db as any).category_keywords.createMany({
					data: data.keywords.map((keyword: string) => ({
						category_id: categoryId,
						keyword: keyword.trim(),
						source: 'manual'
					}))
				});
			}
		}

		// Fetch updated category with keywords
		const updatedCategory = await db.categories.findUnique({
			where: { id: categoryId },
			include: {
				category_keywords: {
					select: {
						keyword: true
					}
				}
			}
		});

		const responseCategory = updatedCategory
			? {
					...updatedCategory,
					keywords: updatedCategory.category_keywords.map((ck) => ck.keyword)
				}
			: null;

		return json({
			success: true,
			category: responseCategory
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Error updating category:', err);
		throw error(500, 'Failed to update category');
	}
};

export const DELETE: RequestHandler = async ({ locals, params, request }) => {
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

		// Check user owns the category
		if (category.created_by !== userId) {
			throw error(403, 'You can only delete your own categories');
		}

		// Cannot delete system categories
		if (category.is_default) {
			throw error(403, 'Cannot delete system categories');
		}

		// Count transactions using this category
		const transactionCount = await db.transactions.count({
			where: {
				category_id: categoryId
			}
		});

		// Parse optional request body for reassignment
		let reassignToCategoryId: number | null = null;
		try {
			const contentType = request.headers.get('content-type');
			if (contentType && contentType.includes('application/json')) {
				const body = await request.json();
				if (body.reassignToCategoryId) {
					reassignToCategoryId = parseInt(body.reassignToCategoryId);
					if (isNaN(reassignToCategoryId)) {
						throw error(400, 'Invalid reassignToCategoryId');
					}
				}
			}
		} catch (err) {
			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}
			// No body or invalid JSON, that's okay
		}

		// If transactions exist, handle reassignment
		let reassignedCount = 0;
		if (transactionCount > 0) {
			if (reassignToCategoryId === null) {
				throw error(400, {
					message: 'Cannot delete category with transactions',
					transactionCount
				});
			}

			// Verify reassign category exists and is accessible
			const reassignCategory = await db.categories.findUnique({
				where: { id: reassignToCategoryId }
			});

			if (!reassignCategory) {
				throw error(404, 'Reassign category not found');
			}

			// Reassign transactions
			await db.transactions.updateMany({
				where: {
					category_id: categoryId
				},
				data: {
					category_id: reassignToCategoryId
				}
			});

			reassignedCount = transactionCount;
		}

		// Delete from user_categories
		await db.user_categories.deleteMany({
			where: {
				category_id: categoryId,
				user_id: userId
			}
		});

		// Delete category
		await db.categories.delete({
			where: { id: categoryId }
		});

		return json({
			success: true,
			deleted: true,
			reassignedCount: reassignedCount > 0 ? reassignedCount : undefined
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Error deleting category:', err);
		throw error(500, 'Failed to delete category');
	}
};

