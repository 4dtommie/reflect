/**
 * OpenAI Categorization Service
 * 
 * Uses OpenAI API to categorize transactions.
 * Supports 'web_search_preview' for grounding and 'json_schema' for structured output.
 */

import OpenAI from 'openai';
import { aiConfig, isOpenAIAvailable, systemPrompt } from './config';
import {
    createCategorizationPrompt,
    loadCategoriesForAI,
    type TransactionForAI,
    type AICategorizationResult,
    type AICategorizationBatchResult
} from './aiCategorizer';

// Initialize OpenAI client
const openai = aiConfig.apiKey ? new OpenAI({ apiKey: aiConfig.apiKey }) : null;

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
            // console.log(`   ⏳ Rate limit/server error, retrying in ${waitTime}ms (attempt ${attempt + 1}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
    throw new Error('Max retries exceeded');
}

/**
 * Categorize a batch of transactions using OpenAI
 */
export async function categorizeBatchWithOpenAI(
    userId: number,
    transactions: TransactionForAI[],
    modelOverride?: string,
    options?: {
        includeReasoning?: boolean;
        temperature?: number;
        maxTokens?: number;
        enableSearchGrounding?: boolean;
        includeCleanedMerchantName?: boolean;
        includeMerchantNameOptions?: boolean; // Include 3 merchant name variations (for individual categorization)
        useCategoryNames?: boolean;
    }
): Promise<AICategorizationBatchResult> {
    if (!isOpenAIAvailable() || !openai) {
        throw new Error('OpenAI API is not configured. Set OPENAI_API_KEY environment variable.');
    }

    if (transactions.length === 0) {
        return { results: [], errors: [] };
    }

    // console.log(`🤖 Categorizing ${transactions.length} transactions with OpenAI...`);

    try {
        // Load categories
        const categories = await loadCategoriesForAI(userId);
        // console.log(`   📚 Loaded ${categories.length} categories`);

        // Create prompt
        const includeReasoning = options?.includeReasoning ?? false;
        const includeCleanedMerchantName = options?.includeCleanedMerchantName ?? false;
        const useCategoryNames = options?.useCategoryNames ?? false;
        const enableSearchGrounding = options?.enableSearchGrounding ?? false;
        const includeMerchantNameOptions = options?.includeMerchantNameOptions ?? false;
        const prompt = createCategorizationPrompt(categories, transactions, includeReasoning, includeCleanedMerchantName, useCategoryNames, enableSearchGrounding, includeMerchantNameOptions);

        // Log the full prompts being sent to AI
        console.log('\n' + '='.repeat(80));
        console.log('📤 FULL CATEGORIZATION PROMPT');
        console.log('='.repeat(80));
        console.log('\n--- SYSTEM PROMPT ---');
        console.log(systemPrompt);
        console.log('\n--- USER PROMPT ---');
        console.log(prompt);
        console.log('='.repeat(80) + '\n');

        // Use model override if provided, otherwise use config
        const modelToUse = modelOverride || aiConfig.model;

        // Build tools array for search grounding if enabled
        const tools = enableSearchGrounding
            ? [{ type: "web_search" }]
            : undefined;

        // Define JSON Schema for structured output
        const resultSchema = {
            type: "object",
            properties: {
                results: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            transactionId: { type: "number" },
                            categoryName: { type: ["string", "null"] },
                            confidence: { type: "number" },
                            cleanedMerchantName: { type: ["string", "null"] },
                            merchantNameOptions: {
                                type: "array",
                                items: { type: "string" }
                            },
                            reasoning: { type: ["string", "null"] }
                        },
                        required: ["transactionId", "confidence"],
                        additionalProperties: false
                    }
                }
            },
            required: ["results"],
            additionalProperties: false
        };

        // Call OpenAI API with retry logic
        const timerLabel = `OpenAI API Call ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        // console.time(timerLabel);

        let content: string | null = null;

        const response = await retryWithBackoff(
            async () => {
                // If search grounding is enabled, use the new responses API
                if (enableSearchGrounding && 'responses' in (openai as any)) {
                    // console.log('   🌍 Using OpenAI Responses API for Search Grounding...');
                    const response = await (openai as any).responses.create({
                        model: modelToUse,
                        tools: [{ type: "web_search" }],
                        input: prompt, // Responses API uses 'input' instead of 'messages'
                    });

                    // Extract content from Responses API structure
                    // Actual structure based on debug log:
                    // response.output is an array containing items like { type: 'message', content: [...] }
                    if (response.output && Array.isArray(response.output)) {
                        const messageItem = response.output.find((item: any) => item.type === 'message');
                        if (messageItem && messageItem.content && messageItem.content.length > 0) {
                            // content is an array of { type: 'output_text', text: '...' }
                            const textContent = messageItem.content.find((c: any) => c.type === 'output_text');
                            if (textContent && textContent.text) {
                                return textContent.text;
                            }
                            // Fallback if content[0] is directly the text item (though example showed type: output_text)
                            if (messageItem.content[0].text) {
                                return messageItem.content[0].text;
                            }
                        }
                    }

                    // Fallback for previous assumption (output_items) just in case
                    if (response.output_items && response.output_items.length > 0) {
                        const messageItem = response.output_items.find((item: any) => item.type === 'message');
                        if (messageItem && messageItem.content && messageItem.content.length > 0) {
                            return messageItem.content[0].text;
                        }
                    }

                    // console.error('❌ Unexpected OpenAI Responses API format:', JSON.stringify(response, null, 2));
                    throw new Error('Unexpected response format from OpenAI Responses API');
                } else {
                    // Standard Chat Completions API
                    const completion = await openai.chat.completions.create({
                        model: modelToUse,
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: prompt }
                        ],
                        // Only pass tools if we are NOT using web_search (since it failed here)
                        // or if we have other tools. For now, we disable tools here if search is enabled
                        // but we fell back to chat completions (shouldn't happen if responses exists)
                        response_format: {
                            type: "json_schema",
                            json_schema: {
                                name: "categorization_results",
                                schema: resultSchema
                            }
                        },
                        temperature: 1,
                        max_completion_tokens: options?.maxTokens ?? aiConfig.maxTokens,
                    });
                    return completion.choices[0].message.content;
                }
            },
            aiConfig.maxRetries,
            aiConfig.retryDelay
        );

        // console.timeEnd(timerLabel);

        content = response;
        if (!content) {
            throw new Error('OpenAI returned no content');
        }

        // console.log('📝 Raw OpenAI Response:', content.substring(0, 500) + '...'); // Log first 500 chars

        let parsedResponse: { results?: any[] };
        try {
            // The Responses API might return markdown or text, but we asked for JSON in the prompt.
            // However, Responses API doesn't support response_format: json_schema yet (based on docs/errors).
            // So we might need to extract JSON from markdown code blocks if present.
            const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
            const jsonString = jsonMatch ? jsonMatch[1] : content;

            parsedResponse = JSON.parse(jsonString);
            // console.log('✅ Parsed JSON Results:', JSON.stringify(parsedResponse.results, null, 2));
        } catch (e) {
            // console.error('Failed to parse OpenAI JSON:', content);
            throw new Error('Invalid JSON response from OpenAI');
        }

        if (!parsedResponse.results || !Array.isArray(parsedResponse.results)) {
            throw new Error('OpenAI response missing "results" array');
        }

        // Process results (similar to Gemini implementation)
        const results: AICategorizationResult[] = [];
        const errors: Array<{ transactionId: number; error: string }> = [];
        const transactionIds = new Set(transactions.map(t => t.id));

        for (let i = 0; i < parsedResponse.results.length; i++) {
            const result = parsedResponse.results[i];

            // Basic validation
            if (typeof result.transactionId !== 'number' || !transactionIds.has(result.transactionId)) {
                errors.push({
                    transactionId: result.transactionId || 0,
                    error: `Invalid or unknown transactionId: ${result.transactionId}`
                });
                continue;
            }

            // Handle category ID resolution from name
            let categoryId: number | null = null;
            if (result.categoryName && typeof result.categoryName === 'string') {
                const categoryNameToMatch = result.categoryName;
                const matchedCategory = categories.find(cat =>
                    cat.name.toLowerCase().trim() === categoryNameToMatch.toLowerCase().trim()
                );
                if (matchedCategory) {
                    categoryId = matchedCategory.id;
                } else {
                    // Log warning but don't fail - user can manually categorize
                    // console.warn(`⚠️ Category name "${result.categoryName}" not found in available categories`);
                }
            }

            // Normalize result
            const normalizedResult: AICategorizationResult = {
                transactionId: result.transactionId,
                categoryId, // Resolved from name
                categoryName: result.categoryName || undefined,
                confidence: result.confidence || 0.5,
                cleanedMerchantName: result.cleanedMerchantName || undefined,
                merchantNameOptions: result.merchantNameOptions || undefined,
                reasoning: result.reasoning || undefined
            };

            results.push(normalizedResult);
        }

        // Check for missing results
        if (results.length < transactions.length) {
            const missingIds = transactions
                .filter(t => !results.some(r => r.transactionId === t.id))
                .map(t => t.id);

            for (const id of missingIds) {
                errors.push({
                    transactionId: id,
                    error: 'No result returned from OpenAI'
                });
            }
        }

        // Track token usage
        const tokensUsed = {
            prompt: response.usage?.prompt_tokens || 0,
            completion: response.usage?.completion_tokens || 0,
            total: response.usage?.total_tokens || 0
        };

        // console.log(`   ✅ OpenAI categorization complete:`);
        // console.log(`      - Results: ${results.length}/${transactions.length}`);
        // console.log(`      - Tokens: ${tokensUsed.total}`);

        return {
            results,
            errors,
            tokensUsed
        };

    } catch (error) {
        console.error('❌ Error in OpenAI categorization:', error);
        throw error;
    }
}
