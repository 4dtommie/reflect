import { db } from '../src/lib/server/db/index.js';

async function checkGrouping() {
    // Check Nationale Nederlanden transactions
    const nnTxs = await db.transactions.findMany({
        where: {
            merchantName: { contains: 'Nationale-Nederlanden', mode: 'insensitive' },
            amount: { gte: 1000, lte: 1100 }
        },
        orderBy: { date: 'desc' },
        take: 5
    });

    console.log('=== Nationale Nederlanden transaction details ===');
    nnTxs.forEach(tx => {
        console.log(`Date: ${tx.date.toISOString().split('T')[0]}, Amount: ${tx.amount}`);
        console.log(`  merchant_id: ${tx.merchant_id || 'NULL'}`);
        console.log(`  counterparty_iban: ${tx.counterparty_iban || 'NULL'}`);
        console.log(`  cleaned_merchant_name: ${tx.cleaned_merchant_name || 'NULL'}`);
        console.log(`  merchantName: ${tx.merchantName || 'NULL'}`);
        console.log('');
    });

    // Check AXUS transactions
    const axusTxs = await db.transactions.findMany({
        where: {
            merchantName: { contains: 'AXUS', mode: 'insensitive' },
            amount: { gte: 720, lte: 730 }
        },
        orderBy: { date: 'desc' },
        take: 5
    });

    console.log('=== AXUS transaction details ===');
    axusTxs.forEach(tx => {
        console.log(`Date: ${tx.date.toISOString().split('T')[0]}, Amount: ${tx.amount}`);
        console.log(`  merchant_id: ${tx.merchant_id || 'NULL'}`);
        console.log(`  counterparty_iban: ${tx.counterparty_iban || 'NULL'}`);
        console.log(`  cleaned_merchant_name: ${tx.cleaned_merchant_name || 'NULL'}`);
        console.log(`  merchantName: ${tx.merchantName || 'NULL'}`);
        console.log(`  category_id: ${tx.category_id || 'NULL'}`);
        console.log('');
    });

    await db.$disconnect();
}

checkGrouping().catch(console.error);

