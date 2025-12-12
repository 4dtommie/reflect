import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { categorizeAllTransactions } from '$lib/server/categorization/fullCategorizationService';
import { isAIAvailable } from '$lib/server/categorization/config';
import { setProgress, clearProgress, setCancellation } from '$lib/server/categorization/progressStore';

/**
 * Full categorization endpoint
 * Implements iterative categorization flow with live progress updates
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	const userId = locals.user.id;

	try {
		const body = await request.json();
		const { maxIterations, batchSize, skipManual, minConfidence } = body;

		console.log(`🚀 Starting full categorization for user ${userId}...`);

		// Clear any existing progress and cancellation flags
		clearProgress(userId);
		setCancellation(userId, false);

		// Start categorization (this will run synchronously, progress updates via callback)
		const result = await categorizeAllTransactions(userId, {
			maxIterations: maxIterations || 10,
			batchSize: batchSize,
			skipManual: skipManual !== false,
			minConfidence: minConfidence || 0.5,
			enableContextRefinement: true, // Step 3: Time/amount rules for food categories
			enableLowConfidenceRecategorization: true, // Step 4: OpenAI re-check for low-confidence
			onProgress: (progress) => {
				// Store progress for client polling
				setProgress(userId, progress);
				console.log(`   Progress: ${progress.message}`);
			}
		});

		// Clear progress after completion
		clearProgress(userId);

		return json({
			success: result.success,
			totalIterations: result.totalIterations,
			finalUncategorizedCount: result.finalUncategorizedCount,
			totalCategorized: result.totalCategorized,
			keywordMatches: result.keywordMatches,
			ibanMatches: result.ibanMatches,
			merchantNameMatches: result.merchantNameMatches,
			merchantNameReRunMatches: result.merchantNameReRunMatches,
			aiMatches: result.aiMatches,
			keywordsAdded: result.keywordsAdded,
			errors: result.errors,
			matchReasons: result.matchReasons || {},
			aiAvailable: isAIAvailable(),
			aiDebug: result.aiDebug || null
		});
	} catch (err: any) {
		console.error('❌ Full categorization error:', err);

		if (err.status) {
			throw err; // Re-throw SvelteKit errors
		}

		return json({
			message: 'Failed to categorize transactions',
			details: err.message || 'Unknown error'
		}, { status: 500 });
	}
};

/**
 * Stop categorization endpoint
 */
export const DELETE: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	const userId = locals.user.id;

	try {
		console.log(`⏹️  Stopping categorization for user ${userId}...`);
		setCancellation(userId, true);

		return json({
			success: true,
			message: 'Categorization stop requested'
		});
	} catch (err: any) {
		console.error('❌ Error stopping categorization:', err);
		return json({
			message: 'Failed to stop categorization',
			details: err.message || 'Unknown error'
		}, { status: 500 });
	}
};

