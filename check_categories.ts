import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const categories = await prisma.categories.findMany({
        select: {
            id: true,
            name: true,
            parent_id: true,
        },
        orderBy: {
            name: 'asc',
        },
    });

    console.log('Total categories:', categories.length);
    const categoriesWithParent = categories.filter(c => c.parent_id !== null);
    console.log('Categories with parent:', categoriesWithParent.length);

    if (categoriesWithParent.length === 0) {
        console.log('No categories have a parent_id set. The hierarchy is flat.');
    } else {
        console.log('Sample categories with parent:');
        categoriesWithParent.slice(0, 5).forEach(c => {
            console.log(`- ${c.name} (ID: ${c.id}, ParentID: ${c.parent_id})`);
        });
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
