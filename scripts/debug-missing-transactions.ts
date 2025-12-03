import { db } from '../src/lib/server/db/index.js';

async function debugTransactions() {
    console.log('=== Searching for AXUS transactions ===');
    const axusTxs = await db.transactions.findMany({
        where: {
            OR: [
                { description: { contains: 'axus', mode: 'insensitive' } },
                { merchantName: { contains: 'axus', mode: 'insensitive' } },
                { cleaned_merchant_name: { contains: 'axus', mode: 'insensitive' } }
            ]
        },
        include: {
            categories: true
        },
        orderBy: { date: 'desc' },
        take: 20
    });

    console.log(`Found ${axusTxs.length} AXUS transactions:`);
    axusTxs.forEach(tx => {
        console.log(`  - ID: ${tx.id}, Amount: ${tx.amount}, Date: ${tx.date.toISOString().split('T')[0]}`);
        console.log(`    Description: ${tx.description}`);
        console.log(`    Merchant: ${tx.merchantName || tx.cleaned_merchant_name || 'N/A'}`);
        console.log(`    Is Debit: ${tx.is_debit}, Category: ${tx.categories?.name || 'None'}`);
        console.log(`    Merchant ID: ${tx.merchant_id || 'None'}`);
        console.log('');
    });

    console.log('\n=== Searching for Nationale Nederlanden transactions ===');
    const nnTxs = await db.transactions.findMany({
        where: {
            OR: [
                { description: { contains: 'nationale nederlanden', mode: 'insensitive' } },
                { merchantName: { contains: 'nationale nederlanden', mode: 'insensitive' } },
                { cleaned_merchant_name: { contains: 'nationale nederlanden', mode: 'insensitive' } }
            ]
        },
        include: {
            categories: true
        },
        orderBy: { date: 'desc' },
        take: 20
    });

    console.log(`Found ${nnTxs.length} Nationale Nederlanden transactions:`);
    nnTxs.forEach(tx => {
        console.log(`  - ID: ${tx.id}, Amount: ${tx.amount}, Date: ${tx.date.toISOString().split('T')[0]}`);
        console.log(`    Description: ${tx.description}`);
        console.log(`    Merchant: ${tx.merchantName || tx.cleaned_merchant_name || 'N/A'}`);
        console.log(`    Is Debit: ${tx.is_debit}, Category: ${tx.categories?.name || 'None'}`);
        console.log(`    Merchant ID: ${tx.merchant_id || 'None'}`);
        console.log('');
    });

    // Check for known merchants
    console.log('\n=== Checking known merchants ===');
    const knownMerchants = await db.merchants.findMany({
        where: {
            OR: [
                { name: { contains: 'axus', mode: 'insensitive' } },
                { name: { contains: 'nationale nederlanden', mode: 'insensitive' } }
            ]
        }
    });

    console.log(`Found ${knownMerchants.length} known merchants:`);
    knownMerchants.forEach(m => {
        console.log(`  - ${m.name} (ID: ${m.id}, is_potential_recurring: ${m.is_potential_recurring})`);
        console.log(`    Keywords: ${m.keywords.join(', ')}`);
    });

    await db.$disconnect();
}

debugTransactions().catch(console.error);

