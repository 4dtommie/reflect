import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { categorizeTransactionsBatch, type CategorizationOptions } from '$lib/server/categorization/categorizationService';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	const userId = locals.user.id;

	// Create a ReadableStream for SSE
	const stream = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();

			// Helper to send SSE message
			const sendMessage = (data: any) => {
				const message = `data: ${JSON.stringify(data)}\n\n`;
				controller.enqueue(encoder.encode(message));
			};

			try {
				// Parse request body
				let options: CategorizationOptions = {
					skipManual: true,
					skipCategorized: true
				};

				try {
					const body = await request.json();
					if (body.limit) options.limit = body.limit;
					if (body.transactionIds) options.transactionIds = body.transactionIds;
				} catch (err) {
					// Use defaults if body is empty
				}

				// Add progress callback
				options.onProgress = (progress) => {
					sendMessage({
						type: 'progress',
						...progress
					});
				};

				// Start categorization
				const result = await categorizeTransactionsBatch(userId, options);

				// Send final result
				const notCategorized = result.processed - result.categorized - result.skipped;
				sendMessage({
					type: 'complete',
					success: true,
					total: result.total,
					processed: result.processed,
					categorized: result.categorized,
					aiCategorized: 0,
					notCategorized: notCategorized,
					skipped: result.skipped,
					message: `Processed ${result.processed} transactions, categorized ${result.categorized} with keywords, ${notCategorized} remain uncategorized`
				});

				controller.close();
			} catch (err) {
				console.error('❌ Error in categorization stream:', err);
				sendMessage({
					type: 'error',
					error: err instanceof Error ? err.message : 'Failed to categorize transactions'
				});
				controller.close();
			}
		}
	});

	// Return SSE response
	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive'
		}
	});
};

