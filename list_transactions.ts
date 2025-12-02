
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const transactions = await prisma.transactions.findMany({
        take: 10,
        include: { categories: true }
    });
    console.log(transactions.map(t => ({
        id: t.id,
        merchant: t.merchantName,
        category: t.categories?.name
    })));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
