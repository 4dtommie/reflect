import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { findMergeCandidates, mergeMerchants, type MergeCandidate } from '$lib/server/categorization/merchantMerger';

/**
 * GET - Get merge suggestions
 */
export const GET: RequestHandler = async ({ url, locals }) => {
    if (!locals.user) {
        throw error(401, 'Not authenticated');
    }

    try {
        const threshold = parseFloat(url.searchParams.get('threshold') || '0.7');
        const candidates = await findMergeCandidates(threshold);

        return json({
            suggestions: candidates.map(c => ({
                merchant1: c.merchant1,
                merchant2: c.merchant2,
                similarity: c.similarity,
                similarityPercent: Math.round(c.similarity * 100)
            }))
        });
    } catch (err) {
        console.error('Error finding merge candidates:', err);
        throw error(500, 'Failed to find merge candidates');
    }
};

/**
 * POST - Execute a merge
 */
export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.user) {
        throw error(401, 'Not authenticated');
    }

    try {
        const body = await request.json();
        const { targetId, sourceId } = body;

        if (!targetId || !sourceId) {
            throw error(400, 'targetId and sourceId are required');
        }

        // Create a merge candidate from the IDs
        // We need to fetch the merchant details
        const { db } = await import('$lib/server/db');

        const [target, source] = await Promise.all([
            (db as any).merchants.findUnique({
                where: { id: targetId },
                include: { _count: { select: { transactions: true } } }
            }),
            (db as any).merchants.findUnique({
                where: { id: sourceId },
                include: { _count: { select: { transactions: true } } }
            })
        ]);

        if (!target || !source) {
            throw error(404, 'Merchant not found');
        }

        const candidate: MergeCandidate = {
            merchant1: { id: target.id, name: target.name, transactionCount: target._count.transactions },
            merchant2: { id: source.id, name: source.name, transactionCount: source._count.transactions },
            similarity: 1.0 // Manual merge, similarity not relevant
        };

        const results = await mergeMerchants([candidate]);

        if (results.length === 0) {
            throw error(500, 'Merge failed');
        }

        return json({
            success: true,
            result: results[0]
        });
    } catch (err: any) {
        console.error('Error merging merchants:', err);
        if (err.status) throw err;
        throw error(500, err.message || 'Failed to merge merchants');
    }
};
