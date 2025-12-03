import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ fetch, locals }) => {
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

    // Fetch monthly spending data for the chart (last 12 months) - split by recurring, variable, and remaining
    let monthlySpending: { month: string; recurring: number; variable: number; remaining: number }[] = [];
    if (locals.user) {
        const now = new Date();
        const twelveMonthsAgo = new Date(now);
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        
        // Get all transactions from last 12 months with category info
        const transactions = await db.transactions.findMany({
            where: {
                user_id: locals.user.id,
                is_debit: true,
                date: {
                    gte: twelveMonthsAgo
                }
            },
            include: {
                categories: true,
                recurring_transaction: true
            }
        });

        // Get variable spending categories
        const variableCategories = await db.categories.findMany({
            where: {
                is_variable_spending: true
            },
            select: {
                id: true
            }
        });
        const variableCategoryIds = new Set(variableCategories.map(c => c.id));

        // Group by month and type
        const monthMap = new Map<string, { recurring: number; variable: number; remaining: number; total: number }>();
        for (const tx of transactions) {
            const date = new Date(tx.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const current = monthMap.get(monthKey) || { recurring: 0, variable: 0, remaining: 0, total: 0 };
            const amount = Math.abs(Number(tx.amount));
            
            // Track total for all expenses
            current.total += amount;
            
            // Categorize each transaction
            // Recurring: transactions linked to a recurring transaction (fixed subscriptions)
            if (tx.recurring_transaction_id || tx.recurring_transaction) {
                current.recurring += amount;
            } 
            // Variable: transactions in variable spending categories (groceries, coffee, etc.)
            else if (tx.category_id && variableCategoryIds.has(tx.category_id)) {
                current.variable += amount;
            }
            // Remaining: everything else (one-off expenses, discretionary spending, uncategorized, etc.)
            else {
                current.remaining += amount;
            }
            
            monthMap.set(monthKey, current);
        }

        // Convert to array and sort by month, only include the three categories
        monthlySpending = Array.from(monthMap.entries())
            .map(([month, data]) => ({ 
                month, 
                recurring: data.recurring, 
                variable: data.variable, 
                remaining: data.remaining 
            }))
            .sort((a, b) => a.month.localeCompare(b.month));
    }

    return {
        ...recurringData,
        variableSpending: variableData.patterns || [],
        variableStats: variableData.stats || null,
        monthlySpending
    };
};
