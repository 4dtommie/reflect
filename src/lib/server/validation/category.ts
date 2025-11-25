import { z } from 'zod';

// Valid group values
const CategoryGroupEnum = z.enum(['income', 'essential', 'lifestyle', 'financial', 'other']);

// Category create schema
export const CategoryCreateSchema = z.object({
	name: z
		.string()
		.min(1, 'Category name is required')
		.max(100, 'Category name must be 100 characters or less')
		.trim(),
	description: z.string().max(500, 'Description must be 500 characters or less').optional().nullable(),
	color: z
		.string()
		.regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color code (e.g., #22c55e)')
		.optional()
		.nullable(),
	icon: z.string().max(50, 'Icon name must be 50 characters or less').optional().nullable(),
	keywords: z.array(z.string().min(1).max(100)).optional().default([]),
	parentId: z.number().int().positive().optional().nullable(),
	group: CategoryGroupEnum.optional()
});

// Category update schema
export const CategoryUpdateSchema = z.object({
	name: z
		.string()
		.min(1, 'Category name is required')
		.max(100, 'Category name must be 100 characters or less')
		.trim()
		.optional(),
	description: z.string().max(500, 'Description must be 500 characters or less').optional().nullable(),
	color: z
		.string()
		.regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color code (e.g., #22c55e)')
		.optional()
		.nullable(),
	icon: z.string().max(50, 'Icon name must be 50 characters or less').optional().nullable(),
	keywords: z.array(z.string().min(1).max(100)).optional(),
	parentId: z.number().int().positive().optional().nullable(),
	group: CategoryGroupEnum.optional()
});

// Category preferences schema
export const CategoryPreferencesSchema = z.object({
	isActive: z.boolean(),
	sortOrder: z.number().int().min(0).default(0)
});

// Type exports
export type CategoryCreateInput = z.infer<typeof CategoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof CategoryUpdateSchema>;
export type CategoryPreferencesInput = z.infer<typeof CategoryPreferencesSchema>;

