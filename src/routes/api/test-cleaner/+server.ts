import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { normalizeDescription } from '$lib/server/categorization/descriptionCleaner';

export const POST: RequestHandler = async ({ request }) => {
	const { description } = await request.json();
	
	const normalized = normalizeDescription(description);
	
	return json({
		original: description,
		normalized: normalized,
		originalLength: description?.length || 0,
		normalizedLength: normalized?.length || 0
	});
};

