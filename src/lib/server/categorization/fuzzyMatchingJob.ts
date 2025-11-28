/**
 * Fuzzy Matching Job Service
 * 
 * Handles asynchronous fuzzy matching of merchant names with progress tracking.
 */

import { db } from '$lib/server/db';
import { findClosestMerchant, loadAllMerchantNames } from './fuzzyMatcher';
import { cleanMerchantName } from './merchantNameCleaner';

export interface FuzzyMatchingProgress {
	jobId: string;
	userId: number;
	status: 'pending' | 'processing' | 'completed' | 'failed';
	total: number;
	processed: number;
	matched: number;
	startedAt: Date | null;
	completedAt: Date | null;
	error?: string;
}

// In-memory progress store (in production, use Redis or database)
const progressStore = new Map<string, FuzzyMatchingProgress>();

/**
 * Start fuzzy matching job for a user's transactions
 */
export async function startFuzzyMatchingJob(userId: number): Promise<string> {
	const jobId = `fuzzy_${userId}_${Date.now()}`;

	// Get count of transactions that need fuzzy matching
	const count = await (db as any).transactions.count({
		where: {
			user_id: userId,
			fuzzy_matched_at: null,
			cleaned_merchant_name: { not: null }
		}
	});

	// Initialize progress
	const progress: FuzzyMatchingProgress = {
		jobId,
		userId,
		status: 'pending',
		total: count,
		processed: 0,
		matched: 0,
		startedAt: null,
		completedAt: null
	};

	progressStore.set(jobId, progress);

	// Start processing asynchronously (don't await)
	processFuzzyMatchingJob(jobId, userId).catch((error) => {
		const currentProgress = progressStore.get(jobId);
		if (currentProgress) {
			currentProgress.status = 'failed';
			currentProgress.error = error.message;
			currentProgress.completedAt = new Date();
		}
	});

	return jobId;
}

/**
 * Process fuzzy matching job
 */
async function processFuzzyMatchingJob(jobId: string, userId: number): Promise<void> {
	const progress = progressStore.get(jobId);
	if (!progress) {
		throw new Error(`Job ${jobId} not found`);
	}

	progress.status = 'processing';
	progress.startedAt = new Date();

	try {
		// Load all known merchants once
		const knownMerchants = await loadAllMerchantNames();
		console.log(`🔍 Fuzzy matching: Loaded ${knownMerchants.length} merchants`);

		// Process transactions in batches
		const batchSize = 100;
		let offset = 0;
		let hasMore = true;

		while (hasMore) {
			// Fetch batch of transactions
			const transactions = await (db as any).transactions.findMany({
				where: {
					user_id: userId,
					fuzzy_matched_at: null,
					cleaned_merchant_name: { not: null }
				},
				select: {
					id: true,
					cleaned_merchant_name: true
				},
				take: batchSize,
				skip: offset,
				orderBy: { created_at: 'desc' }
			});

			if (transactions.length === 0) {
				hasMore = false;
				break;
			}

			// Process each transaction
			const updates: Array<{ id: number; fuzzy_match_merchant: string | null }> = [];
			let matchedCount = 0;

			for (const transaction of transactions) {
				const cleanedName = transaction.cleaned_merchant_name;
				if (!cleanedName) continue;

				// Try fuzzy matching
				const match = findClosestMerchant(cleanedName, knownMerchants);

				if (match) {
					updates.push({
						id: transaction.id,
						fuzzy_match_merchant: match.merchant
					});
					matchedCount++;
				}

				progress.processed++;
			}

			// Batch update database
			if (updates.length > 0) {
				for (const update of updates) {
					await (db as any).transactions.update({
						where: { id: update.id },
						data: {
							fuzzy_match_merchant: update.fuzzy_match_merchant,
							fuzzy_matched_at: new Date(),
							updated_at: new Date()
						}
					});
				}
				progress.matched += matchedCount;
			}

			offset += batchSize;
			console.log(
				`🔍 Fuzzy matching: Processed ${progress.processed}/${progress.total}, matched ${progress.matched}`
			);
		}

		// Mark as completed
		progress.status = 'completed';
		progress.completedAt = new Date();
		console.log(`✅ Fuzzy matching completed: ${progress.matched}/${progress.total} matched`);
	} catch (error: any) {
		progress.status = 'failed';
		progress.error = error.message;
		progress.completedAt = new Date();
		throw error;
	}
}

/**
 * Get progress for a fuzzy matching job
 */
export function getFuzzyMatchingProgress(jobId: string): FuzzyMatchingProgress | null {
	return progressStore.get(jobId) || null;
}

/**
 * Get or create fuzzy matching job for a user
 */
export async function getOrCreateFuzzyMatchingJob(userId: number): Promise<string> {
	// Check if there's an active job for this user
	for (const [jobId, progress] of progressStore.entries()) {
		if (progress.userId === userId && progress.status === 'processing') {
			return jobId;
		}
	}

	// Create new job
	return await startFuzzyMatchingJob(userId);
}

