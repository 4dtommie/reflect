import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getFuzzyMatchingProgress } from '$lib/server/categorization/fuzzyMatchingJob';

/**
 * Get fuzzy matching progress for a job
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	// Check authentication
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	const jobId = params.jobId;

	if (!jobId) {
		throw error(400, 'Job ID is required');
	}

	try {
		const progress = getFuzzyMatchingProgress(jobId);

		if (!progress) {
			throw error(404, 'Job not found');
		}

		// Verify the job belongs to the user
		if (progress.userId !== locals.user.id) {
			throw error(403, 'Access denied');
		}

		return json(progress);
	} catch (err: any) {
		if (err.status) {
			throw err;
		}
		console.error('Error fetching fuzzy matching progress:', err);
		throw error(500, 'Failed to fetch progress');
	}
};

