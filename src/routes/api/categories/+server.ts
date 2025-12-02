import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { z } from 'zod';

// Basic category create schema
const CategoryCreateSchema = z.object({
	name: z.string().min(1, 'Category name is required').max(100).trim()
});

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	try {
		const userId = locals.user.id;

		// Get all categories (system + user's) with keywords
		const categories = await db.categories.findMany({
			where: {
				OR: [
					{ is_default: true },
					{ created_by: userId }
				]
			},
			include: {
				category_keywords: {
					select: {
						keyword: true
					}
				}
			},
			orderBy: {
				name: 'asc'
			}
		});

		// Transform to include keywords as array
		const categoriesWithKeywords = categories.map((cat) => ({
			...cat,
			keywords: cat.category_keywords.map((ck) => ck.keyword)
		}));

		return json({ categories: categoriesWithKeywords });
	} catch (err) {
		console.error('Error fetching categories:', err);
		throw error(500, 'Failed to fetch categories');
	}
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	try {
		const userId = locals.user.id;
		const body = await request.json();

		// Validate request body
		const validationResult = CategoryCreateSchema.safeParse(body);
		if (!validationResult.success) {
			return json({
				message: 'Validation failed',
				errors: validationResult.error.errors
			}, { status: 400 });
		}

		const data = validationResult.data;

		// Check name uniqueness (user's categories only)
		const existingCategory = await db.categories.findFirst({
			where: {
				name: data.name,
				created_by: userId
			}
		});

		if (existingCategory) {
			throw error(409, 'Category with this name already exists');
		}

		// Create category
		const category = await db.categories.create({
			data: {
				name: data.name,
				description: null,
				color: null,
				icon: null,
				parent_id: null,
				created_by: userId,
				is_default: false,
				group: 'other',
				updated_at: new Date()
			}
		});

		// Fetch with keywords for response
		const categoryWithKeywords = await db.categories.findUnique({
			where: { id: category.id },
			include: {
				category_keywords: {
					select: {
						keyword: true
					}
				}
			}
		});

		const responseCategory = categoryWithKeywords
			? {
				...categoryWithKeywords,
				keywords: categoryWithKeywords.category_keywords.map((ck) => ck.keyword)
			}
			: { ...category, keywords: [] };

		return json({
			success: true,
			category: responseCategory
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Error creating category:', err);
		throw error(500, 'Failed to create category');
	}
};
