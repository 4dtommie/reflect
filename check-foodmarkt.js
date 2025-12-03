import { db } from './src/lib/server/db.ts';

async function checkFoodmarkt() {
    const foodmarktTxs = await db.transactions.findMany({
        where: {
            OR: [
                { merchantName: { contains: 'foodmarkt', mode: 'insensitive' } },
                { cleaned_merchant_name: { contains: 'foodmarkt', mode: 'insensitive' } }
            ]
        },
        include: {
            merchants: true,
            categories: true
        },
        orderBy: {
            date: 'desc'
        }
    });

    console.log(`\nFound ${foodmarktTxs.length} Foodmarkt transactions:\n`);

    // Group by merchant_id
    const grouped = new Map();
    for (const tx of foodmarktTxs) {
        const key = `merchant_id: ${tx.merchant_id || 'NULL'} | cleaned: "${tx.cleaned_merchant_name}" | category: ${tx.categories?.name || 'NULL'}`;
        const txs = grouped.get(key) || [];
        txs.push(tx);
        grouped.set(key, txs);
    }

    for (const [key, txs] of grouped) {
        console.log(`${key}`);
        console.log(`  Count: ${txs.length}`);
        console.log(`  Merchant names: ${[...new Set(txs.map(t => t.merchantName))].slice(0, 3).join(', ')}`);
        console.log(`  Amount range: €${Math.min(...txs.map(t => Number(t.amount))).toFixed(2)} - €${Math.max(...txs.map(t => Number(t.amount))).toFixed(2)}`);
        console.log('');
    }

    await db.$disconnect();
}

checkFoodmarkt().catch(console.error);
