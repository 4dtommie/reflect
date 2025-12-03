import { db } from '../src/lib/server/db/index.js';

async function checkCategories() {
    const nnTxs = await db.transactions.findMany({
        where: {
            merchant_id: 2183,
            user_id: 2
        },
        include: {
            categories: true
        },
        orderBy: { date: 'desc' }
    });

    console.log(`Total Nationale Nederlanden transactions: ${nnTxs.length}\n`);

    const categoryCounts = new Map<string, number>();
    const categoryAmounts = new Map<string, number[]>();

    nnTxs.forEach(tx => {
        const catName = tx.categories?.name || 'None';
        const count = categoryCounts.get(catName) || 0;
        categoryCounts.set(catName, count + 1);

        const amounts = categoryAmounts.get(catName) || [];
        amounts.push(Math.abs(Number(tx.amount)));
        categoryAmounts.set(catName, amounts);
    });

    console.log('Category distribution:');
    for (const [cat, count] of categoryCounts.entries()) {
        const amounts = categoryAmounts.get(cat) || [];
        const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        console.log(`  ${cat}: ${count} transactions, avg amount: €${avg.toFixed(2)}`);
    }

    await db.$disconnect();
}

checkCategories().catch(console.error);

