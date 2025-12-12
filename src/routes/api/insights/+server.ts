import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

/**
 * GET /api/insights - List all insight definitions
 */
export const GET: RequestHandler = async ({ locals }) => {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const insights = await db.insightDefinition.findMany({
        orderBy: [
            { priority: 'desc' },
            { category: 'asc' }
        ],

    });

    return json({ insights });
};

/**
 * POST /api/insights - Create new insight definition
 */
export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { id, name, description, category, priority, trigger, trigger_params, message_template, icon, action_label, action_href, contexts, cooldown_hours, is_active } = body;

        // Validate required fields
        if (!id || !category || !trigger || !message_template) {
            return json({ error: 'Missing required fields: id, category, trigger, message_template' }, { status: 400 });
        }

        // Check if ID already exists
        const existing = await db.insightDefinition.findUnique({ where: { id } });
        if (existing) {
            return json({ error: `Insight with id "${id}" already exists"`, status: 400 });
        }

        const insight = await db.insightDefinition.create({
            data: {
                id,
                name: name ?? null,
                description: description ?? null,
                category,
                priority: priority ?? 50,
                trigger,
                trigger_params: trigger_params ?? null,
                message_template,
                icon: icon ?? null,
                action_label: action_label ?? null,
                action_href: action_href ?? null,
                contexts: contexts ?? ['chat', 'card'],
                cooldown_hours: cooldown_hours ?? 0,
                related_insight_id: body.related_insight_id || null,
                is_active: is_active ?? true
            }
        });

        return json({ insight }, { status: 201 });
    } catch (error) {
        console.error('Error creating insight:', error);
        return json({ error: 'Failed to create insight' }, { status: 500 });
    }
};
