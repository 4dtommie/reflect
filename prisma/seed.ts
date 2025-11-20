import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
	console.log('🌱 Seeding database...');

	try {
		// Clear existing data (optional - comment out if you want to keep existing data)
		const deleted = await prisma.person.deleteMany();
		console.log(`🗑️  Deleted ${deleted.count} existing records`);

		// Create default people
		const people = await prisma.person.createMany({
			data: [
				{
					name: 'John',
					age: 25,
					city: 'New York'
				},
				{
					name: 'Jane',
					age: 30,
					city: 'Los Angeles'
				}
			]
		});

		console.log(`✅ Created ${people.count} people`);
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

