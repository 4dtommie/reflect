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
			// Embedding fields removed from schema
			return json({
				available: false,
				sample: null,
				message: 'Embedding fields have been removed from the database schema.'
			});
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


