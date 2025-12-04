/**
 * AI Categorization Configuration
 * 
 * Manages OpenAI API configuration and environment variables.
 */

/**
 * System prompt - focused expert style (Dutch only)
 */
export const systemPrompt = 'Je bent een expert in het categoriseren van financiële transacties. Je taak is om transacties te matchen met de meest geschikte categorie. Reageer altijd alleen met geldige JSON. Geef een JSON object terug met een "results" array.';

export const aiConfig = {
	apiKey: process.env.OPENAI_API_KEY || '',
	model: process.env.OPENAI_MODEL || 'gpt-5-mini',
	maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4000'),
	temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.3'),
	batchSize: parseInt(process.env.OPENAI_BATCH_SIZE || '10'),
	maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES || '3'),
	retryDelay: parseInt(process.env.OPENAI_RETRY_DELAY || '1000'),
	enabled: !!process.env.OPENAI_API_KEY,
	reasoningEffort: 'low' as const,
	verbosity: 'low' as const
};

export const geminiConfig = {
	apiKey: process.env.GEMINI_API_KEY || '',
	model: process.env.GEMINI_MODEL || 'gemini-1.5-flash', // Default to stable model
	maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS || '2000'),
	temperature: parseFloat(process.env.GEMINI_TEMPERATURE || '0.3'),
	enabled: !!process.env.GEMINI_API_KEY
};

/**
 * Validate AI configuration
 * Throws error if API key is missing when AI is required
 */
export function validateAIConfig(): void {
	if (!aiConfig.apiKey) {
		throw new Error('OPENAI_API_KEY is not set. AI categorization is disabled.');
	}
}

/**
 * Check if OpenAI categorization is available
 */
export function isOpenAIAvailable(): boolean {
	return aiConfig.enabled && !!aiConfig.apiKey;
}

/**
 * Check if AI categorization is available (Legacy alias)
 */
export function isAIAvailable(): boolean {
	return isOpenAIAvailable();
}

/**
 * Check if Gemini categorization is available
 */
export function isGeminiAvailable(): boolean {
	return geminiConfig.enabled && !!geminiConfig.apiKey;
}

