import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getTriggerMetadata } from '$lib/server/insights/triggerEvaluators';

/**
 * GET /api/insights/triggers - List all available triggers with metadata
 */
export const GET: RequestHandler = async ({ locals }) => {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const triggers = getTriggerMetadata();

    return json({ triggers });
};
