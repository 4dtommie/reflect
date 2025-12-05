import { db } from '$lib/server/db';
import { collectInsightData, type InsightData } from './insightDataCollector';
import { evaluateTrigger, type TriggerResult } from './triggerEvaluators';

/**
 * An evaluated insight ready to display
 */
export interface EvaluatedInsight {
    id: string;
    category: 'urgent' | 'action' | 'insight' | 'celebration' | 'tip';
    priority: number;
    message: string;
    icon?: string;
    actionLabel?: string;
    actionHref?: string;
}

/**
 * Fill message template with data
 */
function fillTemplate(template: string, data: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
        return String(data[key] ?? `{{${key}}}`);
    });
}

/**
 * Get all active insights for a user, evaluated and sorted by priority
 */
export async function getActiveInsights(
    userId: number,
    context?: string
): Promise<EvaluatedInsight[]> {
    // Collect user data once
    const userData = await collectInsightData(userId);

    // Fetch all active insight definitions
    const definitions = await db.insightDefinition.findMany({
        where: {
            is_active: true,
            ...(context ? { contexts: { has: context } } : {})
        },
        orderBy: { priority: 'desc' }
    });

    // Evaluate each definition
    const evaluated: EvaluatedInsight[] = [];

    for (const def of definitions) {
        const triggerParams = def.trigger_params as Record<string, unknown> | null;
        const result = evaluateTrigger(def.trigger, userData, triggerParams ?? undefined);

        if (result.triggered) {
            evaluated.push({
                id: def.id,
                category: def.category as EvaluatedInsight['category'],
                priority: def.priority,
                message: fillTemplate(def.message_template, result.data ?? {}),
                icon: def.icon ?? undefined,
                actionLabel: def.action_label ?? undefined,
                actionHref: def.action_href ? fillTemplate(def.action_href, result.data ?? {}) : undefined
            });
        }
    }

    // Sort by priority (highest first)
    return evaluated.sort((a, b) => b.priority - a.priority);
}

/**
 * Get the single highest priority insight for a user
 */
export async function getTopInsight(
    userId: number,
    context?: string
): Promise<EvaluatedInsight | null> {
    const insights = await getActiveInsights(userId, context);
    return insights[0] ?? null;
}

/**
 * Get a specific insight if it evaluates to true
 */
export async function getSpecificInsight(
    userId: number,
    insightId: string
): Promise<EvaluatedInsight | null> {
    const userData = await collectInsightData(userId);

    const def = await db.insightDefinition.findUnique({
        where: { id: insightId, is_active: true }
    });

    if (!def) return null;

    const triggerParams = def.trigger_params as Record<string, unknown> | null;
    const result = evaluateTrigger(def.trigger, userData, triggerParams ?? undefined);

    if (result.triggered) {
        return {
            id: def.id,
            category: def.category as EvaluatedInsight['category'],
            priority: def.priority,
            message: fillTemplate(def.message_template, result.data ?? {}),
            icon: def.icon ?? undefined,
            actionLabel: def.action_label ?? undefined,
            actionHref: def.action_href ? fillTemplate(def.action_href, result.data ?? {}) : undefined
        };
    }

    return null;
}

/**
 * Get raw user data for AI context
 */
export async function getInsightData(userId: number): Promise<InsightData> {
    return collectInsightData(userId);
}

// Re-export types
export type { InsightData } from './insightDataCollector';
