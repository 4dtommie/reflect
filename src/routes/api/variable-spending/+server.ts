import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { VariableSpendingService } from '$lib/server/recurring/variableSpendingService';
import type { CategorySpendingPattern } from '$lib/server/recurring/variableSpendingService';

/**
 * GET: Fetch saved variable spending patterns from database
 */
export const GET: RequestHandler = async ({ locals }) => {
    if (!locals.user) {
        throw error(401, 'Not authenticated');
    }

    try {
        console.log(`[VariableSpending GET] Fetching patterns for user ${locals.user.id}`);
        
        const savedPatterns = await db.variableSpendingPattern.findMany({
            where: {
                user_id: locals.user.id,
                status: 'active'
            },
            include: {
                categories: true
            },
            orderBy: {
                monthly_average: 'desc'
            }
        });

        console.log(`[VariableSpending GET] Found ${savedPatterns.length} patterns`);

        // Calculate stats
        const totalMonthlyAverage = savedPatterns.reduce((sum, p) => sum + Number(p.monthly_average), 0);
        const totalVisitsPerMonth = savedPatterns.reduce((sum, p) => sum + Number(p.visits_per_month), 0);
        const totalTransactions = savedPatterns.reduce((sum, p) => sum + p.total_transactions, 0);

        // Serialize for JSON
        const patterns = savedPatterns.map(p => ({
            id: p.id,
            categoryName: p.category_name,
            categoryId: p.category_id,
            categoryColor: p.categories?.color,
            categoryIcon: p.categories?.icon,
            monthlyAverage: Number(p.monthly_average),
            visitsPerMonth: Number(p.visits_per_month),
            averagePerVisit: Number(p.average_per_visit),
            totalSpent: Number(p.total_spent),
            totalTransactions: p.total_transactions,
            uniqueMerchants: p.unique_merchants,
            topMerchants: p.top_merchants,
            minAmount: Number(p.min_amount),
            maxAmount: Number(p.max_amount),
            firstTransaction: p.first_transaction.toISOString(),
            lastTransaction: p.last_transaction.toISOString(),
            status: p.status,
            updatedAt: p.updated_at.toISOString()
        }));

        return json({
            patterns,
            stats: {
                totalCategories: patterns.length,
                totalMonthlyAverage: Math.round(totalMonthlyAverage * 100) / 100,
                totalVisitsPerMonth: Math.round(totalVisitsPerMonth * 10) / 10,
                totalTransactions
            }
        });
    } catch (err) {
        console.error('Error fetching variable spending patterns:', err);
        throw error(500, 'Failed to fetch variable spending patterns');
    }
};

/**
 * POST: Save detected variable spending patterns to database
 * Body: { patterns: CategorySpendingPattern[] }
 */
export const POST: RequestHandler = async ({ locals, request }) => {
    if (!locals.user) {
        throw error(401, 'Not authenticated');
    }

    try {
        const body = await request.json();
        const patterns: CategorySpendingPattern[] = body.patterns;

        console.log(`[VariableSpending POST] Received ${patterns?.length || 0} patterns to save for user ${locals.user.id}`);

        if (!patterns || !Array.isArray(patterns)) {
            throw error(400, 'Invalid request: patterns array required');
        }

        // Get category IDs by name
        const categoryNames = patterns.map(p => p.categoryName);
        console.log(`[VariableSpending POST] Categories: ${categoryNames.join(', ')}`);
        const categories = await db.categories.findMany({
            where: {
                name: { in: categoryNames }
            },
            select: {
                id: true,
                name: true
            }
        });

        const categoryMap = new Map(categories.map(c => [c.name, c.id]));

        // Upsert each pattern
        const savedPatterns = [];
        for (const pattern of patterns) {
            const categoryId = categoryMap.get(pattern.categoryName);
            if (!categoryId) {
                console.warn(`Category not found: ${pattern.categoryName}`);
                continue;
            }

            // Prepare top merchants data (strip unnecessary fields)
            const topMerchants = pattern.topMerchants?.slice(0, 5).map(m => ({
                merchantName: m.merchantName,
                totalSpent: m.totalSpent,
                transactionCount: m.transactionCount
            }));

            const saved = await db.variableSpendingPattern.upsert({
                where: {
                    user_id_category_id: {
                        user_id: locals.user.id,
                        category_id: categoryId
                    }
                },
                update: {
                    monthly_average: pattern.monthlyAverage,
                    visits_per_month: pattern.visitsPerMonth,
                    average_per_visit: pattern.averagePerVisit,
                    total_spent: pattern.totalSpent,
                    total_transactions: pattern.totalTransactions,
                    unique_merchants: pattern.uniqueMerchants,
                    top_merchants: topMerchants,
                    min_amount: pattern.minAmount,
                    max_amount: pattern.maxAmount,
                    first_transaction: pattern.firstTransaction,
                    last_transaction: pattern.lastTransaction,
                    status: 'active',
                    updated_at: new Date()
                },
                create: {
                    user_id: locals.user.id,
                    category_id: categoryId,
                    category_name: pattern.categoryName,
                    monthly_average: pattern.monthlyAverage,
                    visits_per_month: pattern.visitsPerMonth,
                    average_per_visit: pattern.averagePerVisit,
                    total_spent: pattern.totalSpent,
                    total_transactions: pattern.totalTransactions,
                    unique_merchants: pattern.uniqueMerchants,
                    top_merchants: topMerchants,
                    min_amount: pattern.minAmount,
                    max_amount: pattern.maxAmount,
                    first_transaction: pattern.firstTransaction,
                    last_transaction: pattern.lastTransaction,
                    status: 'active'
                }
            });

            savedPatterns.push(saved);
            console.log(`[VariableSpending POST] Saved pattern for ${pattern.categoryName} (id: ${saved.id})`);
        }

        console.log(`[VariableSpending POST] Successfully saved ${savedPatterns.length} patterns`);

        return json({
            success: true,
            savedCount: savedPatterns.length,
            message: `Saved ${savedPatterns.length} variable spending patterns`
        });
    } catch (err) {
        console.error('Error saving variable spending patterns:', err);
        throw error(500, 'Failed to save variable spending patterns');
    }
};

/**
 * DELETE: Remove all variable spending patterns for user
 */
export const DELETE: RequestHandler = async ({ locals }) => {
    if (!locals.user) {
        throw error(401, 'Not authenticated');
    }

    try {
        const result = await db.variableSpendingPattern.deleteMany({
            where: {
                user_id: locals.user.id
            }
        });

        return json({
            success: true,
            deletedCount: result.count
        });
    } catch (err) {
        console.error('Error deleting variable spending patterns:', err);
        throw error(500, 'Failed to delete variable spending patterns');
    }
};
