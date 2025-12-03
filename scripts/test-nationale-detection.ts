import { db } from '../src/lib/server/db/index.js';
import { RecurringDetectionService } from '../src/lib/server/recurring/recurringDetectionService.js';

async function testDetection() {
    // Get user ID 2 (Kevin) who has the Nationale Nederlanden transactions
    const user = await db.user.findUnique({
        where: { id: 2 }
    });
    if (!user) {
        console.log('User ID 2 not found');
        await db.$disconnect();
        return;
    }

    console.log(`Testing detection for user: ${user.username} (ID: ${user.id})\n`);

    // Check Nationale Nederlanden transactions
    const nnTxs = await db.transactions.findMany({
        where: {
            merchantName: { contains: 'Nationale-Nederlanden', mode: 'insensitive' },
            user_id: user.id
        },
        include: {
            categories: true
        },
        orderBy: { date: 'desc' },
        take: 5
    });

    console.log(`Found ${nnTxs.length} Nationale Nederlanden transactions:`);
    nnTxs.forEach(tx => {
        console.log(`  - Date: ${tx.date.toISOString().split('T')[0]}, Amount: ${tx.amount}`);
        console.log(`    Category: ${tx.categories?.name || 'None'}`);
        console.log(`    Merchant ID: ${tx.merchant_id || 'NULL'}`);
        console.log(`    Is Debit: ${tx.is_debit}`);
    });

    // Check merchant
    const merchant = await db.merchants.findUnique({
        where: { id: 2183 }
    });

    console.log(`\nMerchant (ID 2183):`);
    console.log(`  Name: ${merchant?.name}`);
    console.log(`  is_potential_recurring: ${merchant?.is_potential_recurring}`);
    console.log(`  is_active: ${merchant?.is_active}`);
    console.log(`  Keywords: ${merchant?.keywords.join(', ')}`);

    console.log(`\n=== Running Detection ===\n`);
    
    // Run detection
    const service = new RecurringDetectionService();
    const candidates = await service.detectRecurringTransactions(user.id);

    console.log(`\n=== Detection Results ===`);
    console.log(`Total candidates found: ${candidates.length}`);
    
    const nnCandidates = candidates.filter(c => 
        c.name.toLowerCase().includes('nationale') || 
        c.merchantId === 2183
    );

    if (nnCandidates.length > 0) {
        console.log(`\nNationale Nederlanden candidates: ${nnCandidates.length}`);
        nnCandidates.forEach(c => {
            console.log(`  - Name: ${c.name}`);
            console.log(`    Amount: €${c.amount.toFixed(2)}`);
            console.log(`    Interval: ${c.interval}`);
            console.log(`    Source: ${c.source}`);
            console.log(`    Confidence: ${c.confidence}`);
            console.log(`    Transactions: ${c.transactions.length}`);
        });
    } else {
        console.log(`\n❌ No Nationale Nederlanden candidates found!`);
    }

    await db.$disconnect();
}

testDetection().catch(console.error);

