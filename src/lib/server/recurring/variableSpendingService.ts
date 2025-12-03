import { db } from '$lib/server/db';
import type { transactions, categories } from '@prisma/client';

// Cache for variable spending category names (fetched from DB)
let variableCategoryNamesCache: Set<string> | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch categories marked as variable spending from the database
 */
async function getVariableSpendingCategoryNames(): Promise<Set<string>> {
    const now = Date.now();
    
    // Return cached value if still valid
    if (variableCategoryNamesCache && (now - cacheTimestamp) < CACHE_TTL_MS) {
        return variableCategoryNamesCache;
    }
    
    // Fetch from database
    const variableCategories = await db.categories.findMany({
        where: {
            is_variable_spending: true
        },
        select: {
            name: true
        }
    });
    
    variableCategoryNamesCache = new Set(variableCategories.map(c => c.name));
    cacheTimestamp = now;
    
    console.log(`[VariableSpending] Loaded ${variableCategoryNamesCache.size} variable spending categories from DB: ${Array.from(variableCategoryNamesCache).join(', ')}`);
    
    return variableCategoryNamesCache;
}

// Top merchant within a category
export interface TopMerchant {
    merchantId: number;
    merchantName: string;
    transactionCount: number;
    totalSpent: number;
    averageAmount: number;
}

// Category-level spending pattern
export interface CategorySpendingPattern {
    categoryName: string;
    categoryColor: string | null;
    categoryIcon: string | null;
    // Totals
    totalTransactions: number;
    totalSpent: number;
    // Monthly metrics
    monthlyAverage: number;
    visitsPerMonth: number;
    averagePerVisit: number;
    // Range
    minAmount: number;
    maxAmount: number;
    // Time span
    firstTransaction: Date;
    lastTransaction: Date;
    daysCovered: number;
    monthsCovered: number;
    // Merchant breakdown
    uniqueMerchants: number;
    topMerchants: TopMerchant[];
    // Recent transactions for display
    recentTransactions: transactions[];
}

export class VariableSpendingService {
    /**
     * Detect variable spending patterns grouped by CATEGORY.
     * This gives insights like "You spend €150/month on groceries" rather than per-merchant.
     */
    async detectVariableSpending(userId: number): Promise<CategorySpendingPattern[]> {
        // Get variable spending categories from database
        const variableCategoryNames = await getVariableSpendingCategoryNames();
        
        // Calculate date range: last 12 months
        const now = new Date();
        const twelveMonthsAgo = new Date(now);
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        
        // Fetch transactions from last 12 months only
        const allTransactions = await db.transactions.findMany({
            where: {
                user_id: userId,
                is_debit: true, // Only expenses
                date: {
                    gte: twelveMonthsAgo
                }
            },
            include: {
                categories: true
            },
            orderBy: {
                date: 'desc'
            }
        });

        console.log(`[VariableSpending] Analyzing ${allTransactions.length} expense transactions`);

        // Filter to only variable spending categories (from DB)
        const variableTransactions = allTransactions.filter(tx => {
            const categoryName = tx.categories?.name;
            return categoryName && variableCategoryNames.has(categoryName);
        });

        console.log(`[VariableSpending] Found ${variableTransactions.length} transactions in variable spending categories`);

        // Group by CATEGORY (not merchant!)
        const categoryGroups = new Map<string, (transactions & { categories: categories | null })[]>();

        for (const tx of variableTransactions) {
            const categoryName = tx.categories?.name;
            if (!categoryName) continue;

            const existing = categoryGroups.get(categoryName) || [];
            existing.push(tx);
            categoryGroups.set(categoryName, existing);
        }

        console.log(`[VariableSpending] Grouped into ${categoryGroups.size} categories`);

        // Analyze each category
        const patterns: CategorySpendingPattern[] = [];

        for (const [categoryName, txs] of categoryGroups) {
            // Need at least 3 transactions total in the category
            if (txs.length < 3) {
                console.log(`[VariableSpending] Skipping "${categoryName}": only ${txs.length} txs (need 3+)`);
                continue;
            }

            // Sort by date
            const sortedDesc = [...txs].sort((a, b) => b.date.getTime() - a.date.getTime());
            const sortedAsc = [...txs].sort((a, b) => a.date.getTime() - b.date.getTime());

            const firstTx = sortedAsc[0];
            const lastTx = sortedAsc[sortedAsc.length - 1];
            
            // Calculate months covered based on actual transaction span, but cap at 12 months
            const daysCovered = Math.max(1, Math.ceil((lastTx.date.getTime() - firstTx.date.getTime()) / (1000 * 60 * 60 * 24)));
            const actualMonthsCovered = daysCovered / 30;
            // Use actual months if less than 12, otherwise use 12 (rolling window)
            const monthsCovered = Math.min(12, Math.max(1, actualMonthsCovered));

            // Check recency - should have activity in last 90 days for category-level
            const daysSinceLast = (Date.now() - lastTx.date.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceLast > 90) {
                console.log(`[VariableSpending] Skipping "${categoryName}": last tx ${Math.round(daysSinceLast)} days ago (max 90)`);
                continue;
            }

            // Calculate totals
            const amounts = txs.map(tx => Math.abs(Number(tx.amount)));
            const totalSpent = amounts.reduce((sum, a) => sum + a, 0);
            const monthlyAverage = totalSpent / monthsCovered;
            const visitsPerMonth = txs.length / monthsCovered;
            const averagePerVisit = totalSpent / txs.length;
            const minAmount = Math.min(...amounts);
            const maxAmount = Math.max(...amounts);

            // Calculate top merchants within this category
            const merchantMap = new Map<number, { name: string; txs: transactions[] }>();
            for (const tx of txs) {
                if (!tx.merchant_id) continue;
                const existing = merchantMap.get(tx.merchant_id) || {
                    name: tx.cleaned_merchant_name || tx.merchantName || 'Unknown',
                    txs: []
                };
                existing.txs.push(tx);
                merchantMap.set(tx.merchant_id, existing);
            }

            const topMerchants: TopMerchant[] = Array.from(merchantMap.entries())
                .map(([merchantId, data]) => {
                    const merchantTotal = data.txs.reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);
                    return {
                        merchantId,
                        merchantName: data.name,
                        transactionCount: data.txs.length,
                        totalSpent: Math.round(merchantTotal * 100) / 100,
                        averageAmount: Math.round((merchantTotal / data.txs.length) * 100) / 100
                    };
                })
                .sort((a, b) => b.totalSpent - a.totalSpent)
                .slice(0, 5); // Top 5 merchants

            const uniqueMerchants = merchantMap.size;

            // Get category color/icon from first transaction
            const categoryColor = firstTx.categories?.color || null;
            const categoryIcon = firstTx.categories?.icon || null;

            console.log(`[VariableSpending] ✓ "${categoryName}": ${txs.length} txs, €${monthlyAverage.toFixed(2)}/mo, ${visitsPerMonth.toFixed(1)} visits/mo, ${uniqueMerchants} merchants`);

            patterns.push({
                categoryName,
                categoryColor,
                categoryIcon,
                totalTransactions: txs.length,
                totalSpent: Math.round(totalSpent * 100) / 100,
                monthlyAverage: Math.round(monthlyAverage * 100) / 100,
                visitsPerMonth: Math.round(visitsPerMonth * 10) / 10,
                averagePerVisit: Math.round(averagePerVisit * 100) / 100,
                minAmount: Math.round(minAmount * 100) / 100,
                maxAmount: Math.round(maxAmount * 100) / 100,
                firstTransaction: firstTx.date,
                lastTransaction: lastTx.date,
                daysCovered,
                monthsCovered: Math.round(monthsCovered * 10) / 10,
                uniqueMerchants,
                topMerchants,
                recentTransactions: sortedDesc.slice(0, 10)
            });
        }

        // Sort by monthly average (highest first)
        patterns.sort((a, b) => b.monthlyAverage - a.monthlyAverage);

        // Summary
        const totalMonthly = patterns.reduce((sum, p) => sum + p.monthlyAverage, 0);
        console.log(`\n🛒 VARIABLE SPENDING BY CATEGORY:`);
        console.log(`   Total: €${totalMonthly.toFixed(2)}/month across ${patterns.length} categories`);
        patterns.forEach(p => {
            console.log(`   ${this.getCategoryEmoji(p.categoryName)} ${p.categoryName}: €${p.monthlyAverage.toFixed(2)}/mo (${p.visitsPerMonth} visits/mo, ${p.uniqueMerchants} places)`);
            if (p.topMerchants.length > 0) {
                console.log(`      Top: ${p.topMerchants.slice(0, 3).map(m => `${m.merchantName} (€${m.totalSpent})`).join(', ')}`);
            }
        });
        console.log(``);

        return patterns;
    }

    private getCategoryEmoji(category: string): string {
        const emojiMap: Record<string, string> = {
            'Supermarkt': '🛒',
            'Slager': '🥩',
            'Bakker': '🥖',
            'Speciaalzaken': '🏪',
            'Koffie': '☕',
            'Lunch': '🥪',
            'Uit eten': '🍽️',
            'Bestellen': '📦',
            'Uitgaan/bars': '🍻',
            'Brandstof': '⛽',
            'Openbaar vervoer': '🚌',
            'Parkeren': '🅿️',
            'Taxi & deelvervoer': '🚕',
            'Persoonlijke verzorging': '💇',
            'Huisdierenverzorging': '🐾'
        };
        return emojiMap[category] || '📊';
    }

    /**
     * Get summary statistics for variable spending
     */
    async getSummary(userId: number): Promise<{
        totalMonthlyAverage: number;
        totalCategories: number;
        patterns: CategorySpendingPattern[];
    }> {
        const patterns = await this.detectVariableSpending(userId);

        return {
            totalMonthlyAverage: patterns.reduce((sum, p) => sum + p.monthlyAverage, 0),
            totalCategories: patterns.length,
            patterns
        };
    }
}
