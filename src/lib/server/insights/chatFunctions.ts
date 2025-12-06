import type { ChatCompletionTool } from 'openai/resources/chat/completions';
import { db } from '$lib/server/db';

export const MAX_FUNCTION_ROUNDS = 3;

/**
 * OpenAI function definitions for Penny chat
 */
export const CHAT_FUNCTIONS: ChatCompletionTool[] = [
    {
        type: 'function',
        function: {
            name: 'get_spending',
            description: 'Get spending totals filtered by category, month, merchant, or time period',
            parameters: {
                type: 'object',
                properties: {
                    category: {
                        type: 'string',
                        description: "Category name, e.g. 'Groceries', 'Transport'"
                    },
                    month: {
                        type: 'string',
                        description: "Month as YYYY-MM or 'current', 'last'"
                    },
                    year: {
                        type: 'integer',
                        description: 'Year, e.g. 2024'
                    },
                    merchant: {
                        type: 'string',
                        description: 'Merchant name'
                    },
                    is_income: {
                        type: 'boolean',
                        description: 'True for income, false for expenses (default)'
                    }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_transactions',
            description: 'Get a list of transactions with optional filters. Returns up to 10 results.',
            parameters: {
                type: 'object',
                properties: {
                    category: { type: 'string', description: 'Category name' },
                    merchant: { type: 'string', description: 'Merchant name' },
                    month: { type: 'string', description: 'Month as YYYY-MM or current/last' },
                    min_amount: { type: 'number', description: 'Minimum amount' },
                    max_amount: { type: 'number', description: 'Maximum amount' },
                    limit: { type: 'integer', description: 'Max results (default 5, max 10)' }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_stats',
            description: 'Get summary statistics: top categories, spending trends, comparisons',
            parameters: {
                type: 'object',
                properties: {
                    stat_type: {
                        type: 'string',
                        enum: ['top_categories', 'monthly_comparison', 'category_breakdown', 'merchant_breakdown'],
                        description: 'Type of statistics to retrieve'
                    },
                    month: { type: 'string', description: 'Month for stats (YYYY-MM or current/last)' },
                    limit: { type: 'integer', description: 'How many items to return (default 5)' }
                },
                required: ['stat_type']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'search_transactions',
            description: 'Search transactions by description or merchant name',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'Search term' },
                    limit: { type: 'integer', description: 'Max results (default 5)' }
                },
                required: ['query']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_categories',
            description: 'Get list of all available category names. Call this first if unsure about exact category names.',
            parameters: { type: 'object', properties: {} }
        }
    }
];

/**
 * Parse month string to date range
 * Supports: 'current', 'last', 'previous', '-2' (2 months ago), 'YYYY-MM'
 */
function parseMonthRange(month?: string): { start: Date; end: Date } {
    const now = new Date();
    let year = now.getFullYear();
    let monthNum = now.getMonth();

    if (!month || month === 'current') {
        // Current month
    } else if (month === 'last' || month === 'previous') {
        monthNum -= 1;
        if (monthNum < 0) {
            monthNum = 11;
            year -= 1;
        }
    } else if (/^-\d+$/.test(month)) {
        // Relative months: '-2' = 2 months ago
        const offset = parseInt(month, 10);
        monthNum += offset;
        while (monthNum < 0) {
            monthNum += 12;
            year -= 1;
        }
    } else if (/^\d{4}-\d{2}$/.test(month)) {
        const [y, m] = month.split('-').map(Number);
        year = y;
        monthNum = m - 1;
    }

    const start = new Date(year, monthNum, 1);
    const end = new Date(year, monthNum + 1, 0, 23, 59, 59);
    return { start, end };
}

/**
 * Execute a chat function and return the result
 */
export async function executeFunction(
    name: string,
    args: Record<string, unknown>,
    userId: number
): Promise<unknown> {
    console.log(`[Penny Function] ${name}:`, JSON.stringify(args));

    switch (name) {
        case 'get_spending':
            return executeGetSpending(userId, args);
        case 'get_transactions':
            return executeGetTransactions(userId, args);
        case 'get_stats':
            return executeGetStats(userId, args);
        case 'search_transactions':
            return executeSearchTransactions(userId, args);
        case 'get_categories':
            return executeGetCategories(userId);
        default:
            return { error: `Unknown function: ${name}` };
    }
}

/**
 * get_spending - Get spending totals with filters
 */
async function executeGetSpending(
    userId: number,
    args: Record<string, unknown>
): Promise<unknown> {
    const { category, month, merchant, is_income } = args as {
        category?: string;
        month?: string;
        merchant?: string;
        is_income?: boolean;
    };

    const { start, end } = parseMonthRange(month);
    const isDebit = is_income === true ? false : true;

    console.log(`[get_spending] category="${category}" month="${month}" range=${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}`);

    // Build where clause
    const where: any = {
        user_id: userId,
        is_debit: isDebit,
        date: { gte: start, lte: end }
    };

    if (category) {
        // Use contains for flexible matching
        where.categories = { name: { contains: category, mode: 'insensitive' } };
    }

    if (merchant) {
        where.OR = [
            { merchantName: { contains: merchant, mode: 'insensitive' } },
            { merchants: { name: { contains: merchant, mode: 'insensitive' } } }
        ];
    }

    const transactions = await db.transactions.findMany({
        where,
        select: { amount: true }
    });

    const total = transactions.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
    const count = transactions.length;
    const average = count > 0 ? total / count : 0;

    const periodLabel = month === 'last' ? 'last month' : month && month !== 'current' ? month : 'this month';

    // If no results for a category filter, provide helpful hints
    if (category && count === 0) {
        const availableCategories = await db.categories.findMany({
            select: { name: true },
            take: 15
        });
        return {
            total: 0,
            count: 0,
            period: periodLabel,
            message: `No transactions found for category "${category}".`,
            available_categories: availableCategories.map(c => c.name)
        };
    }

    return {
        total: Math.round(total * 100) / 100,
        count,
        average: Math.round(average * 100) / 100,
        period: periodLabel,
        filters: { category, merchant, is_income }
    };
}

/**
 * get_transactions - List transactions with filters
 */
async function executeGetTransactions(
    userId: number,
    args: Record<string, unknown>
): Promise<unknown> {
    const { category, merchant, month, min_amount, max_amount, limit } = args as {
        category?: string;
        merchant?: string;
        month?: string;
        min_amount?: number;
        max_amount?: number;
        limit?: number;
    };

    const take = Math.min(limit || 5, 10);
    const { start, end } = parseMonthRange(month);

    const where: any = {
        user_id: userId,
        date: { gte: start, lte: end }
    };

    if (category) {
        where.categories = { name: { equals: category, mode: 'insensitive' } };
    }

    if (merchant) {
        where.OR = [
            { merchantName: { contains: merchant, mode: 'insensitive' } },
            { merchants: { name: { contains: merchant, mode: 'insensitive' } } }
        ];
    }

    if (min_amount !== undefined) {
        where.amount = { ...where.amount, gte: min_amount };
    }

    if (max_amount !== undefined) {
        where.amount = { ...where.amount, lte: max_amount };
    }

    const [transactions, totalCount] = await Promise.all([
        db.transactions.findMany({
            where,
            select: {
                id: true,
                date: true,
                merchantName: true,
                amount: true,
                is_debit: true,
                categories: { select: { name: true } }
            },
            orderBy: { date: 'desc' },
            take
        }),
        db.transactions.count({ where })
    ]);

    return {
        transactions: transactions.map((t) => ({
            id: t.id,
            date: t.date.toISOString().split('T')[0],
            merchant: t.merchantName,
            amount: Math.abs(Number(t.amount)),
            is_expense: t.is_debit,
            category: t.categories?.name || 'Uncategorized'
        })),
        total_count: totalCount,
        showing: transactions.length
    };
}

/**
 * get_stats - Get summary statistics
 */
async function executeGetStats(
    userId: number,
    args: Record<string, unknown>
): Promise<unknown> {
    const { stat_type, month, limit } = args as {
        stat_type: string;
        month?: string;
        limit?: number;
    };

    const take = Math.min(limit || 5, 10);
    const { start, end } = parseMonthRange(month);

    switch (stat_type) {
        case 'top_categories': {
            const result = await db.transactions.groupBy({
                by: ['category_id'],
                where: {
                    user_id: userId,
                    is_debit: true,
                    date: { gte: start, lte: end },
                    category_id: { not: null }
                },
                _sum: { amount: true },
                orderBy: { _sum: { amount: 'desc' } },
                take
            });

            const categoryIds = result.map((r) => r.category_id).filter(Boolean) as number[];
            const categories = await db.categories.findMany({
                where: { id: { in: categoryIds } },
                select: { id: true, name: true }
            });

            const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

            return {
                categories: result.map((r) => ({
                    name: categoryMap.get(r.category_id!) || 'Unknown',
                    total: Math.round(Math.abs(Number(r._sum.amount)) * 100) / 100
                }))
            };
        }

        case 'monthly_comparison': {
            const lastMonth = parseMonthRange('last');
            const currentMonth = parseMonthRange('current');

            const [lastSpending, currentSpending] = await Promise.all([
                db.transactions.aggregate({
                    where: { user_id: userId, is_debit: true, date: { gte: lastMonth.start, lte: lastMonth.end } },
                    _sum: { amount: true }
                }),
                db.transactions.aggregate({
                    where: { user_id: userId, is_debit: true, date: { gte: currentMonth.start, lte: currentMonth.end } },
                    _sum: { amount: true }
                })
            ]);

            const last = Math.abs(Number(lastSpending._sum.amount) || 0);
            const current = Math.abs(Number(currentSpending._sum.amount) || 0);
            const changePercent = last > 0 ? ((current - last) / last) * 100 : 0;

            return {
                last_month: Math.round(last * 100) / 100,
                current_month: Math.round(current * 100) / 100,
                change_percent: Math.round(changePercent),
                direction: changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'same'
            };
        }

        case 'category_breakdown':
        case 'merchant_breakdown': {
            const groupBy = stat_type === 'category_breakdown' ? 'category_id' : 'merchant_id';

            const result = await db.transactions.groupBy({
                by: [groupBy],
                where: {
                    user_id: userId,
                    is_debit: true,
                    date: { gte: start, lte: end },
                    [groupBy]: { not: null }
                },
                _sum: { amount: true },
                _count: true,
                orderBy: { _sum: { amount: 'desc' } },
                take
            });

            if (stat_type === 'category_breakdown') {
                const ids = result.map((r) => (r as any).category_id).filter(Boolean);
                const items = await db.categories.findMany({
                    where: { id: { in: ids } },
                    select: { id: true, name: true }
                });
                const nameMap = new Map(items.map((c) => [c.id, c.name]));

                return {
                    breakdown: result.map((r) => ({
                        name: nameMap.get((r as any).category_id) || 'Unknown',
                        total: Math.round(Math.abs(Number(r._sum.amount)) * 100) / 100,
                        count: r._count
                    }))
                };
            } else {
                const ids = result.map((r) => (r as any).merchant_id).filter(Boolean);
                const items = await db.merchants.findMany({
                    where: { id: { in: ids } },
                    select: { id: true, name: true }
                });
                const nameMap = new Map(items.map((m) => [m.id, m.name]));

                return {
                    breakdown: result.map((r) => ({
                        name: nameMap.get((r as any).merchant_id) || 'Unknown',
                        total: Math.round(Math.abs(Number(r._sum.amount)) * 100) / 100,
                        count: r._count
                    }))
                };
            }
        }

        default:
            return { error: `Unknown stat_type: ${stat_type}` };
    }
}

/**
 * search_transactions - Free-text search
 */
async function executeSearchTransactions(
    userId: number,
    args: Record<string, unknown>
): Promise<unknown> {
    const { query, limit } = args as { query: string; limit?: number };
    const take = Math.min(limit || 5, 10);

    const transactions = await db.transactions.findMany({
        where: {
            user_id: userId,
            OR: [
                { merchantName: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
                { merchants: { name: { contains: query, mode: 'insensitive' } } }
            ]
        },
        select: {
            id: true,
            date: true,
            merchantName: true,
            amount: true,
            is_debit: true,
            categories: { select: { name: true } }
        },
        orderBy: { date: 'desc' },
        take
    });

    return {
        transactions: transactions.map((t) => ({
            id: t.id,
            date: t.date.toISOString().split('T')[0],
            merchant: t.merchantName,
            amount: Math.abs(Number(t.amount)),
            is_expense: t.is_debit,
            category: t.categories?.name || 'Uncategorized'
        })),
        total_found: transactions.length,
        query
    };
}

/**
 * get_categories - Get category names that have transactions
 */
async function executeGetCategories(userId: number): Promise<unknown> {
    // Get categories that are actually used in transactions
    const categoriesWithCounts = await db.categories.findMany({
        where: {
            transactions: {
                some: { user_id: userId }
            }
        },
        select: {
            name: true,
            _count: { select: { transactions: true } }
        },
        orderBy: { name: 'asc' }
    });

    // Sort by transaction count (most used first) to help AI pick the right one
    const sorted = categoriesWithCounts.sort((a, b) => b._count.transactions - a._count.transactions);

    return {
        categories: sorted.map(c => `${c.name} (${c._count.transactions})`),
        note: "Categories sorted by usage. Use the EXACT category name (without the count) when querying."
    };
}
