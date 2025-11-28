/**
 * Embedding Service
 * 
 * Generates vector embeddings using OpenAI's text-embedding-3-small model.
 * Used for semantic similarity search in transaction categorization.
 * Small model (1536 dimensions) works with pgvector HNSW index (max 2000 dimensions).
 */

import OpenAI from 'openai';
import { db } from '$lib/server/db';
import { aiConfig, isAIAvailable } from './config';
import type { AmountCategory } from './amountCategorizer';

// Initialize OpenAI client (reuse from aiCategorizer pattern)
const openai = aiConfig.apiKey ? new OpenAI({ apiKey: aiConfig.apiKey }) : null;

// Embedding configuration
export const embeddingConfig = {
	model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
	dimensions: 1536, // text-embedding-3-small outputs 1536 dimensions (works with pgvector HNSW index)
	batchSize: parseInt(process.env.EMBEDDING_BATCH_SIZE || '100'),
	maxRetries: 3,
	retryDelay: 1000
};

/**
 * Transaction data needed for embedding generation
 */
export interface TransactionForEmbedding {
	id: number;
	cleaned_merchant_name: string | null;
	normalized_description: string | null;
	amount_category: AmountCategory | string | null;
	type: string;
	is_debit: boolean;
}

/**
 * Category data needed for embedding generation
 */
export interface CategoryForEmbedding {
	id: number;
	name: string;
	description: string | null;
	keywords?: string[]; // Manual keywords to include in embedding
}

/**
 * Dutch translations for transaction context
 */
const dutchTranslations = {
	// Amount categories
	amountCategory: {
		tiny: 'heel klein',
		small: 'klein',
		medium: 'middel',
		large: 'groot',
		huge: 'zeer groot'
	} as Record<string, string>,
	
	// Transaction types
	transactionType: {
		Payment: 'betaling',
		Transfer: 'overschrijving',
		DirectDebit: 'incasso',
		Deposit: 'storting',
		Withdrawal: 'opname',
		Refund: 'terugbetaling',
		Fee: 'kosten',
		Interest: 'rente',
		Other: 'overig'
	} as Record<string, string>,
	
	// Credit/Debit
	creditDebit: {
		debit: 'uitgave',
		credit: 'inkomst'
	}
};

/**
 * Retry function with exponential backoff
 */
async function retryWithBackoff<T>(
	fn: () => Promise<T>,
	maxRetries: number,
	delay: number
): Promise<T> {
	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error: any) {
			const isRetryable = error?.status === 429 || 
			                    (error?.status >= 500 && error?.status < 600) ||
			                    error?.code === 'ECONNRESET' ||
			                    error?.code === 'ETIMEDOUT';

			if (!isRetryable || attempt === maxRetries - 1) {
				throw error;
			}

			const waitTime = delay * Math.pow(2, attempt);
			console.log(`   ⏳ Rate limit/error, retrying in ${waitTime}ms (attempt ${attempt + 1}/${maxRetries})...`);
			await new Promise(resolve => setTimeout(resolve, waitTime));
		}
	}
	throw new Error('Max retries exceeded');
}

/**
 * Check if embedding generation is available
 */
export function isEmbeddingAvailable(): boolean {
	return isAIAvailable() && !!openai;
}

/**
 * Generate embedding for a single text
 * 
 * @param text - Text to embed
 * @returns Array of 1536 floats representing the embedding
 */
export async function generateEmbedding(text: string): Promise<number[]> {
	if (!isEmbeddingAvailable() || !openai) {
		throw new Error('OpenAI API is not configured. Set OPENAI_API_KEY environment variable.');
	}

	if (!text || text.trim().length === 0) {
		throw new Error('Cannot generate embedding for empty text');
	}

	const response = await retryWithBackoff(
		() => openai!.embeddings.create({
			model: embeddingConfig.model,
			input: text.trim()
		}),
		embeddingConfig.maxRetries,
		embeddingConfig.retryDelay
	);

	return response.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts in a single API call
 * More efficient than calling generateEmbedding multiple times
 * 
 * @param texts - Array of texts to embed
 * @returns Array of embeddings (same order as input)
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
	if (!isEmbeddingAvailable() || !openai) {
		throw new Error('OpenAI API is not configured. Set OPENAI_API_KEY environment variable.');
	}

	if (texts.length === 0) {
		return [];
	}

	// Filter and validate texts
	const validTexts = texts.map(t => t?.trim() || '').filter(t => t.length > 0);
	
	if (validTexts.length === 0) {
		throw new Error('All texts are empty, cannot generate embeddings');
	}

	// Process in batches if needed (API limit is typically 2048 inputs)
	const batchSize = Math.min(embeddingConfig.batchSize, 2048);
	const allEmbeddings: number[][] = [];

	for (let i = 0; i < validTexts.length; i += batchSize) {
		const batch = validTexts.slice(i, i + batchSize);
		
		const response = await retryWithBackoff(
			() => openai!.embeddings.create({
				model: embeddingConfig.model,
				input: batch
			}),
			embeddingConfig.maxRetries,
			embeddingConfig.retryDelay
		);

		// Sort by index to maintain order (API may return out of order)
		const sortedData = response.data.sort((a, b) => a.index - b.index);
		allEmbeddings.push(...sortedData.map(d => d.embedding));
	}

	return allEmbeddings;
}

/**
 * Prepare transaction text for embedding generation
 * Combines cleaned merchant name, normalized description, and context in Dutch
 * 
 * @param transaction - Transaction data
 * @returns Formatted text string for embedding
 */
export function prepareTransactionText(transaction: TransactionForEmbedding, debug = false): string {
	const parts: string[] = [];

	// Add cleaned merchant name (primary identifier - should match category keywords)
	if (transaction.cleaned_merchant_name) {
		parts.push(transaction.cleaned_merchant_name);
	}

	// Add normalized description (additional context about what was purchased/paid)
	if (transaction.normalized_description) {
		parts.push(transaction.normalized_description);
	}

	// NOTE: Removed amount_category, transaction type, and credit/debit
	// These don't exist in category embeddings and were reducing similarity scores

	const result = parts.filter(p => p && p.length > 0).join(' ');
	
	if (debug) {
		console.log(`   📝 Transaction ${transaction.id} embedding text: "${result}"`);
	}
	
	return result;
}

/**
 * Prepare category text for embedding generation
 * Includes only name and description (semantic meaning)
 * Keywords are NOT included - they're handled separately by keyword matching (Priority 1)
 * This keeps embeddings focused on semantic meaning rather than brand names
 * 
 * @param category - Category data
 * @returns Formatted text string for embedding
 */
export function prepareCategoryText(category: CategoryForEmbedding): string {
	const parts: string[] = [category.name];
	
	if (category.description) {
		parts.push(category.description);
	}

	// Add keywords (max 20, already filtered to manual only)
	// Keywords help with vector matching by including brand names and common terms
	if (category.keywords && category.keywords.length > 0) {
		const keywordsToInclude = category.keywords.slice(0, 20);
		parts.push(keywordsToInclude.join(' '));
	}

	return parts.join(' ');
}

/**
 * Generate and store embeddings for all categories
 * Should be called when categories are created/updated or as a one-time setup
 * Includes manual keywords in the embedding text for better matching
 * 
 * @param userId - User ID (to include user's custom categories)
 * @returns Number of categories updated
 */
export async function generateCategoryEmbeddings(userId?: number): Promise<{
	updated: number;
	skipped: number;
	errors: Array<{ categoryId: number; error: string }>;
}> {
	if (!isEmbeddingAvailable()) {
		throw new Error('OpenAI API is not configured. Set OPENAI_API_KEY environment variable.');
	}

	console.log('🔢 Generating category embeddings...');

	// Load all categories with their manual keywords (default + user's custom)
	const whereClause = userId 
		? { OR: [{ is_default: true }, { created_by: userId }] }
		: { is_default: true };

	const categories = await db.categories.findMany({
		where: whereClause,
		select: {
			id: true,
			name: true,
			description: true,
			category_keywords: {
				where: { source: 'manual' }, // Only manual keywords
				select: { keyword: true },
				take: 20 // Limit to 20 keywords
			}
		}
	});

	// Transform to CategoryForEmbedding format
	const categoriesWithKeywords: CategoryForEmbedding[] = categories.map(cat => ({
		id: cat.id,
		name: cat.name,
		description: cat.description,
		keywords: cat.category_keywords.map(k => k.keyword)
	}));

	console.log(`   📚 Found ${categories.length} categories`);

	if (categoriesWithKeywords.length === 0) {
		return { updated: 0, skipped: 0, errors: [] };
	}

	// Prepare texts for embedding (includes name, description, and keywords)
	const categoryTexts = categoriesWithKeywords.map(cat => prepareCategoryText(cat));
	
	// Log sample texts for debugging
	if (categoriesWithKeywords.length > 0) {
		console.log(`   📝 Sample embedding text: "${categoryTexts[0].substring(0, 100)}..."`);
	}
	
	// Generate embeddings in batch
	console.log(`   🔄 Generating embeddings...`);
	const embeddings = await generateEmbeddingsBatch(categoryTexts);

	// Store embeddings in database
	let updated = 0;
	let skipped = 0;
	const errors: Array<{ categoryId: number; error: string }> = [];

	for (let i = 0; i < categoriesWithKeywords.length; i++) {
		const category = categoriesWithKeywords[i];
		const embedding = embeddings[i];

		if (!embedding || embedding.length !== embeddingConfig.dimensions) {
			errors.push({
				categoryId: category.id,
				error: `Invalid embedding: expected ${embeddingConfig.dimensions} dimensions, got ${embedding?.length || 0}`
			});
			continue;
		}

		try {
			// Use raw SQL to update vector column (Prisma doesn't support vector type natively)
			// Cast to vector without specifying dimensions - PostgreSQL will use the column's dimension
			const embeddingString = `[${embedding.join(',')}]`;
			
			await db.$executeRaw`
				UPDATE categories 
				SET embedding = ${embeddingString}::vector,
				    embedding_updated_at = NOW()
				WHERE id = ${category.id}
			`;

			updated++;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			console.error(`   ❌ Failed to save embedding for category ${category.id} (${category.name}):`, errorMessage);
			errors.push({
				categoryId: category.id,
				error: errorMessage
			});
		}
	}

	console.log(`   ✅ Category embeddings complete:`);
	console.log(`      - Updated: ${updated}`);
	console.log(`      - Skipped: ${skipped}`);
	console.log(`      - Errors: ${errors.length}`);
	
	if (errors.length > 0) {
		console.error(`   ❌ Embedding errors (first 5):`, errors.slice(0, 5));
	}

	return { updated, skipped, errors };
}

/**
 * Generate embedding for a single category and store it
 * Useful when a category is created or updated
 * Includes manual keywords in the embedding
 * 
 * @param categoryId - Category ID to update
 */
export async function updateCategoryEmbedding(categoryId: number): Promise<void> {
	if (!isEmbeddingAvailable()) {
		throw new Error('OpenAI API is not configured.');
	}

	const category = await db.categories.findUnique({
		where: { id: categoryId },
		select: { 
			id: true, 
			name: true, 
			description: true,
			category_keywords: {
				where: { source: 'manual' },
				select: { keyword: true },
				take: 20
			}
		}
	});

	if (!category) {
		throw new Error(`Category ${categoryId} not found`);
	}

	const categoryWithKeywords: CategoryForEmbedding = {
		id: category.id,
		name: category.name,
		description: category.description,
		keywords: category.category_keywords.map(k => k.keyword)
	};

	const text = prepareCategoryText(categoryWithKeywords);
	const embedding = await generateEmbedding(text);
	const embeddingString = `[${embedding.join(',')}]`;

	await db.$executeRaw`
		UPDATE categories 
		SET embedding = ${embeddingString}::vector,
		    embedding_updated_at = NOW()
		WHERE id = ${categoryId}
	`;

	console.log(`   ✅ Updated embedding for category: ${category.name} (${category.category_keywords.length} keywords)`);
}

/**
 * Generate embeddings for multiple transactions
 * Returns embeddings without storing them (for on-demand vector search)
 * 
 * @param transactions - Transactions to generate embeddings for
 * @returns Map of transaction ID to embedding
 */
export async function generateTransactionEmbeddings(
	transactions: TransactionForEmbedding[]
): Promise<Map<number, number[]>> {
	if (!isEmbeddingAvailable()) {
		throw new Error('OpenAI API is not configured.');
	}

	if (transactions.length === 0) {
		return new Map();
	}

	console.log(`   🔄 Generating embeddings for ${transactions.length} transactions...`);

	// Prepare texts (with debug logging for first 3)
	const texts = transactions.map((t, i) => prepareTransactionText(t, i < 3));
	
	// Generate embeddings
	const embeddings = await generateEmbeddingsBatch(texts);

	// Create map
	const result = new Map<number, number[]>();
	for (let i = 0; i < transactions.length; i++) {
		if (embeddings[i]) {
			result.set(transactions[i].id, embeddings[i]);
		}
	}

	console.log(`   ✅ Generated ${result.size} embeddings`);

	return result;
}

/**
 * Check if categories have embeddings
 * 
 * @returns Statistics about category embeddings
 */
export async function getCategoryEmbeddingStats(): Promise<{
	total: number;
	withEmbedding: number;
	withoutEmbedding: number;
	lastUpdated: Date | null;
}> {
	const total = await db.categories.count();
	
	// Use raw query to count categories with embeddings
	const withEmbeddingResult = await db.$queryRaw<[{ count: bigint }]>`
		SELECT COUNT(*) as count FROM categories WHERE embedding IS NOT NULL
	`;
	const withEmbedding = Number(withEmbeddingResult[0].count);

	// Get last updated time
	const lastUpdatedResult = await db.$queryRaw<[{ max: Date | null }]>`
		SELECT MAX(embedding_updated_at) as max FROM categories
	`;
	const lastUpdated = lastUpdatedResult[0].max;

	return {
		total,
		withEmbedding,
		withoutEmbedding: total - withEmbedding,
		lastUpdated
	};
}

