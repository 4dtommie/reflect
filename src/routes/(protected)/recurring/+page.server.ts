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

    // Fetch monthly spending data for the chart (last 12 months) - split by recurring, variable, remaining, and savings
    // Also calculate monthly income
    let monthlySpending: { month: string; recurring: number; variable: number; remaining: number; savings: number; income: number }[] = [];
    if (locals.user) {
        const now = new Date();
        const twelveMonthsAgo = new Date(now);
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        
        // Find Savings & Investments category (try multiple possible names)
        const savingsCategory = await db.categories.findFirst({
            where: {
                OR: [
                    { name: 'Savings & Investments' },
                    { name: 'Sparen & beleggen' },
                    { name: { contains: 'Savings', mode: 'insensitive' } },
                    { name: { contains: 'Sparen', mode: 'insensitive' } }
                ],
                group: 'financial'
            },
            select: {
                id: true,
                name: true
            }
        });
        
        const savingsCategoryId = savingsCategory?.id;
        if (savingsCategory) {
            console.log(`[Monthly Spending] Found savings category: ${savingsCategory.name} (ID: ${savingsCategoryId})`);
        } else {
            console.log(`[Monthly Spending] Savings & Investments category not found`);
        }
        
        // Get all debit transactions (expenses) from last 12 months with category info
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

        // Get all credit transactions (income) from last 12 months
        const incomeTransactions = await db.transactions.findMany({
            where: {
                user_id: locals.user.id,
                is_debit: false,
                date: {
                    gte: twelveMonthsAgo
                }
            },
            include: {
                categories: true
            }
        });

        // Get variable spending categories from two sources:
        // 1. Categories marked as variable spending in DB
        const variableCategories = await db.categories.findMany({
            where: {
                is_variable_spending: true
            },
            select: {
                id: true
            }
        });
        const variableCategoryIds = new Set(variableCategories.map(c => c.id));
        
        // 2. Categories from detected variable spending patterns (more accurate - includes detected patterns)
        if (variableData.patterns && Array.isArray(variableData.patterns)) {
            for (const pattern of variableData.patterns) {
                if (pattern.categoryId) {
                    variableCategoryIds.add(pattern.categoryId);
                }
            }
        }
        
        console.log(`[Monthly Spending] Variable category IDs: ${Array.from(variableCategoryIds).join(', ')}`);

        // Group expenses by month and type
        const monthMap = new Map<string, { recurring: number; variable: number; remaining: number; savings: number; income: number; total: number }>();
        
        // Process expense transactions
        for (const tx of transactions) {
            const date = new Date(tx.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const current = monthMap.get(monthKey) || { recurring: 0, variable: 0, remaining: 0, savings: 0, income: 0, total: 0 };
            const amount = Math.abs(Number(tx.amount));
            
            // Track total for all expenses
            current.total += amount;
            
            // Check if this is a savings transaction first (highest priority)
            if (savingsCategoryId && tx.category_id === savingsCategoryId) {
                current.savings += amount;
            }
            // Recurring: transactions linked to a recurring transaction (fixed subscriptions)
            else if (tx.recurring_transaction_id || tx.recurring_transaction) {
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

        // Process income transactions
        for (const tx of incomeTransactions) {
            const date = new Date(tx.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const current = monthMap.get(monthKey) || { recurring: 0, variable: 0, remaining: 0, savings: 0, income: 0, total: 0 };
            const amount = Math.abs(Number(tx.amount));
            
            current.income += amount;
            monthMap.set(monthKey, current);
        }

        // Convert to array and sort by month, include all categories including income
        monthlySpending = Array.from(monthMap.entries())
            .map(([month, data]) => ({ 
                month, 
                recurring: data.recurring, 
                variable: data.variable, 
                remaining: data.remaining,
                savings: data.savings,
                income: data.income
            }))
            .sort((a, b) => a.month.localeCompare(b.month));
        
        // Debug logging
        if (monthlySpending.length > 0) {
            const avgVariable = monthlySpending.reduce((sum, m) => sum + m.variable, 0) / monthlySpending.length;
            const avgRecurring = monthlySpending.reduce((sum, m) => sum + m.recurring, 0) / monthlySpending.length;
            const avgRemaining = monthlySpending.reduce((sum, m) => sum + m.remaining, 0) / monthlySpending.length;
            const avgSavings = monthlySpending.reduce((sum, m) => sum + m.savings, 0) / monthlySpending.length;
            console.log(`[Monthly Spending] Averages - Recurring: €${avgRecurring.toFixed(2)}, Variable: €${avgVariable.toFixed(2)}, Remaining: €${avgRemaining.toFixed(2)}, Savings: €${avgSavings.toFixed(2)}`);
        }
    }

    // Calculate monthly savings average for widgets
    const monthlySavingsAverage = monthlySpending.length > 0
        ? monthlySpending.reduce((sum, m) => sum + m.savings, 0) / monthlySpending.length
        : 0;

    return {
        ...recurringData,
        variableSpending: variableData.patterns || [],
        variableStats: variableData.stats || null,
        monthlySpending,
        monthlySavingsAverage
    };
};
