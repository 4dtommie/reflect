import { db } from '../src/lib/server/db/index.js';

async function checkMerchants() {
    const nnMerchant = await db.merchants.findUnique({
        where: { id: 2183 }
    });
    console.log('=== Nationale Nederlanden merchant (ID 2183) ===');
    console.log(JSON.stringify(nnMerchant, null, 2));

    const axusCategory = await db.categories.findUnique({
        where: { id: 416 }
    });
    console.log('\n=== AXUS category (ID 416) ===');
    console.log(JSON.stringify(axusCategory, null, 2));

    await db.$disconnect();
}

checkMerchants().catch(console.error);

