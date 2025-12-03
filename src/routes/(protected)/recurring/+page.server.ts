import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
    // Fetch both recurring and variable spending data in parallel
    const [recurringResponse, variableResponse] = await Promise.all([
        fetch('/api/recurring'),
        fetch('/api/variable-spending')
    ]);

    const recurringData = await recurringResponse.json();
    
    let variableData = { patterns: [], stats: null };
    if (variableResponse.ok) {
        variableData = await variableResponse.json();
        console.log('[Recurring Page] Variable spending API returned:', {
            status: variableResponse.status,
            patternsCount: variableData.patterns?.length || 0,
            stats: variableData.stats
        });
    } else {
        console.error('[Recurring Page] Variable spending API error:', variableResponse.status, await variableResponse.text());
    }

    return {
        ...recurringData,
        variableSpending: variableData.patterns || [],
        variableStats: variableData.stats || null
    };
};
