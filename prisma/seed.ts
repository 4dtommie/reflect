import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
	console.log('🌱 Seeding database...');

	try {
		console.log('📊 Seed completed successfully!');
	} catch (error) {
		console.error('❌ Error during seeding:', error);
		throw error;
	}
}

main()
	.catch((e) => {
		console.error('❌ Fatal error seeding database:', e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});

