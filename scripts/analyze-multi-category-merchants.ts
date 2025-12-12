/**
 * Analyze Multi-Category Merchant Candidates
 * 
 * Finds merchants with high amount variance that might need
 * different categories based on transaction amount.
 * 
 * Run with: npx ts-node scripts/analyze-multi-category-merchants.ts
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

interface MerchantAnalysis {
    merchantId: number;
    merchantName: string;
    transactionCount: number;
    minAmount: number;
    maxAmount: number;
    avgAmount: number;
    amountRange: number;
    coefficientOfVariation: number; // CV = stdDev / mean - higher = more variance
    amountBuckets: {
        tiny: number;      // €0-5
        small: number;     // €5-15
        medium: number;    // €15-50
        large: number;     // €50-200
        huge: number;      // €200+
    };
    currentCategories: string[];
    sampleTransactions: {
        amount: number;
        description: string;
        category: string | null;
    }[];
}

async function analyzeMerchants() {
    console.log('🔍 Analyzing merchants for multi-category candidates...\n');

    // Get all merchants with their transactions
    const merchants = await db.merchants.findMany({
        where: {
            transactions: {
                some: {}
            }
        },
        include: {
            transactions: {
                select: {
                    id: true,
                    amount: true,
                    description: true,
                    date: true,
                    categories: {
                        select: {
                            name: true
                        }
                    }
                },
                orderBy: { amount: 'asc' }
            },
            categories: {
                select: { name: true }
            }
        }
    });

    console.log(`Found ${merchants.length} merchants with transactions\n`);

    const analyses: MerchantAnalysis[] = [];

    for (const merchant of merchants) {
        const txs = merchant.transactions;
        if (txs.length < 3) continue; // Need at least 3 transactions for meaningful analysis

        const amounts = txs.map(t => Math.abs(Number(t.amount)));
        const minAmount = Math.min(...amounts);
        const maxAmount = Math.max(...amounts);
        const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        const amountRange = maxAmount - minAmount;

        // Calculate coefficient of variation (CV)
        const variance = amounts.reduce((sum, amt) => sum + Math.pow(amt - avgAmount, 2), 0) / amounts.length;
        const stdDev = Math.sqrt(variance);
        const cv = avgAmount > 0 ? stdDev / avgAmount : 0;

        // Count amount buckets
        const buckets = {
            tiny: amounts.filter(a => a < 5).length,
            small: amounts.filter(a => a >= 5 && a < 15).length,
            medium: amounts.filter(a => a >= 15 && a < 50).length,
            large: amounts.filter(a => a >= 50 && a < 200).length,
            huge: amounts.filter(a => a >= 200).length
        };

        // Count how many buckets have transactions
        const activeBuckets = Object.values(buckets).filter(c => c > 0).length;

        // Get unique categories used
        const categories = [...new Set(txs.map(t => t.categories?.name).filter(Boolean))] as string[];

        // Sample transactions (min, median, max amounts)
        const sortedTxs = [...txs].sort((a, b) => Number(a.amount) - Number(b.amount));
        const samples = [
            sortedTxs[0],
            sortedTxs[Math.floor(sortedTxs.length / 2)],
            sortedTxs[sortedTxs.length - 1]
        ].map(t => ({
            amount: Math.abs(Number(t.amount)),
            description: t.description.substring(0, 80),
            category: t.categories?.name || null
        }));

        // Only include if high variance OR multiple active buckets
        if (cv > 0.5 || activeBuckets >= 3 || amountRange > 100) {
            analyses.push({
                merchantId: merchant.id,
                merchantName: merchant.name,
                transactionCount: txs.length,
                minAmount,
                maxAmount,
                avgAmount,
                amountRange,
                coefficientOfVariation: cv,
                amountBuckets: buckets,
                currentCategories: categories,
                sampleTransactions: samples
            });
        }
    }

    // Sort by coefficient of variation (highest variance first)
    analyses.sort((a, b) => b.coefficientOfVariation - a.coefficientOfVariation);

    // Print results
    console.log('='.repeat(80));
    console.log('MULTI-CATEGORY MERCHANT CANDIDATES');
    console.log('Merchants with high amount variance that might need different categories');
    console.log('='.repeat(80));
    console.log();

    // Group by type
    const gasStations = analyses.filter(a =>
        /shell|bp|esso|total|tinq|tango|avia|texaco|q8|gulf|tankstation|benzine/i.test(a.merchantName)
    );
    const banks = analyses.filter(a =>
        /ing|rabobank|abn|amro|sns|asn|triodos|knab|bunq|revolut|bank/i.test(a.merchantName)
    );
    const insurers = analyses.filter(a =>
        /nationale|nn|verzekering|insurance|aegon|achmea|centraal beheer|zilveren kruis/i.test(a.merchantName)
    );
    const foodPlaces = analyses.filter(a =>
        /starbucks|coffee|koffie|cafe|café|restaurant|eetcafe|lunch|bakker|albert heijn|jumbo|supermarkt/i.test(a.merchantName)
    );
    const others = analyses.filter(a =>
        !gasStations.includes(a) && !banks.includes(a) && !insurers.includes(a) && !foodPlaces.includes(a)
    );

    const printGroup = (title: string, items: MerchantAnalysis[]) => {
        if (items.length === 0) return;

        console.log(`\n${'─'.repeat(60)}`);
        console.log(`📂 ${title} (${items.length} merchants)`);
        console.log('─'.repeat(60));

        for (const m of items.slice(0, 10)) { // Show top 10 per group
            console.log(`\n🏪 ${m.merchantName} (ID: ${m.merchantId})`);
            console.log(`   Transactions: ${m.transactionCount}`);
            console.log(`   Amount range: €${m.minAmount.toFixed(2)} - €${m.maxAmount.toFixed(2)} (diff: €${m.amountRange.toFixed(2)})`);
            console.log(`   Avg: €${m.avgAmount.toFixed(2)}, CV: ${m.coefficientOfVariation.toFixed(2)}`);
            console.log(`   Buckets: tiny(${m.amountBuckets.tiny}), small(${m.amountBuckets.small}), medium(${m.amountBuckets.medium}), large(${m.amountBuckets.large}), huge(${m.amountBuckets.huge})`);
            console.log(`   Current categories: ${m.currentCategories.join(', ') || 'none'}`);
            console.log(`   Samples:`);
            for (const s of m.sampleTransactions) {
                console.log(`     - €${s.amount.toFixed(2)}: ${s.description} [${s.category || 'uncategorized'}]`);
            }
        }

        if (items.length > 10) {
            console.log(`\n   ... and ${items.length - 10} more`);
        }
    };

    printGroup('⛽ GAS STATIONS', gasStations);
    printGroup('🏦 BANKS & FINANCIAL', banks);
    printGroup('🛡️ INSURANCE', insurers);
    printGroup('🍔 FOOD & RESTAURANTS', foodPlaces);
    printGroup('📦 OTHER', others);

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total multi-category candidates: ${analyses.length}`);
    console.log(`  - Gas stations: ${gasStations.length}`);
    console.log(`  - Banks/Financial: ${banks.length}`);
    console.log(`  - Insurance: ${insurers.length}`);
    console.log(`  - Food/Restaurants: ${foodPlaces.length}`);
    console.log(`  - Other: ${others.length}`);

    // Extract time from a sample description to check if times are present
    console.log('\n' + '='.repeat(80));
    console.log('TIME EXTRACTION TEST');
    console.log('='.repeat(80));

    const sampleTxs = await db.transactions.findMany({
        take: 20,
        orderBy: { date: 'desc' },
        select: { description: true }
    });

    const timePattern = /\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/;
    let timesFound = 0;

    console.log('Checking last 20 transactions for time patterns:');
    for (const tx of sampleTxs) {
        const match = tx.description.match(timePattern);
        if (match) {
            timesFound++;
            console.log(`  ✓ Found time ${match[0]} in: ${tx.description.substring(0, 60)}...`);
        }
    }
    console.log(`\nTimes found in ${timesFound}/${sampleTxs.length} transactions`);

    await db.$disconnect();
}

analyzeMerchants().catch(console.error);
