import { db } from '../src/lib/server/db/index.js';

async function checkUser() {
    // Find transactions with Nationale Nederlanden
    const nnTxs = await db.transactions.findMany({
        where: {
            merchantName: { contains: 'Nationale-Nederlanden', mode: 'insensitive' }
        },
        select: {
            id: true,
            user_id: true,
            date: true,
            amount: true,
            merchantName: true
        },
        take: 5,
        orderBy: { date: 'desc' }
    });

    console.log(`Found ${nnTxs.length} Nationale Nederlanden transactions:`);
    const userIds = new Set<number>();
    nnTxs.forEach(tx => {
        userIds.add(tx.user_id);
        console.log(`  - User ID: ${tx.user_id}, Date: ${tx.date.toISOString().split('T')[0]}, Amount: ${tx.amount}`);
    });

    console.log(`\nUnique user IDs: ${Array.from(userIds).join(', ')}`);

    // Get all users
    const users = await db.user.findMany({
        select: {
            id: true,
            username: true
        }
    });

    console.log(`\nAll users:`);
    users.forEach(u => {
        console.log(`  - ID: ${u.id}, Username: ${u.username}`);
    });

    await db.$disconnect();
}

checkUser().catch(console.error);

