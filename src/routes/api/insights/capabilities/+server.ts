import { json, type RequestHandler } from '@sveltejs/kit';
import { CHAT_FUNCTIONS } from '$lib/server/insights/chatFunctions';
import { AVAILABLE_ACTIONS } from '$lib/server/insights/chatContext';

export const GET: RequestHandler = async ({ locals }) => {
    const userId = locals.user?.id;
    if (!userId) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Transform functions into a more UI-friendly format if needed,
    // but the raw OpenAI tool definition is actually quite descriptive.
    // We'll return it as-is for now, and handle display logic in the frontend.

    return json({
        functions: CHAT_FUNCTIONS,
        actions: AVAILABLE_ACTIONS
    });
};
