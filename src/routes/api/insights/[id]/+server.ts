import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

/**
 * PUT /api/insights/[id] - Update insight definition
 */
export const PUT: RequestHandler = async ({ params, request, locals }) => {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    try {
        const existing = await db.insightDefinition.findUnique({ where: { id } });
        if (!existing) {
            return json({ error: 'Insight not found' }, { status: 404 });
        }

        const body = await request.json();
        const { category, priority, trigger, trigger_params, message_template, icon, action_label, action_href, contexts, cooldown_hours, is_active } = body;

        const insight = await db.insightDefinition.update({
            where: { id },
            data: {
                ...(category !== undefined && { category }),
                ...(priority !== undefined && { priority }),
                ...(trigger !== undefined && { trigger }),
                ...(trigger_params !== undefined && { trigger_params }),
                ...(message_template !== undefined && { message_template }),
                ...(icon !== undefined && { icon }),
                ...(action_label !== undefined && { action_label }),
                ...(action_href !== undefined && { action_href }),
                ...(contexts !== undefined && { contexts }),
                ...(cooldown_hours !== undefined && { cooldown_hours }),
                ...(body.related_insight_id !== undefined && { related_insight_id: body.related_insight_id || null }),
                ...(is_active !== undefined && { is_active })
            }
        });

        return json({ insight });
    } catch (error) {
        console.error('Error updating insight:', error);
        return json({ error: 'Failed to update insight' }, { status: 500 });
    }
};

/**
 * DELETE /api/insights/[id] - Delete insight definition
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    try {
        const existing = await db.insightDefinition.findUnique({ where: { id } });
        if (!existing) {
            return json({ error: 'Insight not found' }, { status: 404 });
        }

        await db.insightDefinition.delete({ where: { id } });

        return json({ success: true });
    } catch (error) {
        console.error('Error deleting insight:', error);
        return json({ error: 'Failed to delete insight' }, { status: 500 });
    }
};
