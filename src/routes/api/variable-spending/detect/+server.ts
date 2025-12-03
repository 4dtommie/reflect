import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { VariableSpendingService } from '$lib/server/recurring/variableSpendingService';

/**
 * POST: Run fresh variable spending detection (not from DB)
 */
export const POST: RequestHandler = async ({ locals }) => {
    if (!locals.user) {
        throw error(401, 'Not authenticated');
    }

    try {
        const service = new VariableSpendingService();
        const patterns = await service.detectVariableSpending(locals.user.id);

        // Calculate summary stats
        const totalMonthlyAverage = patterns.reduce((sum, p) => sum + p.monthlyAverage, 0);
        const totalVisitsPerMonth = patterns.reduce((sum, p) => sum + p.visitsPerMonth, 0);
        const totalTransactions = patterns.reduce((sum, p) => sum + p.totalTransactions, 0);

        // Serialize patterns (convert dates for JSON)
        const serializedPatterns = patterns.map(p => ({
            ...p,
            firstTransaction: p.firstTransaction.toISOString(),
            lastTransaction: p.lastTransaction.toISOString(),
            recentTransactions: p.recentTransactions.map(tx => ({
                ...tx,
                amount: Number(tx.amount),
                date: tx.date.toISOString()
            }))
        }));

        return json({
            patterns: serializedPatterns,
            stats: {
                totalCategories: patterns.length,
                totalMonthlyAverage: Math.round(totalMonthlyAverage * 100) / 100,
                totalVisitsPerMonth: Math.round(totalVisitsPerMonth * 10) / 10,
                totalTransactions
            }
        });
    } catch (err) {
        console.error('Error detecting variable spending patterns:', err);
        throw error(500, 'Failed to detect variable spending patterns');
    }
};

