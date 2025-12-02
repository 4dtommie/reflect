
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const categories = await prisma.categories.findMany();
    console.log('Categories found:', categories.length);
    categories.forEach(c => console.log(`${c.id}: ${c.name}`));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
