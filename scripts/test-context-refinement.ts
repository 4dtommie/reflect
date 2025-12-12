/**
 * Test Context Refinement Service
 * 
 * Runs refinement in dry-run mode to see what would change.
 * Run with: npx ts-node scripts/test-context-refinement.ts
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

// Import the refinement service (using relative import for script)
async function main() {
    console.log('🧪 Testing Context Refinement Service\n');

    // Get first user (for testing)
    const user = await db.user.findFirst();
    if (!user) {
        console.log('No users found');
        await db.$disconnect();
        return;
    }

    console.log(`Testing for user: ${user.username} (ID: ${user.id})\n`);

    // Dynamically import the service
    const { refineAllTransactions, extractTimeFromDescription } = await import(
        '../src/lib/server/categorization/contextRefinementService'
    );

    // Test time extraction first
    console.log('━'.repeat(60));
    console.log('📅 TIME EXTRACTION TESTS');
    console.log('━'.repeat(60));

    const testDescriptions = [
        'Pasvolgnr: 904 03-12-2025 15:47 Transactie: C00362',
        'Pasvolgnr: 904 30-11-2025 08:59 Transactie: P00346',
        'Naam: bol.com 20:26 Order 12345',
        'Some description without time',
        '10:30:45 with seconds',
        '23:59 late night',
        '00:15 early morning',
    ];

    for (const desc of testDescriptions) {
        const time = extractTimeFromDescription(desc);
        if (time) {
            console.log(`  ✓ "${desc.substring(0, 40)}..." → ${time.hour.toString().padStart(2, '0')}:${time.minute.toString().padStart(2, '0')}`);
        } else {
            console.log(`  ✗ "${desc.substring(0, 40)}..." → no time found`);
        }
    }

    // Run refinement in dry-run mode
    console.log('\n' + '━'.repeat(60));
    console.log('🔧 DRY RUN REFINEMENT');
    console.log('━'.repeat(60));

    const result = await refineAllTransactions(user.id, {
        dryRun: true,
        verbose: true
    });

    // Show all changes
    if (result.changes.length > 0) {
        console.log('\n' + '━'.repeat(60));
        console.log('📋 DETAILED CHANGES');
        console.log('━'.repeat(60));

        // Group by rule
        const byRule = new Map<string, typeof result.changes>();
        for (const change of result.changes) {
            const existing = byRule.get(change.rule) || [];
            existing.push(change);
            byRule.set(change.rule, existing);
        }

        for (const [rule, changes] of byRule) {
            console.log(`\n[${rule}] - ${changes.length} changes:`);
            for (const c of changes.slice(0, 5)) { // Show first 5 per rule
                console.log(`  ID:${c.transactionId} ${c.merchantName.substring(0, 20).padEnd(20)} €${c.amount.toFixed(2).padStart(7)} ${c.time || '     '} : ${c.fromCategory} → ${c.toCategory}`);
            }
            if (changes.length > 5) {
                console.log(`  ... and ${changes.length - 5} more`);
            }
        }
    }

    console.log('\n' + '━'.repeat(60));
    console.log('✅ Test complete. Run without dryRun to apply changes.');
    console.log('━'.repeat(60));

    await db.$disconnect();
}

main().catch(console.error);
