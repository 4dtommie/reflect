/**
 * Vector Similarity Matcher
 * 
 * Uses pgvector to find similar categories based on semantic embeddings.
 * Priority 3 in the categorization cascade (after keyword and IBAN matching).
 */

import { db } from '$lib/server/db';
import {
	generateTransactionEmbeddings,
	isEmbeddingAvailable,
	prepareTransactionText,
	type TransactionForEmbedding
} from './embeddingService';

// Re-export TransactionForEmbedding for use by other modules
export type { TransactionForEmbedding } from './embeddingService';

// Vector search configuration
// Note: Cosine similarity ranges from -1 (opposite) to 1 (identical)
// Lower threshold = more matches but potentially less accurate
// Typical values: 0.7-0.8 for high confidence, 0.5-0.6 for moderate, <0.5 for low confidence
export const vectorConfig = {
	similarityThreshold: parseFloat(process.env.VECTOR_SIMILARITY_THRESHOLD || '0.55'), // Raised to 0.55 to avoid bad matches
	topN: parseInt(process.env.VECTOR_TOP_N || '3'),
	batchSize: parseInt(process.env.VECTOR_BATCH_SIZE || '50')
};

/**
 * Result from vector similarity search
 */
export interface VectorMatchResult {
	transactionId: number;
	categoryId: number;
	categoryName: string;
	similarity: number; // 0.0 - 1.0 (higher is better)
	matched: boolean; // true if above threshold
}

/**
 * Batch result from vector matching
 */
export interface VectorMatchBatchResult {
	results: VectorMatchResult[];
	matched: number;
	belowThreshold: number;
	noEmbedding: number;
	errors: Array<{ transactionId: number; error: string }>;
}

/**
 * Category with similarity score from vector search
 */
interface CategorySimilarityResult {
	id: number;
	name: string;
	similarity: number;
}

/**
 * Check if vector matching is available
 * Requires OpenAI API and categories with embeddings
 */
export async function isVectorMatchingAvailable(): Promise<boolean> {
	console.log(`   🔍 Checking vector matching availability...`);

	const embeddingAvailable = isEmbeddingAvailable();
	console.log(`   📊 Embedding API available: ${embeddingAvailable}`);

	if (!embeddingAvailable) {
		console.log(`   ⚠️  Vector matching disabled: OpenAI API not configured`);
		return false;
	}

	// Check if any categories have embeddings
	try {
		const result = await db.$queryRaw<[{ count: bigint }]>`
			SELECT COUNT(*) as count FROM categories WHERE embedding IS NOT NULL
		`;

		const count = Number(result[0].count);
		console.log(`   📊 Categories with embeddings: ${count}`);

		if (count === 0) {
			console.log(`   ⚠️  Vector matching disabled: No categories have embeddings. Run 'Generate category embeddings' first.`);
		}

		return count > 0;
	} catch (error) {
		console.error(`   ❌ Error checking category embeddings:`, error);
		return false;
	}
}

/**
 * Find similar categories for a single transaction using vector search
 * 
 * @param embedding - Transaction embedding (1536 floats)
 * @param userId - User ID (to include user's custom categories)
 * @param topN - Number of results to return (default: 3)
 * @returns Array of categories with similarity scores
 */
export async function findSimilarCategories(
	embedding: number[],
	userId: number,
	topN: number = vectorConfig.topN
): Promise<CategorySimilarityResult[]> {
	const embeddingString = `[${embedding.join(',')}]`;

	// Use pgvector cosine distance operator (<=>)
	// Cosine distance: 0 = identical, 2 = opposite
	// Similarity: 1 - distance (so 1.0 = identical, -1.0 = opposite)
	const results = await db.$queryRaw<CategorySimilarityResult[]>`
		SELECT 
			id,
			name,
			1 - (embedding <=> ${embeddingString}::vector) AS similarity
		FROM categories
		WHERE embedding IS NOT NULL
			AND (is_default = true OR created_by = ${userId})
		ORDER BY embedding <=> ${embeddingString}::vector
		LIMIT ${topN}
	`;

	// Debug: Log if no results found
	if (results.length === 0) {
		// Check if there are any categories with embeddings at all
		const totalCount = await db.$queryRaw<[{ count: bigint }]>`
			SELECT COUNT(*) as count FROM categories WHERE embedding IS NOT NULL
		`;
		const userCount = await db.$queryRaw<[{ count: bigint }]>`
			SELECT COUNT(*) as count FROM categories 
			WHERE embedding IS NOT NULL 
			AND (is_default = true OR created_by = ${userId})
		`;
		console.log(`   ⚠️  No categories with embeddings found for user ${userId}`);
		console.log(`      - Total categories with embeddings: ${Number(totalCount[0].count)}`);
		console.log(`      - User-accessible categories with embeddings: ${Number(userCount[0].count)}`);
	}

	return results;
}

/**
 * Match a single transaction to the best category using vector similarity
 * 
 * @param transaction - Transaction to match
 * @param userId - User ID
 * @returns Match result or null if no match above threshold
 */
export async function matchTransactionWithVector(
	transaction: TransactionForEmbedding,
	userId: number
): Promise<VectorMatchResult | null> {
	if (!isEmbeddingAvailable()) {
		return null;
	}

	// Generate embedding for transaction
	const embeddings = await generateTransactionEmbeddings([transaction]);
	const embedding = embeddings.get(transaction.id);

	if (!embedding) {
		return null;
	}

	// Find similar categories
	const similarCategories = await findSimilarCategories(embedding, userId);

	if (similarCategories.length === 0) {
		return null;
	}

	const best = similarCategories[0];
	const matched = best.similarity >= vectorConfig.similarityThreshold;

	return {
		transactionId: transaction.id,
		categoryId: best.id,
		categoryName: best.name,
		similarity: best.similarity,
		matched
	};
}

/**
 * Match multiple transactions using vector similarity search
 * More efficient than matching one at a time (batches embedding generation)
 * 
 * @param transactions - Transactions to match
 * @param userId - User ID
 * @returns Batch result with all matches and statistics
 */
export async function matchTransactionsBatchWithVector(
	transactions: TransactionForEmbedding[],
	userId: number
): Promise<VectorMatchBatchResult> {
	// Check availability and log status
	const available = await isVectorMatchingAvailable();
	if (!available) {
		console.log(`   ⚠️  Vector matching not available (no embeddings or API key)`);
		return {
			results: transactions.map(t => ({
				transactionId: t.id,
				categoryId: 0,
				categoryName: '',
				similarity: 0,
				matched: false
			})),
			matched: 0,
			belowThreshold: 0,
			noEmbedding: transactions.length,
			errors: []
		};
	}

	console.log(`   🔍 Starting vector matching for ${transactions.length} transactions (threshold: ${vectorConfig.similarityThreshold})`);

	if (!isEmbeddingAvailable()) {
		throw new Error('OpenAI API is not configured. Set OPENAI_API_KEY environment variable.');
	}

	if (transactions.length === 0) {
		return {
			results: [],
			matched: 0,
			belowThreshold: 0,
			noEmbedding: 0,
			errors: []
		};
	}

	console.log(`🔍 Vector matching ${transactions.length} transactions...`);

	const results: VectorMatchResult[] = [];
	const errors: Array<{ transactionId: number; error: string }> = [];
	let matched = 0;
	let belowThreshold = 0;
	let noEmbedding = 0;

	// Process in batches
	const batchSize = vectorConfig.batchSize;

	for (let i = 0; i < transactions.length; i += batchSize) {
		const batch = transactions.slice(i, i + batchSize);
		console.log(`   📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(transactions.length / batchSize)}...`);

		try {
			// Generate embeddings for batch
			const embeddings = await generateTransactionEmbeddings(batch);

			// Match each transaction
			for (const transaction of batch) {
				const embedding = embeddings.get(transaction.id);

				if (!embedding) {
					noEmbedding++;
					errors.push({
						transactionId: transaction.id,
						error: 'Failed to generate embedding'
					});
					continue;
				}

				try {
					// Find similar categories
					const similarCategories = await findSimilarCategories(embedding, userId);

					if (similarCategories.length === 0) {
						results.push({
							transactionId: transaction.id,
							categoryId: 0,
							categoryName: '',
							similarity: 0,
							matched: false
						});
						belowThreshold++;
						continue;
					}

					const best = similarCategories[0];
					const isMatched = best.similarity >= vectorConfig.similarityThreshold;

					// Debug logging for first few transactions
					if (results.length < 5) {
						console.log(`   🔍 Transaction ${transaction.id} vector search:`, {
							transactionText: prepareTransactionText(transaction, false),
							bestMatch: best.name,
							similarity: best.similarity.toFixed(3),
							threshold: vectorConfig.similarityThreshold,
							matched: isMatched,
							top3: similarCategories.slice(0, 3).map(c => ({
								name: c.name,
								similarity: c.similarity.toFixed(3)
							}))
						});
					}

					results.push({
						transactionId: transaction.id,
						categoryId: best.id,
						categoryName: best.name,
						similarity: best.similarity,
						matched: isMatched
					});

					if (isMatched) {
						matched++;
					} else {
						belowThreshold++;
					}
				} catch (error) {
					errors.push({
						transactionId: transaction.id,
						error: error instanceof Error ? error.message : 'Unknown error'
					});
				}
			}
		} catch (error) {
			// Batch-level error (e.g., API failure)
			console.error(`   ❌ Batch error:`, error);
			for (const transaction of batch) {
				errors.push({
					transactionId: transaction.id,
					error: error instanceof Error ? error.message : 'Batch processing error'
				});
			}
		}
	}

	console.log(`   ✅ Vector matching complete:`);
	console.log(`      - Matched (≥${vectorConfig.similarityThreshold}): ${matched}`);
	console.log(`      - Below threshold: ${belowThreshold}`);
	console.log(`      - No embedding: ${noEmbedding}`);
	console.log(`      - Errors: ${errors.length}`);

	// Debug: Log sample similarities if any results
	if (results.length > 0 && results[0].similarity > 0) {
		const sampleResults = results.slice(0, 3);
		console.log(`   🔍 Sample similarities:`, sampleResults.map(r => ({
			transactionId: r.transactionId,
			category: r.categoryName,
			similarity: r.similarity.toFixed(3),
			matched: r.matched
		})));
	}

	return {
		results,
		matched,
		belowThreshold,
		noEmbedding,
		errors
	};
}

/**
 * Get top N similar categories for a transaction (for debugging/display)
 * 
 * @param transaction - Transaction to analyze
 * @param userId - User ID
 * @param topN - Number of results (default: 5)
 * @returns Array of categories with similarity scores
 */
export async function getTopSimilarCategories(
	transaction: TransactionForEmbedding,
	userId: number,
	topN: number = 5
): Promise<Array<{ categoryId: number; categoryName: string; similarity: number }>> {
	if (!isEmbeddingAvailable()) {
		return [];
	}

	const embeddings = await generateTransactionEmbeddings([transaction]);
	const embedding = embeddings.get(transaction.id);

	if (!embedding) {
		return [];
	}

	const similar = await findSimilarCategories(embedding, userId, topN);

	return similar.map(s => ({
		categoryId: s.id,
		categoryName: s.name,
		similarity: s.similarity
	}));
}

