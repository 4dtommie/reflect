import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { getTriggerMetadata } from '$lib/server/insights/triggerEvaluators';

export const load: PageServerLoad = async ({ locals }) => {
    const insights = await db.insightDefinition.findMany({
        orderBy: [
            { priority: 'desc' },
            { category: 'asc' }
        ]
    });

    const triggers = getTriggerMetadata();

    return {
        insights,
        triggers
    };
};
