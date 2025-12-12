/**
 * Context Refinement Service
 * 
 * Post-processing service that refines transaction categories based on:
 * 1. Time of day (extracted from description)
 * 2. Transaction amount
 * 3. Merchant context
 * 
 * Runs after main categorization to improve accuracy for:
 * - Food categories (Coffee vs Lunch vs Dinner vs Bars)
 * - Multi-category merchants (Banks with Insurance/Mortgage/Fees)
 * - Gas stations (Fuel vs Snacks/Coffee)
 */

import { db } from '$lib/server/db';

// ============================================================================
// TYPES
// ============================================================================

interface RefinementRule {
    id: string;
    targetCategoryName: string;
    sourceCategoryNames?: string[];      // Categories that can be refined FROM (empty = any)
    merchantPatterns?: RegExp[];         // Merchant name patterns to match
    descriptionPatterns?: RegExp[];      // Description text patterns to match (keywords)
    timeRange?: { start: number; end: number };  // Hours in 24h format
    amountRange?: { min: number; max: number };  // EUR
    priority: number;                    // Higher = checked first
    description: string;                 // For logging
}

interface RefinementResult {
    totalProcessed: number;
    refined: number;
    byRule: Record<string, number>;
    changes: RefinementChange[];
}

interface RefinementChange {
    transactionId: number;
    merchantName: string;
    amount: number;
    time: string | null;
    fromCategory: string;
    toCategory: string;
    rule: string;
}

interface TransactionForRefinement {
    id: number;
    description: string;
    merchantName: string;
    amount: number;
    category_id: number | null;
    categoryName: string | null;
    merchant_id: number | null;
}

// ============================================================================
// CONFIGURATION: REFINEMENT RULES
// ============================================================================

// Food establishment patterns (for time-based refinement)
const FOOD_MERCHANT_PATTERNS = [
    /starbucks/i,
    /coffee\s*company/i,
    /bagels.*beans/i,
    /anne.*max/i,
    /lebkov/i,
    /koffiebar/i,
    /cafe|café/i,
    /restaurant/i,
    /eetcafe|eetcafé/i,
    /brasserie/i,
    /bistro/i,
    /lunch/i,
    /broodje/i,
    /subway/i,
    /la\s*place/i,
    /febo/i,
    /smullers/i,
    /bar\b/i,
    /kroeg/i,
    /club/i,
    /strandpaviljoen/i,
];

// Gas station patterns
const GAS_STATION_PATTERNS = [
    /shell/i,
    /bp\b/i,
    /esso/i,
    /total(?:energies)?/i,
    /tinq/i,
    /tango/i,
    /avia/i,
    /texaco/i,
    /q8/i,
    /gulf/i,
    /tankstation/i,
];

// Bank/insurer patterns
const BANK_INSURER_PATTERNS = [
    /ing\b/i,
    /rabobank/i,
    /abn\s*amro/i,
    /sns\b/i,
    /asn\b/i,
    /triodos/i,
    /knab/i,
    /bunq/i,
    /nationale.?nederlanden|nn\b/i,
    /aegon/i,
    /achmea/i,
    /centraal\s*beheer/i,
    /zilveren\s*kruis/i,
    /inshared/i,
];

// Mortgage keyword patterns (found in description)
const MORTGAGE_DESCRIPTION_PATTERNS = [
    /hypothe[e]?k/i,        // hypotheek, hypotheken
    /lening\s*\d+/i,        // lening followed by number (loan ID)
    /aflossing/i,           // repayment
    /woningfinanciering/i,  // housing financing
];

// Health insurance keyword patterns (found in description)
const HEALTH_INSURANCE_DESCRIPTION_PATTERNS = [
    /zorgverzekering/i,
    /zorgpremie/i,
    /basispremie/i,
    /aanvullende?\s*verzekering/i,
    /ziektekosten/i,
];

// Car/home insurance keyword patterns (found in description)
const PROPERTY_INSURANCE_DESCRIPTION_PATTERNS = [
    /autoverzekering/i,
    /inboedel/i,
    /opstal/i,
    /woonhuis/i,
    /wa\s*verzekering/i,
    /aansprakelijkheid/i,
    /brandverzekering/i,
];

// Refinement rules - ordered by priority (highest first)
const REFINEMENT_RULES: RefinementRule[] = [
    // ========== FOOD TIME-BASED RULES ==========
    {
        id: 'coffee_morning',
        targetCategoryName: 'Koffie',
        sourceCategoryNames: ['Restaurants & uit eten', 'Uit eten', 'Lunch', 'Niet gecategoriseerd'],
        merchantPatterns: FOOD_MERCHANT_PATTERNS,
        timeRange: { start: 6, end: 11 },
        amountRange: { min: 2, max: 8 },
        priority: 100,
        description: 'Morning coffee (6-11, €2-8)'
    },
    {
        id: 'snacks_small',
        targetCategoryName: 'Snacks',
        sourceCategoryNames: ['Restaurants & uit eten', 'Koffie', 'Lunch', 'Niet gecategoriseerd'],
        amountRange: { min: 0.5, max: 3 },
        priority: 95,
        description: 'Small snacks (€0.50-3)'
    },
    {
        id: 'lunch_midday',
        targetCategoryName: 'Lunch',
        sourceCategoryNames: ['Restaurants & uit eten', 'Uit eten', 'Koffie', 'Niet gecategoriseerd'],
        merchantPatterns: FOOD_MERCHANT_PATTERNS,
        timeRange: { start: 11, end: 15 },
        amountRange: { min: 5, max: 20 },
        priority: 90,
        description: 'Midday lunch (11-15, €5-20)'
    },
    {
        id: 'dinner_evening',
        targetCategoryName: 'Uit eten',
        sourceCategoryNames: ['Restaurants & uit eten', 'Lunch', 'Koffie', 'Niet gecategoriseerd'],
        merchantPatterns: FOOD_MERCHANT_PATTERNS,
        timeRange: { start: 17, end: 22 },
        amountRange: { min: 15, max: 150 },
        priority: 85,
        description: 'Evening dinner (17-22, €15-150)'
    },
    {
        id: 'bars_nightlife',
        targetCategoryName: 'Uitgaan/bars',
        sourceCategoryNames: ['Restaurants & uit eten', 'Uit eten', 'Niet gecategoriseerd'],
        merchantPatterns: FOOD_MERCHANT_PATTERNS,
        timeRange: { start: 21, end: 4 },  // 21:00 - 04:00 (wraps midnight)
        amountRange: { min: 5, max: 100 },
        priority: 80,
        description: 'Nightlife/bars (21-04, €5-100)'
    },

    // ========== GAS STATION RULES ==========
    {
        id: 'gas_station_fuel',
        targetCategoryName: 'Brandstof',
        sourceCategoryNames: ['Niet gecategoriseerd', 'Lunch', 'Snacks', 'Koffie'],
        merchantPatterns: GAS_STATION_PATTERNS,
        amountRange: { min: 25, max: 200 },
        priority: 75,
        description: 'Gas station fuel (€25+)'
    },
    {
        id: 'gas_station_snack',
        targetCategoryName: 'Snacks',
        sourceCategoryNames: ['Brandstof', 'Niet gecategoriseerd'],
        merchantPatterns: GAS_STATION_PATTERNS,
        amountRange: { min: 0.5, max: 5 },
        priority: 70,
        description: 'Gas station snack (€0.50-5)'
    },
    {
        id: 'gas_station_lunch',
        targetCategoryName: 'Lunch',
        sourceCategoryNames: ['Brandstof', 'Niet gecategoriseerd'],
        merchantPatterns: GAS_STATION_PATTERNS,
        timeRange: { start: 11, end: 15 },
        amountRange: { min: 5, max: 15 },
        priority: 65,
        description: 'Gas station lunch (11-15, €5-15)'
    },

    // ========== BANK/INSURER KEYWORD-FIRST RULES ==========
    // Keyword-based rules have highest priority - description keywords are definitive
    {
        id: 'mortgage_keyword',
        targetCategoryName: 'Wonen',
        sourceCategoryNames: ['Verzekering', 'Gezondheidszorg', 'Bankkosten', 'Niet gecategoriseerd'],
        merchantPatterns: BANK_INSURER_PATTERNS,
        descriptionPatterns: MORTGAGE_DESCRIPTION_PATTERNS,
        priority: 95,
        description: 'Mortgage by keyword (HYPOTHEKEN, AFLOSSING, etc.)'
    },
    {
        id: 'health_insurance_keyword',
        targetCategoryName: 'Gezondheidszorg',
        sourceCategoryNames: ['Verzekering', 'Wonen', 'Bankkosten', 'Niet gecategoriseerd'],
        merchantPatterns: BANK_INSURER_PATTERNS,
        descriptionPatterns: HEALTH_INSURANCE_DESCRIPTION_PATTERNS,
        priority: 94,
        description: 'Health insurance by keyword (ZORGVERZEKERING, etc.)'
    },
    {
        id: 'property_insurance_keyword',
        targetCategoryName: 'Verzekering',
        sourceCategoryNames: ['Gezondheidszorg', 'Wonen', 'Bankkosten', 'Niet gecategoriseerd'],
        merchantPatterns: BANK_INSURER_PATTERNS,
        descriptionPatterns: PROPERTY_INSURANCE_DESCRIPTION_PATTERNS,
        priority: 93,
        description: 'Car/home insurance by keyword (AUTO, INBOEDEL, etc.)'
    },

    // ========== BANK/INSURER AMOUNT-BASED RULES ==========
    // Amount-based fallback when no keywords found
    {
        id: 'mortgage_amount',
        targetCategoryName: 'Wonen',
        sourceCategoryNames: ['Verzekering', 'Gezondheidszorg', 'Bankkosten', 'Niet gecategoriseerd'],
        merchantPatterns: BANK_INSURER_PATTERNS,
        amountRange: { min: 900, max: 5000 },
        priority: 60,
        description: 'Mortgage by amount (€900-5000)'
    },
    {
        id: 'health_insurance_amount',
        targetCategoryName: 'Gezondheidszorg',
        sourceCategoryNames: ['Verzekering', 'Wonen', 'Bankkosten', 'Niet gecategoriseerd'],
        merchantPatterns: BANK_INSURER_PATTERNS,
        amountRange: { min: 120, max: 180 },
        priority: 58,
        description: 'Health insurance by amount (€120-180/month)'
    },
    {
        id: 'health_insurance_annual',
        targetCategoryName: 'Gezondheidszorg',
        sourceCategoryNames: ['Verzekering', 'Wonen', 'Bankkosten', 'Niet gecategoriseerd'],
        merchantPatterns: BANK_INSURER_PATTERNS,
        amountRange: { min: 1440, max: 2160 },
        priority: 57,
        description: 'Health insurance annual (€1440-2160/year)'
    },
    {
        id: 'property_insurance_amount',
        targetCategoryName: 'Verzekering',
        sourceCategoryNames: ['Gezondheidszorg', 'Wonen', 'Bankkosten', 'Niet gecategoriseerd'],
        merchantPatterns: BANK_INSURER_PATTERNS,
        amountRange: { min: 30, max: 90 },
        priority: 55,
        description: 'Car/home insurance by amount (€30-90)'
    },
    {
        id: 'bank_fees',
        targetCategoryName: 'Bankkosten',
        sourceCategoryNames: ['Verzekering', 'Gezondheidszorg', 'Wonen', 'Niet gecategoriseerd'],
        merchantPatterns: BANK_INSURER_PATTERNS,
        amountRange: { min: 1, max: 30 },
        priority: 50,
        description: 'Bank fees (€1-30)'
    },
];

// ============================================================================
// TIME EXTRACTION
// ============================================================================

/**
 * Extract time from transaction description
 * Looks for patterns like "15:47", "18:41:30", etc.
 */
export function extractTimeFromDescription(description: string): { hour: number; minute: number } | null {
    if (!description) return null;

    // Pattern: HH:MM or HH:MM:SS
    const timePattern = /\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/;
    const match = description.match(timePattern);

    if (match) {
        const hour = parseInt(match[1], 10);
        const minute = parseInt(match[2], 10);

        // Validate hour and minute
        if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
            return { hour, minute };
        }
    }

    return null;
}

/**
 * Check if a time falls within a time range (handles midnight wrap)
 */
function isTimeInRange(hour: number, range: { start: number; end: number }): boolean {
    if (range.start <= range.end) {
        // Normal range (e.g., 11-15)
        return hour >= range.start && hour < range.end;
    } else {
        // Wraps midnight (e.g., 21-4 means 21:00 to 04:00)
        return hour >= range.start || hour < range.end;
    }
}

// ============================================================================
// RULE MATCHING
// ============================================================================

/**
 * Check if a transaction matches a refinement rule
 */
function matchesRule(
    tx: TransactionForRefinement,
    rule: RefinementRule,
    extractedTime: { hour: number; minute: number } | null
): boolean {
    // Check source category
    if (rule.sourceCategoryNames && rule.sourceCategoryNames.length > 0) {
        if (!tx.categoryName || !rule.sourceCategoryNames.includes(tx.categoryName)) {
            return false;
        }
    }

    // Check merchant pattern
    if (rule.merchantPatterns && rule.merchantPatterns.length > 0) {
        const matchesMerchant = rule.merchantPatterns.some(pattern =>
            pattern.test(tx.merchantName) || pattern.test(tx.description)
        );
        if (!matchesMerchant) {
            return false;
        }
    }

    // Check time range
    if (rule.timeRange) {
        if (!extractedTime) {
            // If rule requires time but we don't have it, skip
            return false;
        }
        if (!isTimeInRange(extractedTime.hour, rule.timeRange)) {
            return false;
        }
    }

    // Check description patterns (keywords like HYPOTHEKEN, ZORGVERZEKERING, etc.)
    if (rule.descriptionPatterns && rule.descriptionPatterns.length > 0) {
        const matchesDescription = rule.descriptionPatterns.some(pattern =>
            pattern.test(tx.description)
        );
        if (!matchesDescription) {
            return false;
        }
    }

    // Check amount range
    if (rule.amountRange) {
        const amount = Math.abs(tx.amount);
        if (amount < rule.amountRange.min || amount > rule.amountRange.max) {
            return false;
        }
    }

    return true;
}

// ============================================================================
// MAIN REFINEMENT LOGIC
// ============================================================================

/**
 * Refine all eligible transactions for a user
 */
export async function refineAllTransactions(
    userId: number,
    options: {
        dryRun?: boolean;
        verbose?: boolean;
        onProgress?: (progress: {
            processed: number;
            total: number;
            refined: number;
            message: string;
        }) => void;
    } = {}
): Promise<RefinementResult> {
    const { dryRun = false, verbose = true, onProgress } = options;

    console.log(`\n🔧 Starting context refinement for user ${userId}...`);
    if (dryRun) console.log('   (DRY RUN - no changes will be saved)');

    // Fetch all transactions that could potentially be refined
    const transactions = await db.transactions.findMany({
        where: {
            user_id: userId,
            is_category_manual: false, // Don't touch manually categorized
        },
        select: {
            id: true,
            description: true,
            merchantName: true,
            amount: true,
            category_id: true,
            merchant_id: true,
            categories: {
                select: { id: true, name: true }
            }
        }
    });

    const totalTransactions = transactions.length;
    console.log(`   Found ${totalTransactions} transactions to evaluate`);

    // Initial progress
    onProgress?.({
        processed: 0,
        total: totalTransactions,
        refined: 0,
        message: `Evaluating ${totalTransactions} transactions...`
    });

    // Build category lookup for target categories
    const allCategories = await db.categories.findMany({
        select: { id: true, name: true }
    });
    const categoryByName = new Map(allCategories.map((c: { id: number; name: string }) => [c.name, c.id]));

    // Sort rules by priority (highest first)
    const sortedRules = [...REFINEMENT_RULES].sort((a, b) => b.priority - a.priority);

    const result: RefinementResult = {
        totalProcessed: totalTransactions,
        refined: 0,
        byRule: {},
        changes: []
    };

    // Process in batches for better progress reporting
    const BATCH_SIZE = 50;
    let processedCount = 0;

    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
        const batch = transactions.slice(i, i + BATCH_SIZE);

        for (const tx of batch) {
            const txForRefinement: TransactionForRefinement = {
                id: tx.id,
                description: tx.description,
                merchantName: tx.merchantName,
                amount: Number(tx.amount),
                category_id: tx.category_id,
                categoryName: tx.categories?.name || null,
                merchant_id: tx.merchant_id
            };

            const extractedTime = extractTimeFromDescription(tx.description);

            // Try each rule in priority order
            for (const rule of sortedRules) {
                // Skip if target category doesn't exist
                const targetCategoryId = categoryByName.get(rule.targetCategoryName);
                if (!targetCategoryId) {
                    continue;
                }

                // Skip if already in target category
                if (tx.category_id === targetCategoryId) {
                    continue;
                }

                // Check if rule matches
                if (matchesRule(txForRefinement, rule, extractedTime)) {
                    const timeStr = extractedTime ? `${extractedTime.hour.toString().padStart(2, '0')}:${extractedTime.minute.toString().padStart(2, '0')}` : null;

                    const change: RefinementChange = {
                        transactionId: tx.id,
                        merchantName: tx.merchantName,
                        amount: txForRefinement.amount,
                        time: timeStr,
                        fromCategory: txForRefinement.categoryName || 'Uncategorized',
                        toCategory: rule.targetCategoryName,
                        rule: rule.id
                    };

                    result.changes.push(change);
                    result.refined++;
                    result.byRule[rule.id] = (result.byRule[rule.id] || 0) + 1;

                    // Log the change
                    if (verbose) {
                        console.log(`   ✓ [${rule.id}] ${tx.merchantName.substring(0, 25).padEnd(25)} €${txForRefinement.amount.toFixed(2).padStart(7)} ${timeStr || '     '} : ${change.fromCategory} → ${change.toCategory}`);
                    }

                    // Apply the change (unless dry run)
                    if (!dryRun) {
                        await db.transactions.update({
                            where: { id: tx.id },
                            data: {
                                category_id: targetCategoryId,
                                category_confidence: 0.85, // High confidence for rule-based refinement
                                updated_at: new Date()
                            }
                        });
                    }

                    // Only apply first matching rule
                    break;
                }
            }

            processedCount++;
        }

        // Report progress after each batch
        onProgress?.({
            processed: processedCount,
            total: totalTransactions,
            refined: result.refined,
            message: result.refined > 0
                ? `Refined ${result.refined} transactions (${Math.round(processedCount / totalTransactions * 100)}%)`
                : `Processing... ${Math.round(processedCount / totalTransactions * 100)}%`
        });
    }

    // Final progress
    onProgress?.({
        processed: totalTransactions,
        total: totalTransactions,
        refined: result.refined,
        message: result.refined > 0
            ? `✓ Refined ${result.refined} transactions`
            : `✓ No refinements needed`
    });

    // Summary
    console.log(`\n📊 Refinement Summary:`);
    console.log(`   Total processed: ${result.totalProcessed}`);
    console.log(`   Refined: ${result.refined}`);
    if (Object.keys(result.byRule).length > 0) {
        console.log(`   By rule:`);
        for (const [rule, count] of Object.entries(result.byRule).sort((a, b) => b[1] - a[1])) {
            const ruleObj = REFINEMENT_RULES.find(r => r.id === rule);
            console.log(`     - ${rule}: ${count} ${ruleObj ? `(${ruleObj.description})` : ''}`);
        }
    }

    return result;
}

// ============================================================================
// EXPORTS
// ============================================================================

export { REFINEMENT_RULES, type RefinementRule, type RefinementResult, type RefinementChange };
