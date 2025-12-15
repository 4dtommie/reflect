import { PrismaClient } from '@prisma/client';

// Get the database environment (acc or prod)
const dbEnv = process.env.DATABASE_ENV || 'acc';

// Get the appropriate database URL
function getDatabaseUrl(): string {
	const dbUrlAcc = process.env.DATABASE_URL_ACC;
	const dbUrlProd = process.env.DATABASE_URL_PROD;
	const dbUrl = process.env.DATABASE_URL;

	// If DATABASE_URL is explicitly set, use it
	if (dbUrl) {
		return dbUrl;
	}

	// Otherwise, use environment-specific URL
	if (dbEnv === 'prod' && dbUrlProd) {
		return dbUrlProd;
	}

	if (dbUrlAcc) {
		return dbUrlAcc;
	}

	throw new Error(
		`Database URL not found. Set DATABASE_URL, DATABASE_URL_ACC, or DATABASE_URL_PROD in your environment variables.`
	);
}

// Create Prisma Client with the correct database URL
// Add connection pool params to prevent timeout issues
function getDatabaseUrlWithPoolConfig(baseUrl: string): string {
	const url = new URL(baseUrl);
	// Connection pool settings to prevent timeout issues
	url.searchParams.set('connection_limit', '5'); // Lower limit for dev
	url.searchParams.set('pool_timeout', '30'); // 30 second timeout
	return url.toString();
}

const databaseUrl = getDatabaseUrlWithPoolConfig(getDatabaseUrl());

const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined;
};

export const db =
	globalForPrisma.prisma ??
	new PrismaClient({
		datasources: {
			db: {
				url: databaseUrl
			}
		},
		log: ['error', 'warn'] // Disabled 'query' logging for cleaner console output
	});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

// Graceful shutdown - prevent connection leaks
if (typeof process !== 'undefined') {
	process.on('beforeExit', async () => {
		await db.$disconnect();
	});
}
