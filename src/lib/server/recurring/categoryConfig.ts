// Category-based recurring detection configuration
// Maps categories to their recurring detection behavior
//
// NOTE: Variable spending categories are now stored in the DATABASE via the
// `is_variable_spending` field on the categories table. VariableSpendingService
// reads from DB. RecurringDetectionService skips these categories.
//
// The `variable_recurring` list below is kept as a FALLBACK for synchronous lookups.
// To modify which categories are variable spending, update the database directly
// or modify seed.ts for new installations.

import { db } from '$lib/server/db';

// Cache for variable spending category names from DB
let variableCategoriesCache: Set<string> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch variable spending category names from database
 */
export async function getVariableSpendingCategories(): Promise<Set<string>> {
    const now = Date.now();
    
    if (variableCategoriesCache && (now - cacheTimestamp) < CACHE_TTL_MS) {
        return variableCategoriesCache;
    }
    
    const categories = await db.categories.findMany({
        where: { is_variable_spending: true },
        select: { name: true }
    });
    
    variableCategoriesCache = new Set(categories.map(c => c.name));
    cacheTimestamp = now;
    
    return variableCategoriesCache;
}

/**
 * Check if a category is marked as variable spending (async - uses DB)
 */
export async function isVariableSpendingCategory(categoryName: string | null): Promise<boolean> {
    if (!categoryName) return false;
    const variableCategories = await getVariableSpendingCategories();
    return variableCategories.has(categoryName);
}

export const CATEGORY_RECURRING_CONFIG = {
    // Variable Recurring - Handled by VariableSpendingService (frequency-based)
    // SOURCE OF TRUTH: Database field `is_variable_spending` on categories table
    // This list is a FALLBACK for synchronous lookups only
    variable_recurring: {
        categories: [
            'Supermarkt',
            'Slager',
            'Bakker',
            'Speciaalzaken',
            'Koffie',
            'Lunch',
            'Uit eten',
            'Bestellen',
            'Uitgaan/bars',
            'Brandstof',
            'Openbaar vervoer',
            'Parkeren',
            'Taxi & deelvervoer',
            'Persoonlijke verzorging',
            'Huisdierenverzorging'
        ],
        minTransactions: 4, // Minimum visits to establish a pattern
        description: 'Variable amounts, frequent visits - handled by VariableSpendingService'
    },

    // Fixed Recurring - Expect very consistent amounts
    fixed_recurring: {
        categories: [
            // Streaming subscriptions
            'Spotify',
            'Netflix',
            'Disney+',
            'Amazon Prime',
            'HBO Max',
            'Videoland',
            'Viaplay',
            'YouTube Premium',
            'Apple Services',

            // Telecom
            'TV/internet/telefoon',
            'Ziggo',
            'KPN',
            'Odido',
            'Vodafone',
            'Tele2',
            'Youfone',
            'Simyo',
            'HollandsNieuwe',
            'Lebara',

            // Insurance
            'Verzekering',
            'Zilveren Kruis',
            'CZ',
            'VGZ',
            'Menzis',
            'Ditzo',
            'Inshared',
            'Centraal Beheer',
            'OHRA',
            'FBTO',
            'Nationale-Nederlanden',
            'Aegon',
            'ANWB',

            // Gym/Sports
            'Sport',
            'Basic-Fit',
            'Fit For Free',

            // Housing
            'Woning',
            'Autobetaling',

            // Childcare
            'Kinderopvang & zorg',
            'Onderwijs'
        ],
        varianceThreshold: 0.05, // Very strict - 5% variance
        minTransactions: 3,
        description: 'Fixed amounts, highly predictable'
    },

    // Semi-Variable - Base amount with occasional spikes
    semi_variable: {
        categories: [
            'Energie/water',
            'Gezondheidszorg'
        ],
        varianceThreshold: 0.25, // 25% variance
        minTransactions: 4,
        description: 'Base cost + usage'
    },

    // Exclude - Never mark as recurring
    exclude_from_recurring: {
        categories: [
            'Kleding',
            'Elektronica',
            'Woninginrichting',
            'Algemene retail',
            'Winkelen',
            'Entertainment', // One-off events
            'Boeken/tijdschriften/games',
            'Hobby',
            'Uitjes & activiteiten',
            'Reizen',
            'Sparen & beleggen',
            'Overboekingen eigen rekeningen',
            'Betaalverzoeken',
            'Creditcard betalingen',
            'Goede doelen & donaties',
            'Geldopnames',
            // Note: 'Leningen & schuldaflossing' removed - loan payments are recurring and should be tracked
            'Kosten & vergoedingen',
            'Belastingen & boetes', // Irregular
            'Niet gecategoriseerd',
            'Overig',
            'Overig inkomen'
        ],
        description: 'Should never be recurring'
    }
} as const;

// Helper to get config for a category
export function getCategoryRecurringBehavior(categoryName: string | null): {
    type: 'variable_recurring' | 'fixed_recurring' | 'semi_variable' | 'exclude' | 'default';
    varianceThreshold: number;
    minTransactions: number;
} {
    if (!categoryName) {
        return { type: 'default', varianceThreshold: 0.20, minTransactions: 3 };
    }

    // Check each group (cast to string[] to avoid literal type issues)
    const variableCategories = CATEGORY_RECURRING_CONFIG.variable_recurring.categories as readonly string[];
    const fixedCategories = CATEGORY_RECURRING_CONFIG.fixed_recurring.categories as readonly string[];
    const semiVariableCategories = CATEGORY_RECURRING_CONFIG.semi_variable.categories as readonly string[];
    const excludeCategories = CATEGORY_RECURRING_CONFIG.exclude_from_recurring.categories as readonly string[];

    if (variableCategories.includes(categoryName)) {
        return {
            type: 'variable_recurring',
            varianceThreshold: 1.0, // Not used - VariableSpendingService handles these
            minTransactions: CATEGORY_RECURRING_CONFIG.variable_recurring.minTransactions
        };
    }

    if (fixedCategories.includes(categoryName)) {
        return {
            type: 'fixed_recurring',
            varianceThreshold: CATEGORY_RECURRING_CONFIG.fixed_recurring.varianceThreshold,
            minTransactions: CATEGORY_RECURRING_CONFIG.fixed_recurring.minTransactions
        };
    }

    if (semiVariableCategories.includes(categoryName)) {
        return {
            type: 'semi_variable',
            varianceThreshold: CATEGORY_RECURRING_CONFIG.semi_variable.varianceThreshold,
            minTransactions: CATEGORY_RECURRING_CONFIG.semi_variable.minTransactions
        };
    }

    if (excludeCategories.includes(categoryName)) {
        return {
            type: 'exclude',
            varianceThreshold: 0,
            minTransactions: 999 // Effectively excluded
        };
    }

    // Default behavior
    return { type: 'default', varianceThreshold: 0.20, minTransactions: 3 };
}
