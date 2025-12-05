/**
 * AI Categorization Service
 * 
 * Uses OpenAI API to categorize transactions that couldn't be matched via keywords.
 * Also suggests keywords that are automatically added to improve future matching.
 */

import OpenAI from 'openai';
import { db } from '$lib/server/db';
import { aiConfig, isAIAvailable, systemPrompt } from './config';
import { prompts } from './prompts';

// Initialize OpenAI client
const openai = aiConfig.apiKey ? new OpenAI({ apiKey: aiConfig.apiKey }) : null;

/**
 * Category data for AI prompt
 */
export interface CategoryForAI {
	id: number;
	name: string;
	description: string | null;
	group: string | null;
	parent_id: number | null;
	tier: string | null; // 'most' | 'medium' | 'less' | null
}

/**
 * Transaction data for AI categorization
 */
export interface TransactionForAI {
	id: number;
	description: string;
	merchantName: string;
	amount: number;
	type: string;
	is_debit: boolean;
	date: string;
}

/**
 * AI categorization result for a single transaction
 */
export interface AICategorizationResult {
	transactionId: number;
	categoryId: number | null;
	categoryName?: string; // Optional category name (when using name-based categorization)
	confidence: number; // 0.0 - 1.0
	cleanedMerchantName?: string; // AI-generated cleaned merchant name
	merchantNameOptions?: string[]; // 3 alternative merchant name suggestions
	reasoning?: string; // Optional explanation
}

/**
 * Batch result from AI categorization
 */
export interface AICategorizationBatchResult {
	results: AICategorizationResult[];
	errors: Array<{
		transactionId: number;
		error: string;
	}>;
	tokensUsed?: {
		prompt: number;
		completion: number;
		total: number;
	};
	prompt?: string; // The exact prompt sent to OpenAI (for debugging)
}

/**
 * Split transactions into batches for AI processing
 * Uses configured batch size, but can be overridden
 */
export function batchTransactions(
	transactions: TransactionForAI[],
	batchSize?: number
): TransactionForAI[][] {
	const size = batchSize || aiConfig.batchSize;
	const batches: TransactionForAI[][] = [];

	for (let i = 0; i < transactions.length; i += size) {
		batches.push(transactions.slice(i, i + size));
	}

	return batches;
}

/**
 * Load all categories formatted for AI prompt
 * Excludes categories that AI shouldn't categorize (e.g., "Transfers Between Own Accounts")
 */
export async function loadCategoriesForAI(userId: number): Promise<CategoryForAI[]> {
	const categories = await (db as any).categories.findMany({
		where: {
			OR: [
				{ is_default: true },
				{ created_by: userId }
			]
		},
		select: {
			id: true,
			name: true,
			description: true,
			group: true,
			parent_id: true,
			tier: true
		},
		orderBy: [
			{ group: 'asc' },
			{ name: 'asc' }
		]
	});

	// Filter out categories that AI shouldn't categorize
	// "Overboekingen eigen rekeningen" should be handled manually or via rules, not AI
	const excludedCategoryNames = [
		'Overboekingen eigen rekeningen',
		'Transfers Between Own Accounts', // Keep for backwards compatibility
		'Transfers between own accounts', // Keep for backwards compatibility
		'Overig' // Only for manual user selection
	];

	return categories.filter(
		(cat: CategoryForAI) => !excludedCategoryNames.includes(cat.name)
	);
}

/**
 * Create the prompt for AI categorization
 * 
 * Optimized for clarity and token efficiency
 * @param includeReasoning - Whether to include reasoning in the response (faster if false)
 */
export function createCategorizationPrompt(
	categories: CategoryForAI[],
	transactions: TransactionForAI[],
	includeReasoning: boolean = true,
	includeCleanedMerchantName: boolean = false,
	useCategoryNames: boolean = false, // If true, use category names instead of IDs
	enableSearchGrounding: boolean = false // If true, include search instructions
): string {
	// Filter to only show subcategories (categories with parent_id) and standalone categories (no parent, no children)
	// Hide parent categories that have subcategories
	const parentIds = new Set<number>();
	const subcategoryMap = new Map<number, CategoryForAI[]>();

	// First pass: identify parents and group subcategories
	for (const cat of categories) {
		if (cat.parent_id === null) {
			parentIds.add(cat.id);
		} else {
			if (!subcategoryMap.has(cat.parent_id)) {
				subcategoryMap.set(cat.parent_id, []);
			}
			subcategoryMap.get(cat.parent_id)!.push(cat);
		}
	}

	// Filter: only include subcategories OR standalone categories (no parent, no children)
	const categoriesToShow = categories.filter(cat => {
		if (cat.parent_id !== null) {
			// It's a subcategory - always show
			return true;
		}
		// It's a parent - only show if it has no subcategories
		return !subcategoryMap.has(cat.id);
	});

	// Sort all categories alphabetically (no grouping, no tiers)
	categoriesToShow.sort((a, b) => a.name.localeCompare(b.name));

	// Format categories - either with IDs or just names
	const categoriesText = useCategoryNames
		? categoriesToShow
			.map(cat => {
				const description = cat.description ? ` - ${cat.description}` : '';
				return `  ${cat.name}${description}`;
			})
			.join('\n')
		: categoriesToShow
			.map(cat => {
				const description = cat.description ? ` - ${cat.description}` : '';
				return `  ${cat.id}. ${cat.name}${description}`;
			})
			.join('\n');

	// Format transactions - simplified format in Dutch, no date
	const transactionsText = transactions
		.map((t, index) => {
			// Truncate description if too long (keep first 200 chars)
			const description = t.description.length > 200
				? t.description.substring(0, 200) + '...'
				: t.description;
			// Truncate merchant name if too long
			const merchant = t.merchantName.length > 100
				? t.merchantName.substring(0, 100) + '...'
				: t.merchantName;

			return `${index + 1}. Transaction ID ${t.id}
   Beschrijving: ${description}
   Naam: ${merchant}
   Bedrag: €${t.amount.toFixed(2)}
   Type: ${t.type}`;
		})
		.join('\n\n');

	const template = prompts;
	const batchWarning = transactions.length > 12
		? `\n⚠️ BELANGRIJK: Je categoriseert ${transactions.length} transacties. Let goed op elke transactie ID en zorg dat je antwoorden overeenkomen met de juiste transactie. Controleer dubbel dat transactie ID's in je antwoord exact overeenkomen met de input.`
		: '';

	// Build JSON example based on useCategoryNames, cleanedMerchantName and reasoning
	let jsonExample = template.jsonExample;

	if (useCategoryNames) {
		// Using category names instead of IDs
		if (includeCleanedMerchantName && includeReasoning) {
			jsonExample = '{\n  "results": [\n    {\n      "transactionId": 11085,\n      "categoryName": "Uit eten",\n      "confidence": 0.85,\n      "cleanedMerchantName": "Nationale-Nederlanden",\n      "reasoning": "Korte uitleg waarom deze categorie gekozen is."\n    }\n  ]\n}';
		} else if (includeCleanedMerchantName && !includeReasoning) {
			jsonExample = '{\n  "results": [\n    {\n      "transactionId": 11085,\n      "categoryName": "Uit eten",\n      "confidence": 0.85,\n      "cleanedMerchantName": "Nationale-Nederlanden"\n    }\n  ]\n}';
		} else if (!includeCleanedMerchantName && includeReasoning) {
			jsonExample = '{\n  "results": [\n    {\n      "transactionId": 11085,\n      "categoryName": "Uit eten",\n      "confidence": 0.85,\n      "reasoning": "Korte uitleg waarom deze categorie gekozen is."\n    }\n  ]\n}';
		} else {
			jsonExample = '{\n  "results": [\n    {\n      "transactionId": 11085,\n      "categoryName": "Uit eten",\n      "confidence": 0.85\n    }\n  ]\n}';
		}
	} else {
		// Default fallback if useCategoryNames is false (though we prefer names now)
		jsonExample = '{\n  "results": [\n    {\n      "transactionId": 11085,\n      "categoryName": "Uit eten",\n      "confidence": 0.85\n    }\n  ]\n}';
	}


	const cleanedMerchantNameInstruction = includeCleanedMerchantName
		? '\n7. Gecleande transactie naam: Geef een schone, genormaliseerde versie van de transactie naam (cleanedMerchantName).\n   - Verwijder onnodige prefixen en suffixen (bijv. "NL * TRANSACTIE NAAM" → "Transactie naam")\n   - Verwijder bedrijfsvormen: "BV", "NV", "B.V.", "N.V." etc.\n   - Hoofdlettergebruik: Eerste letter hoofdletter, rest kleine letters (bijv. "ALBERT HEIJN" → "Albert Heijn")\n   - Behouden van belangrijke woorden: Behoud merknamen en belangrijke delen van de naam\n   - Voorbeelden: "Starbucks", "ING BANK N.V." → "ING Bank"\n\n8. Merchant Name Options: Geef OOK een array "merchantNameOptions" met precies 3 variaties van de merchant naam:\n   - Optie 1: De meest waarschijnlijke schone naam (hetzelfde als cleanedMerchantName)\n   - Optie 2: Een iets formelere of langere versie (indien van toepassing) of een alternatieve schrijfwijze\n   - Optie 3: Een kortere, meer casual versie of alleen de merknaam\n   - Zorg dat ze uniek zijn en nuttig voor de gebruiker om uit te kiezen.'
		: '';

	const reasoningInstruction = includeReasoning
		? `\n6. ${template.instructions.reasoning}`
		: '\n6. Redenering (reasoning): NIET VERPLICHT. Laat dit veld weg uit je JSON response voor snellere verwerking.';

	const categorySelectionInstruction = useCategoryNames
		? 'Selectieplicht: Je MOET voor elke transactie de meest geschikte categoryName selecteren uit de lijst hierboven. Gebruik de exacte categorie naam zoals getoond (bijv. "Uit eten", "Lunch", "Koffie"). Gebruik NOOIT "Category X" of nummers. Alleen als een categorie absoluut niet past, gebruik je "Niet gecategoriseerd".'
		: `${template.instructions.selection}\n   BELANGRIJK: Gebruik de exacte categorie naam.`;

	const searchInstruction = enableSearchGrounding
		? `\n9. ${template.instructions.search}`
		: '';

	// Build the prompt with the new structure
	const prompt = `${template.intro}

### Beschikbare Categorieën (Context)

${categoriesText}

### Te Categoriseren Transacties (Input)

${transactionsText}

### Instructies voor Categorisatie

${batchWarning}
1. ${categorySelectionInstruction}
2. ${template.instructions.specificity}
3. ${template.instructions.timeBased}
4. ${template.instructions.confidence}
5. Transacties tussen personen: Transacties die lijken alsof ze tussen personen zijn (persoon-naar-persoon overboekingen) moeten op "Niet gecategoriseerd" worden gezet, TENZIJ uit de beschrijving heel duidelijk een categorie op te maken is (bijvoorbeeld "Tikkie koffie" → Koffie, "Betaalverzoek restaurant" → Uit eten).
${reasoningInstruction}${cleanedMerchantNameInstruction}${searchInstruction}

### Vereist JSON Output Formaat

${template.jsonNote}

${jsonExample}`;

	return prompt;
}

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
 * Check if a model is a GPT-5 model (requires max_completion_tokens instead of max_tokens)
 */
function isGPT5Model(model: string): boolean {
	return model.startsWith('gpt-5') || model.startsWith('o1') || model.startsWith('o3');
}

/**
 * Categorize a batch of transactions using AI
 * @param userId - User ID
 * @param transactions - Transactions to categorize
 * @param modelOverride - Optional model override (for testing different models)
 */
export async function categorizeBatchWithAI(
	userId: number,
	transactions: TransactionForAI[],
	modelOverride?: string,
	options?: {
		reasoningEffort?: 'none' | 'low' | 'medium' | 'high';
		verbosity?: 'low' | 'medium' | 'high';
		includeReasoning?: boolean;
		temperature?: number;
		maxTokens?: number;
		includeCleanedMerchantName?: boolean; // Request cleaned merchant name from AI
		useCategoryNames?: boolean; // Use category names instead of IDs
	}
): Promise<AICategorizationBatchResult> {
	if (!isAIAvailable() || !openai) {
		throw new Error('OpenAI API is not configured. Set OPENAI_API_KEY environment variable.');
	}

	if (transactions.length === 0) {
		return { results: [], errors: [] };
	}

	console.log(`🤖 Categorizing ${transactions.length} transactions with AI...`);

	try {
		// Load categories
		const categories = await loadCategoriesForAI(userId);
		console.log(`   📚 Loaded ${categories.length} categories`);

		// Create prompt (with optional reasoning and cleaned merchant name)
		const includeReasoning = options?.includeReasoning ?? false; // Default to false (minimal)
		const includeCleanedMerchantName = options?.includeCleanedMerchantName ?? false;
		const prompt = createCategorizationPrompt(categories, transactions, includeReasoning, includeCleanedMerchantName);

		// Use model override if provided, otherwise use config
		const modelToUse = modelOverride || aiConfig.model;

		// GPT-5 models require max_completion_tokens instead of max_tokens
		// GPT-5 models also don't support custom temperature (only default 1)
		const isGPT5 = isGPT5Model(modelToUse);
		// Use defaults from config
		const reasoningEffort = options?.reasoningEffort || aiConfig.reasoningEffort;
		const verbosity = options?.verbosity || aiConfig.verbosity;

		const requestParams: any = {
			model: modelToUse,
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: prompt }
			],
			response_format: { type: 'json_object' } // Force JSON response
		};

		// Use provided maxTokens or config default
		const maxTokensToUse = options?.maxTokens || aiConfig.maxTokens;

		// Add reasoning_effort and verbosity for GPT-5 models
		if (isGPT5) {
			requestParams.reasoning_effort = reasoningEffort;
			requestParams.verbosity = verbosity;
			requestParams.max_completion_tokens = maxTokensToUse;
		} else {
			// For non-GPT-5 models, use provided temperature or config default
			requestParams.temperature = options?.temperature !== undefined
				? options.temperature
				: aiConfig.temperature;
			requestParams.max_tokens = maxTokensToUse;
		}


		// Call OpenAI API with retry logic
		const response = await retryWithBackoff(
			() => openai!.chat.completions.create(requestParams),
			aiConfig.maxRetries,
			aiConfig.retryDelay
		);

		// Parse response
		const content = response.choices[0]?.message?.content;
		if (!content) {
			// Log full response for debugging
			console.error('❌ OpenAI response has no content:', {
				model: modelToUse,
				choices: response.choices?.length || 0,
				firstChoice: response.choices?.[0],
				finishReason: response.choices?.[0]?.finish_reason,
				response: JSON.stringify(response, null, 2)
			});

			// Provide more helpful error message
			const finishReason = response.choices?.[0]?.finish_reason;
			if (finishReason === 'content_filter') {
				throw new Error('OpenAI filtered the response due to content policy. Try adjusting your prompt or settings.');
			} else if (finishReason === 'length') {
				throw new Error('OpenAI response was cut off due to token limit. Try increasing max_tokens or reducing batch size.');
			} else if (finishReason === 'stop') {
				throw new Error('OpenAI stopped generating (no content returned). This may be a model issue - try a different model or settings.');
			} else {
				throw new Error(`No response content from OpenAI. Finish reason: ${finishReason || 'unknown'}. Check server logs for details.`);
			}
		}

		// Parse JSON response
		let parsedResponse: { results?: AICategorizationResult[] };
		try {
			// Try to parse as JSON
			parsedResponse = JSON.parse(content);
		} catch (parseError) {
			console.error('❌ Failed to parse AI response as JSON:', content);
			throw new Error(`Invalid JSON response from OpenAI: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
		}

		// Validate response structure
		if (!parsedResponse.results || !Array.isArray(parsedResponse.results)) {
			console.error('❌ Invalid response structure:', parsedResponse);
			throw new Error('AI response missing "results" array');
		}

		// Process results and validate
		const results: AICategorizationResult[] = [];
		const errors: Array<{ transactionId: number; error: string }> = [];
		const transactionIds = new Set(transactions.map(t => t.id));

		for (let i = 0; i < parsedResponse.results.length; i++) {
			const result = parsedResponse.results[i];

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
				if (result.categoryName && typeof result.categoryName === 'string') {
					const categoryNameToMatch = result.categoryName;
					const matchedCategory = categories.find(cat =>
						cat.name.toLowerCase().trim() === categoryNameToMatch.toLowerCase().trim()
					);
					if (matchedCategory) {
						categoryId = matchedCategory.id;
					} else {
						errors.push({
							transactionId: result.transactionId,
							error: `Category name "${result.categoryName}" not found in available categories`
						});
						continue;
					}
				} else if (result.categoryId !== null && result.categoryId !== undefined) {
					// Fallback: if categoryId is provided even when using names, use it
					categoryId = typeof result.categoryId === 'number' ? result.categoryId : null;
				}
			} else {
				// Using category IDs (original method)
				categoryId = result.categoryId !== null && result.categoryId !== undefined
					? (typeof result.categoryId === 'number' ? result.categoryId : null)
					: null;
			}

			// Validate and normalize result
			const normalizedResult: AICategorizationResult = {
				transactionId: result.transactionId,
				categoryId,
				confidence: typeof result.confidence === 'number'
					? Math.max(0, Math.min(1, result.confidence)) // Clamp between 0 and 1
					: 0.5, // Default confidence if missing
				// suggestedKeywords removed from interface
				cleanedMerchantName: typeof result.cleanedMerchantName === 'string'
					? result.cleanedMerchantName.trim()
					: undefined,
				reasoning: typeof result.reasoning === 'string' ? result.reasoning : undefined
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
					error: 'No result returned from AI'
				});
			}
		}

		// Track token usage
		const tokensUsed = {
			prompt: response.usage?.prompt_tokens || 0,
			completion: response.usage?.completion_tokens || 0,
			total: response.usage?.total_tokens || 0
		};

		console.log(`   ✅ AI categorization complete:`);
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
		console.error('❌ Error in AI categorization:', error);
		throw error;
	}
}

/**
 * Add suggested keywords to the database
 */
// addSuggestedKeywords removed as we no longer use suggestedKeywords

