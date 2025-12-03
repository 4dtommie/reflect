// Category-based recurring detection configuration
// Maps categories to their recurring detection behavior

export const CATEGORY_RECURRING_CONFIG = {
    // Variable Recurring - Accept wide variance, focus on frequency
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
            'Brandstof',
            'Openbaar vervoer',
            'Parkeren',
            'Persoonlijke verzorging'
        ],
        varianceThreshold: 0.60, // Allow 60% variance
        minTransactions: 8, // Need more data points for variable amounts
        description: 'Variable amounts but frequent'
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
            'Leningen & schuldaflossing',
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

    // Check each group
    if (CATEGORY_RECURRING_CONFIG.variable_recurring.categories.includes(categoryName)) {
        return {
            type: 'variable_recurring',
            varianceThreshold: CATEGORY_RECURRING_CONFIG.variable_recurring.varianceThreshold,
            minTransactions: CATEGORY_RECURRING_CONFIG.variable_recurring.minTransactions
        };
    }

    if (CATEGORY_RECURRING_CONFIG.fixed_recurring.categories.includes(categoryName)) {
        return {
            type: 'fixed_recurring',
            varianceThreshold: CATEGORY_RECURRING_CONFIG.fixed_recurring.varianceThreshold,
            minTransactions: CATEGORY_RECURRING_CONFIG.fixed_recurring.minTransactions
        };
    }

    if (CATEGORY_RECURRING_CONFIG.semi_variable.categories.includes(categoryName)) {
        return {
            type: 'semi_variable',
            varianceThreshold: CATEGORY_RECURRING_CONFIG.semi_variable.varianceThreshold,
            minTransactions: CATEGORY_RECURRING_CONFIG.semi_variable.minTransactions
        };
    }

    if (CATEGORY_RECURRING_CONFIG.exclude_from_recurring.categories.includes(categoryName)) {
        return {
            type: 'exclude',
            varianceThreshold: 0,
            minTransactions: 999 // Effectively excluded
        };
    }

    // Default behavior
    return { type: 'default', varianceThreshold: 0.20, minTransactions: 3 };
}
