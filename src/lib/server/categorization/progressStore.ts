/**
 * In-memory progress storage for categorization
 * Keyed by userId
 */

export interface CategorizationProgress {
	iteration: number;
	uncategorizedCount: number;
	keywordMatched: number;
	ibanMatched: number;
	merchantNameMatched: number;
	aiMatched: number;
	keywordsAdded: number;
	message: string;
	matchReasons?: Record<number, string>; // Match reasons for transactions
	aiProgress?: {
		currentBatch: number;
		totalBatches: number;
		batchSize: number;
		transactionsProcessed: number;
		resultsReceived: number;
		resultsAboveThreshold: number;
	};
}

const progressStore = new Map<number, CategorizationProgress>();
const cancellationFlags = new Map<number, boolean>();

/**
 * Store progress for a user
 */
export function setProgress(userId: number, progress: CategorizationProgress) {
	progressStore.set(userId, progress);
}

/**
 * Get progress for a user
 */
export function getProgress(userId: number): CategorizationProgress | undefined {
	return progressStore.get(userId);
}

/**
 * Clear progress for a user
 */
export function clearProgress(userId: number) {
	progressStore.delete(userId);
	cancellationFlags.delete(userId);
}

/**
 * Set cancellation flag for a user
 */
export function setCancellation(userId: number, cancelled: boolean) {
	if (cancelled) {
		cancellationFlags.set(userId, true);
	} else {
		cancellationFlags.delete(userId);
	}
}

/**
 * Check if categorization is cancelled for a user
 */
export function isCancelled(userId: number): boolean {
	return cancellationFlags.get(userId) === true;
}

