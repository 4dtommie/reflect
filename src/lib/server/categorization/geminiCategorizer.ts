/**
 * Gemini Categorization Service
 * 
 * Uses Google Gemini API to categorize transactions.
 * Similar interface to OpenAI categorizer for easy comparison.
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { geminiConfig, isGeminiAvailable, systemPrompt } from './config';
import {
	createCategorizationPrompt,
	loadCategoriesForAI,
	type TransactionForAI,
	type AICategorizationResult,
	type AICategorizationBatchResult
} from './aiCategorizer';

// Initialize Gemini client
const genAI = geminiConfig.apiKey ? new GoogleGenerativeAI(geminiConfig.apiKey) : null;

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
			// Check if it's a rate limit error (429) or server error (5xx)
			const isRetryable = error?.status === 429 ||
				(error?.status >= 500 && error?.status < 600) ||
				error?.code === 'ECONNRESET' ||
				error?.code === 'ETIMEDOUT';

			if (!isRetryable || attempt === maxRetries - 1) {
				throw error; // Don't retry non-retryable errors or on last attempt
			}

			// Calculate wait time with exponential backoff
			const waitTime = delay * Math.pow(2, attempt);
			console.log(`   ⏳ Rate limit/server error, retrying in ${waitTime}ms (attempt ${attempt + 1}/${maxRetries})...`);
			await new Promise(resolve => setTimeout(resolve, waitTime));
		}
	}
	throw new Error('Max retries exceeded');
}

/**
 * Categorize a batch of transactions using Gemini
 * @param userId - User ID
 * @param transactions - Transactions to categorize
 * @param modelOverride - Optional model override (for testing different models)
 */
export async function categorizeBatchWithGemini(
	userId: number,
	transactions: TransactionForAI[],
	modelOverride?: string,
	options?: {
		includeReasoning?: boolean;
		temperature?: number;
		maxTokens?: number;
		enableSearchGrounding?: boolean; // Enable/disable Google Search grounding
		includeCleanedMerchantName?: boolean; // Request cleaned merchant name from AI
		useCategoryNames?: boolean; // Use category names instead of IDs
	}
): Promise<AICategorizationBatchResult> {
	if (!isGeminiAvailable() || !genAI) {
		throw new Error('Gemini API is not configured. Set GEMINI_API_KEY environment variable.');
	}

	if (transactions.length === 0) {
		return { results: [], errors: [] };
	}

	console.log(`🤖 Categorizing ${transactions.length} transactions with Gemini...`);

	try {
		// Load categories
		const categories = await loadCategoriesForAI(userId);
		console.log(`   📚 Loaded ${categories.length} categories`);

		// Create prompt (with optional reasoning and cleaned merchant name)
		const includeReasoning = options?.includeReasoning ?? false;
		const includeCleanedMerchantName = options?.includeCleanedMerchantName ?? false;
		const useCategoryNames = options?.useCategoryNames ?? false;
		const prompt = createCategorizationPrompt(categories, transactions, includeReasoning, includeCleanedMerchantName, useCategoryNames);

		// Use model override if provided, otherwise use config
		const modelToUse = modelOverride || geminiConfig.model;

		// Check if this is a Gemini 3 Pro model that supports thinking config
		const isGemini3Pro = modelToUse.includes('gemini-3-pro');

		// Build generation config
		// For Gemini 3 Pro, increase max tokens since it uses thinking tokens
		const defaultMaxTokens = isGemini3Pro ? 32000 : (options?.maxTokens || geminiConfig.maxTokens);

		const generationConfig: any = {
			// For Gemini 3 Pro, use default temperature of 1.0 (recommended)
			// For other models, use the configured temperature
			temperature: isGemini3Pro
				? 1.0
				: (options?.temperature !== undefined
					? options.temperature
					: geminiConfig.temperature),
			maxOutputTokens: options?.maxTokens || defaultMaxTokens,
			responseMimeType: isGemini3Pro ? undefined : 'application/json' // Don't force JSON for thinking models
		};

		// Get the model
		const model = genAI.getGenerativeModel({
			model: modelToUse,
			generationConfig: isGemini3Pro ? undefined : generationConfig, // Don't set thinkingConfig in model config for Gemini 3 Pro
			safetySettings: [
				{
					category: HarmCategory.HARM_CATEGORY_HARASSMENT,
					threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
				},
				{
					category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
					threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
				},
				{
					category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
					threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
				},
				{
					category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
					threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
				}
			]
		});

		// Combine system prompt and user prompt
		const fullPrompt = `${systemPrompt}\n\n${prompt}`;

		console.log('📝 Gemini Prompt Preview (first 500 chars):', fullPrompt.substring(0, 500));
		console.log('📝 Gemini Prompt Length:', fullPrompt.length);
		console.log('📝 Full Gemini Prompt:', fullPrompt); // Log full prompt as requested

		// Check if model supports search grounding (Gemini 2.5+ models)
		const supportsSearchGrounding = modelToUse.includes('gemini-2.5') || modelToUse.includes('gemini-2.0');
		const enableSearchGrounding = options?.enableSearchGrounding ?? false;

		// Build tools array for search grounding if enabled
		const tools = supportsSearchGrounding && enableSearchGrounding
			? [{ googleSearch: {} }]
			: undefined;

		// For Gemini 3 Pro, pass thinkingConfig in generateContent call
		// For other models, use the generationConfig from model initialization
		const generateContentOptions = isGemini3Pro
			? {
				generationConfig: {
					...generationConfig,
					thinkingConfig: {
						thinkingLevel: 'low'
					}
				},
				...(tools && { tools })
			}
			: tools ? { tools } : undefined;

		// Call Gemini API with retry logic
		const timerLabel = `Gemini API Call ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
		console.time(timerLabel);
		const response = await retryWithBackoff(
			() => model.generateContent(fullPrompt, generateContentOptions as any),
			3, // maxRetries
			1000 // retryDelay
		);
		console.timeEnd(timerLabel);

		// Parse response - try multiple methods to get text
		let responseText: string = '';

		// Method 1: Try the standard text() method
		try {
			responseText = response.response.text();
		} catch (textError) {
			console.log('⚠️ Standard text() method failed, trying alternative methods...');
		}

		// Method 2: If text() didn't work, try to extract from candidates directly
		if (!responseText || responseText.trim().length === 0) {
			const candidates = response.response.candidates;
			if (candidates && candidates.length > 0) {
				const candidate = candidates[0];
				if (candidate.content && candidate.content.parts) {
					const textParts = candidate.content.parts
						.filter((part: any) => part.text)
						.map((part: any) => part.text)
						.join('');

					if (textParts && textParts.trim().length > 0) {
						responseText = textParts;
						console.log('✅ Extracted text from candidate content parts');
					}
				}
			}
		}

		if (!responseText || responseText.trim().length === 0) {
			// Check if there's a block reason
			const candidates = response.response.candidates;
			if (candidates && candidates.length > 0) {
				const candidate = candidates[0];
				const finishReason = candidate.finishReason;
				const safetyRatings = candidate.safetyRatings;
				const content = candidate.content;

				console.error('❌ Gemini response has no text content:', {
					model: modelToUse,
					finishReason,
					safetyRatings,
					content: content ? JSON.stringify(content, null, 2) : 'No content',
					candidate: JSON.stringify(candidate, null, 2),
					usageMetadata: response.response.usageMetadata
				});

				if (finishReason === 'SAFETY') {
					throw new Error('Gemini blocked the response due to safety concerns. Try adjusting your prompt.');
				} else if (finishReason === 'RECITATION') {
					throw new Error('Gemini blocked the response due to recitation concerns.');
				} else if (finishReason === 'OTHER') {
					throw new Error(`Gemini response blocked for reason: ${finishReason}. Safety ratings: ${JSON.stringify(safetyRatings)}`);
				} else if (finishReason === 'STOP') {
					// STOP usually means the response completed, but maybe there's no text
					// Try to get text from content parts
					if (content && content.parts && content.parts.length > 0) {
						const textParts = content.parts
							.filter((part: any) => part.text)
							.map((part: any) => part.text)
							.join('');

						if (textParts && textParts.trim().length > 0) {
							responseText = textParts;
							console.log('✅ Found text in content parts');
						} else {
							throw new Error(`Gemini response completed (STOP) but no text content found. Content parts: ${JSON.stringify(content.parts)}`);
						}
					} else {
						throw new Error('Gemini response completed (STOP) but no content or parts found.');
					}
				} else if (finishReason === 'MAX_TOKENS') {
					// Response was cut off due to token limit
					// Try to extract partial response from content parts
					if (content && content.parts && content.parts.length > 0) {
						const textParts = content.parts
							.filter((part: any) => part.text)
							.map((part: any) => part.text)
							.join('');

						if (textParts && textParts.trim().length > 0) {
							responseText = textParts;
							console.log('⚠️ Response was cut off (MAX_TOKENS), but extracted partial content');
							console.log(`   Consider increasing maxOutputTokens (current: ${generationConfig.maxOutputTokens})`);
						} else {
							throw new Error(`Gemini response was cut off due to MAX_TOKENS limit (${generationConfig.maxOutputTokens} tokens). Try increasing maxOutputTokens or reducing the number of transactions.`);
						}
					} else {
						throw new Error(`Gemini response was cut off due to MAX_TOKENS limit (${generationConfig.maxOutputTokens} tokens). Try increasing maxOutputTokens or reducing the number of transactions.`);
					}
				} else {
					throw new Error(`Gemini response has no text content. Finish reason: ${finishReason || 'unknown'}`);
				}
			} else {
				throw new Error('No response content from Gemini - no candidates found');
			}
		}

		// Parse JSON response
		let parsedResponse: { results?: any[] };
		try {
			// Try to parse as JSON
			parsedResponse = JSON.parse(responseText);
			console.log('📝 Gemini response parsed:', JSON.stringify(parsedResponse, null, 2).substring(0, 500));
		} catch (parseError) {
			console.error('❌ Failed to parse Gemini response as JSON');
			console.error('   Response length:', responseText.length);
			console.error('   Response preview:', responseText.substring(0, 200));
			console.error('   Response end:', responseText.substring(Math.max(0, responseText.length - 200)));
			console.error('   Finish reason:', response.response.candidates?.[0]?.finishReason);

			// Check if response was cut off due to token limit
			const finishReason = response.response.candidates?.[0]?.finishReason;
			if (finishReason === 'MAX_TOKENS' || responseText.trim().endsWith('...') || !responseText.trim().endsWith('}')) {
				const currentMaxTokens = options?.maxTokens || defaultMaxTokens;
				throw new Error(`Gemini response was cut off due to token limit (${currentMaxTokens} tokens). Response length: ${responseText.length} chars. Try increasing max tokens (current: ${currentMaxTokens}) or reducing batch size.`);
			}

			throw new Error(`Invalid JSON response from Gemini: ${parseError instanceof Error ? parseError.message : 'Unknown error'}. Response preview: ${responseText.substring(0, 100)}...`);
		}

		// Validate response structure
		if (!parsedResponse.results || !Array.isArray(parsedResponse.results)) {
			console.error('❌ Invalid response structure:', parsedResponse);
			throw new Error('Gemini response missing "results" array');
		}

		// Process results and validate
		const results: AICategorizationResult[] = [];
		const errors: Array<{ transactionId: number; error: string }> = [];
		const transactionIds = new Set(transactions.map(t => t.id));

		for (let i = 0; i < parsedResponse.results.length; i++) {
			const result = parsedResponse.results[i];
			console.log(`🔍 Processing Gemini result ${i + 1}:`, {
				transactionId: result.transactionId,
				categoryId: result.categoryId,
				categoryName: result.categoryName,
				useCategoryNames: options?.useCategoryNames
			});

			// Validate required fields
			if (typeof result.transactionId !== 'number') {
				errors.push({
					transactionId: transactions[i]?.id || 0,
					error: `Invalid transactionId in result ${i + 1}`
				});
				continue;
			}

			// Verify transaction ID exists
			if (!transactionIds.has(result.transactionId)) {
				errors.push({
					transactionId: result.transactionId,
					error: `Transaction ID ${result.transactionId} not found in batch`
				});
				continue;
			}

			// Handle category ID or category name
			let categoryId: number | null = null;

			if (options?.useCategoryNames) {
				// If using category names, look up the ID from the category name
				// Gemini might put the category name in categoryId field (as string) or in categoryName field
				let categoryNameToMatch: string | null = null;

				if (result.categoryName && typeof result.categoryName === 'string') {
					categoryNameToMatch = result.categoryName;
				} else if (result.categoryId && typeof result.categoryId === 'string') {
					// Gemini put the category name in categoryId field
					categoryNameToMatch = result.categoryId;
					// Check if it's a "Category X" format - this is wrong, should be actual name
					if (categoryNameToMatch && categoryNameToMatch.match(/^Category\s+\d+$/i)) {
						console.warn(`⚠️ Gemini returned "Category X" format instead of actual category name: "${categoryNameToMatch}"`);
						categoryNameToMatch = null; // Don't try to match this
					} else {
						console.log(`⚠️ Gemini returned category name "${categoryNameToMatch}" in categoryId field instead of categoryName`);
					}
				}

				if (categoryNameToMatch) {
					const searchName = categoryNameToMatch.toLowerCase().trim();
					// Normalize: remove extra spaces, handle slashes consistently
					const normalizedSearchName = searchName.replace(/\s+/g, ' ').trim();

					// Try exact match first
					let matchedCategory = categories.find(cat => {
						const catName = cat.name.toLowerCase().trim().replace(/\s+/g, ' ');
						return catName === normalizedSearchName;
					});

					// If no exact match, try case-insensitive match with normalized spaces
					if (!matchedCategory) {
						matchedCategory = categories.find(cat => {
							const catName = cat.name.toLowerCase().trim().replace(/\s+/g, ' ');
							return catName === normalizedSearchName ||
								catName.replace(/\//g, '/') === normalizedSearchName.replace(/\//g, '/');
						});
					}

					// If still no match, try partial match (contains)
					if (!matchedCategory) {
						matchedCategory = categories.find(cat => {
							const catName = cat.name.toLowerCase().trim();
							return catName.includes(normalizedSearchName) ||
								normalizedSearchName.includes(catName);
						});
					}

					if (matchedCategory) {
						categoryId = matchedCategory.id;
						console.log(`✅ Matched category name "${categoryNameToMatch}" to ID ${categoryId} (${matchedCategory.name})`);
					} else {
						console.warn(`⚠️ Category name "${categoryNameToMatch}" not found.`);
						console.warn(`   Search name: "${normalizedSearchName}"`);
						console.warn(`   Available categories (first 20):`, categories.map(c => c.name).slice(0, 20));
						// Don't skip the result, just set categoryId to null so it shows as uncategorized
						categoryId = null;
					}
				} else if (result.categoryId !== null && result.categoryId !== undefined && typeof result.categoryId === 'number') {
					// Fallback: if categoryId is provided as number even when using names, use it
					categoryId = result.categoryId;
				} else {
					categoryId = null;
				}
			} else {
				// Using category IDs (original method)
				categoryId = result.categoryId !== null && result.categoryId !== undefined
					? (typeof result.categoryId === 'number' ? result.categoryId : null)
					: null;
			}

			// Validate and normalize result
			// Store original categoryName from response if it exists (for debugging/display)
			// Gemini might put it in categoryName or categoryId field
			const originalCategoryName = options?.useCategoryNames
				? (result.categoryName && typeof result.categoryName === 'string'
					? result.categoryName
					: (result.categoryId && typeof result.categoryId === 'string'
						? result.categoryId
						: undefined))
				: undefined;

			const normalizedResult: AICategorizationResult & { originalCategoryName?: string } = {
				transactionId: result.transactionId,
				categoryId,
				confidence: typeof result.confidence === 'number'
					? Math.max(0, Math.min(1, result.confidence)) // Clamp between 0 and 1
					: 0.5, // Default confidence if missing
				suggestedKeywords: Array.isArray(result.suggestedKeywords)
					? result.suggestedKeywords
						.filter((k: any) => typeof k === 'string')
						.map((k: string) => k.trim())
						.filter((k: string) => k.length > 0)
						.slice(0, 2) // Max 2 keywords
					: [],
				cleanedMerchantName: typeof result.cleanedMerchantName === 'string'
					? result.cleanedMerchantName.trim()
					: undefined,
				merchantNameOptions: Array.isArray(result.merchantNameOptions)
					? result.merchantNameOptions.filter((n: any) => typeof n === 'string').map((n: string) => n.trim())
					: undefined,
				reasoning: typeof result.reasoning === 'string' ? result.reasoning : undefined,
				// Include original categoryName if provided by AI (even if matching failed)
				...(originalCategoryName && { originalCategoryName })
			};

			results.push(normalizedResult);
		}

		// Check if we got results for all transactions
		if (results.length < transactions.length) {
			const missingIds = transactions
				.filter(t => !results.some(r => r.transactionId === t.id))
				.map(t => t.id);

			for (const id of missingIds) {
				errors.push({
					transactionId: id,
					error: 'No result returned from Gemini'
				});
			}
		}

		// Track token usage (Gemini provides this in usageMetadata)
		const usageMetadata = response.response.usageMetadata;
		const tokensUsed = {
			prompt: usageMetadata?.promptTokenCount || 0,
			completion: usageMetadata?.candidatesTokenCount || 0,
			total: usageMetadata?.totalTokenCount || 0
		};

		console.log(`   ✅ Gemini categorization complete:`);
		console.log(`      - Results: ${results.length}/${transactions.length}`);
		console.log(`      - Errors: ${errors.length}`);
		console.log(`      - Tokens: ${tokensUsed.total} (prompt: ${tokensUsed.prompt}, completion: ${tokensUsed.completion})`);

		return {
			results,
			errors,
			tokensUsed,
			prompt // Include the prompt for debugging
		};
	} catch (error) {
		console.error('❌ Error in Gemini categorization:', error);
		throw error;
	}
}

