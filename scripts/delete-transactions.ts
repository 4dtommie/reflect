import { db } from '../src/lib/server/db/index.js';
import dotenv from 'dotenv';

dotenv.config();

async function deleteTransactions(username: string) {
	try {
		console.log(`🔍 Looking up user: ${username}...`);
		
		// Find user by username
		const user = await db.user.findUnique({
			where: { username },
			select: { id: true, username: true }
		});

		if (!user) {
			console.error(`❌ User "${username}" not found.`);
			process.exit(1);
		}

		console.log(`✅ Found user: ${user.username} (ID: ${user.id})`);

		// Count transactions before deletion
		const transactionCount = await (db as any).transactions.count({
			where: { user_id: user.id }
		});

		if (transactionCount === 0) {
			console.log('ℹ️  No transactions found for this user.');
			await db.$disconnect();
			process.exit(0);
		}

		console.log(`📊 Found ${transactionCount} transactions to delete.`);
		console.log('⚠️  This will permanently delete all transactions for this user!');
		
		// Delete all transactions
		const result = await (db as any).transactions.deleteMany({
			where: { user_id: user.id }
		});

		console.log(`✅ Successfully deleted ${result.count} transactions.`);
	} catch (error) {
		console.error('❌ Error deleting transactions:', error);
		throw error;
	} finally {
		await db.$disconnect();
	}
}

// Get username from command line argument
const username = process.argv[2];

if (!username) {
	console.error('❌ Please provide a username as an argument.');
	console.log('Usage: npm run delete-transactions <username>');
	console.log('   or: tsx scripts/delete-transactions.ts <username>');
	process.exit(1);
}

deleteTransactions(username)
	.catch((e) => {
		console.error('❌ Fatal error:', e);
		process.exit(1);
	});

