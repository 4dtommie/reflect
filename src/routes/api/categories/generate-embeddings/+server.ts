import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateCategoryEmbeddings, getCategoryEmbeddingStats, isEmbeddingAvailable, prepareCategoryText } from '$lib/server/categorization/embeddingService';
import { db } from '$lib/server/db';

/**
 * GET: Get current embedding status or sample embedding
 * Query param ?sample=true returns a sample embedding instead of stats
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	const showSample = url.searchParams.get('sample') === 'true';

	if (showSample) {
		try {
			// Get first category with an embedding
			const categoryWithEmbedding = await db.$queryRaw<Array<{
				id: number;
				name: string;
				embedding: string;
				embedding_updated_at: Date | null;
			}>>`
				SELECT 
					id,
					name,
					embedding::text as embedding,
					embedding_updated_at
				FROM categories
				WHERE embedding IS NOT NULL
					AND (is_default = true OR created_by = ${locals.user.id})
				ORDER BY embedding_updated_at DESC NULLS LAST
				LIMIT 1
			`;

			if (categoryWithEmbedding.length === 0) {
				return json({
					available: true,
					sample: null,
					message: 'No categories with embeddings found. Generate embeddings first.'
				});
			}

			const category = categoryWithEmbedding[0];
			
			// Get keywords for this category to show the embedding text
			const categoryWithKeywords = await db.categories.findUnique({
				where: { id: category.id },
				select: {
					id: true,
					name: true,
					description: true,
					category_keywords: {
						where: { source: 'manual' },
						select: { keyword: true },
						take: 20
					}
				}
			});
			
			// Show what text was used for embedding
			const embeddingText = categoryWithKeywords ? prepareCategoryText({
				id: categoryWithKeywords.id,
				name: categoryWithKeywords.name,
				description: categoryWithKeywords.description,
				keywords: categoryWithKeywords.category_keywords.map(k => k.keyword)
			}) : null;
			
			// Parse the embedding string (format: [0.123, -0.456, ...])
			let embeddingArray: number[] = [];
			try {
				embeddingArray = JSON.parse(category.embedding);
			} catch {
				// If parsing fails, try to extract numbers manually
				const matches = category.embedding.match(/-?\d+\.?\d*/g);
				if (matches) {
					embeddingArray = matches.map(Number);
				}
			}

			return json({
				available: true,
				sample: {
					categoryId: category.id,
					categoryName: category.name,
					embeddingText: embeddingText, // Show what text was used
					dimensions: embeddingArray.length,
					first10: embeddingArray.slice(0, 10),
					last10: embeddingArray.slice(-10),
					updatedAt: category.embedding_updated_at
				}
			});
		} catch (err) {
			console.error('Error fetching sample embedding:', err);
			throw error(500, 'Failed to fetch sample embedding');
		}
	}

	// Default: return stats
	try {
		if (!isEmbeddingAvailable()) {
			return json({
				available: false,
				message: 'OpenAI API is not configured. Set OPENAI_API_KEY environment variable.'
			});
		}

		const stats = await getCategoryEmbeddingStats();

		return json({
			available: true,
			stats
		});
	} catch (err) {
		console.error('Error fetching embedding stats:', err);
		throw error(500, 'Failed to fetch embedding status');
	}
};

/**
 * POST: Generate embeddings for all categories
 */
export const POST: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	try {
		if (!isEmbeddingAvailable()) {
			throw error(400, 'OpenAI API is not configured. Set OPENAI_API_KEY environment variable.');
		}

		const userId = locals.user.id;

		// Generate embeddings for all categories (default + user's custom)
		const result = await generateCategoryEmbeddings(userId);

		return json({
			success: true,
			result
		});
	} catch (err) {
		console.error('Error generating category embeddings:', err);
		
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, err instanceof Error ? err.message : 'Failed to generate embeddings');
	}
};


