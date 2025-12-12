/**
 * Run Context Refinement (Standalone)
 * 
 * This script runs the context refinement directly using Prisma.
 * Run with: npx ts-node scripts/run-context-refinement.ts [--dry-run]
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

// ============================================================================
// TIME EXTRACTION (copied from contextRefinementService.ts for standalone use)
// ============================================================================

function extractTimeFromDescription(description: string): { hour: number; minute: number } | null {
    if (!description) return null;
    const timePattern = /\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/;
    const match = description.match(timePattern);
    if (match) {
        const hour = parseInt(match[1], 10);
        const minute = parseInt(match[2], 10);
        if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
            return { hour, minute };
        }
    }
    return null;
}

function isTimeInRange(hour: number, range: { start: number; end: number }): boolean {
    if (range.start <= range.end) {
        return hour >= range.start && hour < range.end;
    } else {
        return hour >= range.start || hour < range.end;
    }
}

// ============================================================================
// REFINEMENT RULES
// ============================================================================

interface RefinementRule {
    id: string;
    targetCategoryName: string;
    sourceCategoryNames?: string[];
    merchantPatterns?: RegExp[];
    timeRange?: { start: number; end: number };
    amountRange?: { min: number; max: number };
    priority: number;
    description: string;
}

const FOOD_PATTERNS = [
    /starbucks/i, /coffee/i, /cafe|café/i, /restaurant/i, /eetcafe/i,
    /lunch/i, /broodje/i, /subway/i, /la\s*place/i, /febo/i, /smullers/i,
    /bar\b/i, /kroeg/i, /strandpaviljoen/i
];

const GAS_PATTERNS = [/shell/i, /bp\b/i, /esso/i, /total/i, /tinq/i, /tango/i, /avia/i];
const BANK_PATTERNS = [/ing\b/i, /rabobank/i, /abn/i, /nationale/i, /nn\b/i, /inshared/i];

const RULES: RefinementRule[] = [
    { id: 'coffee_morning', targetCategoryName: 'Koffie', sourceCategoryNames: ['Restaurants & uit eten', 'Uit eten', 'Lunch'], merchantPatterns: FOOD_PATTERNS, timeRange: { start: 6, end: 11 }, amountRange: { min: 2, max: 8 }, priority: 100, description: 'Morning coffee' },
    { id: 'snacks_small', targetCategoryName: 'Snacks', sourceCategoryNames: ['Restaurants & uit eten', 'Koffie', 'Lunch'], amountRange: { min: 0.5, max: 3 }, priority: 95, description: 'Small snacks' },
    { id: 'lunch_midday', targetCategoryName: 'Lunch', sourceCategoryNames: ['Restaurants & uit eten', 'Uit eten', 'Koffie'], merchantPatterns: FOOD_PATTERNS, timeRange: { start: 11, end: 15 }, amountRange: { min: 5, max: 20 }, priority: 90, description: 'Midday lunch' },
    { id: 'dinner_evening', targetCategoryName: 'Uit eten', sourceCategoryNames: ['Restaurants & uit eten', 'Lunch', 'Koffie'], merchantPatterns: FOOD_PATTERNS, timeRange: { start: 17, end: 22 }, amountRange: { min: 15, max: 150 }, priority: 85, description: 'Evening dinner' },
    { id: 'bars_nightlife', targetCategoryName: 'Uitgaan/bars', sourceCategoryNames: ['Restaurants & uit eten', 'Uit eten'], merchantPatterns: FOOD_PATTERNS, timeRange: { start: 21, end: 4 }, amountRange: { min: 5, max: 100 }, priority: 80, description: 'Nightlife' },
    { id: 'gas_fuel', targetCategoryName: 'Brandstof', sourceCategoryNames: ['Lunch', 'Snacks', 'Koffie'], merchantPatterns: GAS_PATTERNS, amountRange: { min: 25, max: 200 }, priority: 75, description: 'Gas station fuel' },
    { id: 'gas_snack', targetCategoryName: 'Snacks', sourceCategoryNames: ['Brandstof'], merchantPatterns: GAS_PATTERNS, amountRange: { min: 0.5, max: 5 }, priority: 70, description: 'Gas station snack' },
    { id: 'bank_mortgage', targetCategoryName: 'Wonen', sourceCategoryNames: ['Verzekering', 'Bankkosten'], merchantPatterns: BANK_PATTERNS, amountRange: { min: 500, max: 3000 }, priority: 60, description: 'Bank mortgage' },
    { id: 'bank_insurance', targetCategoryName: 'Verzekering', sourceCategoryNames: ['Wonen', 'Bankkosten'], merchantPatterns: BANK_PATTERNS, amountRange: { min: 30, max: 300 }, priority: 55, description: 'Bank insurance' },
    { id: 'bank_fees', targetCategoryName: 'Bankkosten', sourceCategoryNames: ['Verzekering', 'Wonen'], merchantPatterns: BANK_PATTERNS, amountRange: { min: 1, max: 30 }, priority: 50, description: 'Bank fees' },
];

// ============================================================================
// MAIN
// ============================================================================

async function runRefinement(dryRun: boolean = true) {
    console.log(`\n🔧 Context Refinement ${dryRun ? '(DRY RUN)' : ''}\n`);

    // Get first user
    const user = await db.user.findFirst();
    if (!user) {
        console.log('No users found');
        return;
    }

    console.log(`User: ${user.username} (ID: ${user.id})\n`);

    // Get categories
    const categories = await db.categories.findMany({ select: { id: true, name: true } });
    const catByName = new Map(categories.map(c => [c.name, c.id]));

    // Get transactions
    const transactions = await db.transactions.findMany({
        where: { user_id: user.id, is_category_manual: false },
        select: {
            id: true, description: true, merchantName: true, amount: true,
            category_id: true, categories: { select: { name: true } }
        }
    });

    console.log(`Found ${transactions.length} transactions to evaluate\n`);

    let refined = 0;
    const changes: Array<{ txId: number; merchant: string; amount: number; time: string | null; from: string; to: string; rule: string }> = [];

    for (const tx of transactions) {
        const time = extractTimeFromDescription(tx.description);
        const amount = Math.abs(Number(tx.amount));
        const catName = tx.categories?.name || null;

        for (const rule of RULES.sort((a, b) => b.priority - a.priority)) {
            const targetId = catByName.get(rule.targetCategoryName);
            if (!targetId || tx.category_id === targetId) continue;

            // Check source category
            if (rule.sourceCategoryNames && rule.sourceCategoryNames.length > 0) {
                if (!catName || !rule.sourceCategoryNames.includes(catName)) continue;
            }

            // Check merchant pattern
            if (rule.merchantPatterns && rule.merchantPatterns.length > 0) {
                const matches = rule.merchantPatterns.some(p => p.test(tx.merchantName) || p.test(tx.description));
                if (!matches) continue;
            }

            // Check time
            if (rule.timeRange) {
                if (!time || !isTimeInRange(time.hour, rule.timeRange)) continue;
            }

            // Check amount
            if (rule.amountRange) {
                if (amount < rule.amountRange.min || amount > rule.amountRange.max) continue;
            }

            // Match found!
            const timeStr = time ? `${time.hour.toString().padStart(2, '0')}:${time.minute.toString().padStart(2, '0')}` : null;
            changes.push({
                txId: tx.id,
                merchant: tx.merchantName,
                amount,
                time: timeStr,
                from: catName || 'Unknown',
                to: rule.targetCategoryName,
                rule: rule.id
            });
            refined++;

            console.log(`✓ [${rule.id}] ${tx.merchantName.substring(0, 25).padEnd(25)} €${amount.toFixed(2).padStart(7)} ${timeStr || '     '} : ${catName} → ${rule.targetCategoryName}`);

            if (!dryRun) {
                await db.transactions.update({
                    where: { id: tx.id },
                    data: { category_id: targetId, category_confidence: 0.85, updated_at: new Date() }
                });
            }

            break;
        }
    }

    console.log(`\n📊 Summary: ${refined} transactions would be refined`);
    if (dryRun) {
        console.log('   (Run with --apply to actually apply changes)');
    }

    await db.$disconnect();
}

// Check args
const dryRun = !process.argv.includes('--apply');
runRefinement(dryRun).catch(console.error);
