import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getProgress } from '$lib/server/categorization/progressStore';

/**
 * GET endpoint to fetch current progress
 */
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	const userId = locals.user.id;
	const progress = getProgress(userId);

	if (!progress) {
		return json({ progress: null });
	}

	return json({ progress });
};

