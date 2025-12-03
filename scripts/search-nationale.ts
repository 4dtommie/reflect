import { db } from '../src/lib/server/db/index.js';

async function searchNationale() {
    const txs = await db.transactions.findMany({
        where: {
            OR: [
                { description: { contains: 'nationale', mode: 'insensitive' } },
                { merchantName: { contains: 'nationale', mode: 'insensitive' } },
                { cleaned_merchant_name: { contains: 'nationale', mode: 'insensitive' } }
            ],
            amount: { gte: 900, lte: 1100 }
        },
        include: {
            categories: true
        },
        orderBy: { date: 'desc' },
        take: 30
    });

    console.log(`Found ${txs.length} transactions with "nationale" and amount 900-1100:`);
    txs.forEach(tx => {
        console.log(`  - ID: ${tx.id}, Amount: ${tx.amount}, Date: ${tx.date.toISOString().split('T')[0]}`);
        console.log(`    Description: ${tx.description?.substring(0, 150)}`);
        console.log(`    Merchant: ${tx.merchantName || tx.cleaned_merchant_name || 'N/A'}`);
        console.log(`    Category: ${tx.categories?.name || 'None'}`);
        console.log(`    Is Debit: ${tx.is_debit}`);
        console.log('');
    });

    await db.$disconnect();
}

searchNationale().catch(console.error);

