<script lang="ts">
	import { Loader2, Play, AlertCircle, ChevronDown, ChevronUp } from 'lucide-svelte';

	let testing = $state(false);
	let results = $state<{
		success: boolean;
		results: Array<{
			transactionId: number;
			categoryId: number | null;
			categoryName?: string | null;
			confidence: number;
			cleanedMerchantName?: string;
			reasoning?: string;
			originalMerchantName?: string;
			originalDescription?: string;
			amount?: number;
			date?: string;
		}>;
		errors: Array<{
			transactionId: number;
			error: string;
		}>;
		tokensUsed?: {
			prompt: number;
			completion: number;
			total: number;
		};
		timeTaken?: number;
		error?: string;
		prompt?: string;
		model?: string;
		provider?: string;
		comparison?: {
			openai: {
				results: Array<any>;
				errors: Array<any>;
				tokensUsed?: { prompt: number; completion: number; total: number };
				model: string;
				timeTaken?: number;
			};
			gemini: {
				results: Array<any>;
				errors: Array<any>;
				tokensUsed?: { prompt: number; completion: number; total: number };
				model: string;
				timeTaken?: number;
			};
		};
	} | null>(null);

	// Settings
	let selectedOpenAIModel = $state('gpt-4o-mini');
	let selectedGeminiModel = $state('gemini-2.5-flash-lite'); // Default to 2.5 flash lite
	let temperature = $state(0.2);
	let maxTokens = $state(800);
	let transactionCount = $state(10);
	let includeReasoning = $state(false);
	let enableSearchGrounding = $state(true);
	let enableMerchantNameCleaning = $state(true);
	let useCategoryNames = $state(true); // Use category names instead of IDs

	// Available OpenAI models
	const openaiModels = [
		{ value: 'gpt-5', label: 'GPT-5', description: 'Newest, highest accuracy, expert-level reasoning' },
		{ value: 'gpt-5.1', label: 'GPT-5.1', description: 'Latest GPT-5 variant, enhanced reasoning' },
		{ value: 'gpt-4.1', label: 'GPT-4.1', description: 'Enhanced GPT-4 variant, improved accuracy' },
		{ value: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'Fast & cheap, good accuracy' },
		{ value: 'gpt-4o', label: 'GPT-4o', description: 'Fast, high accuracy' },
		{ value: 'gpt-4', label: 'GPT-4', description: 'Accurate, slower' },
		{ value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'Very fast, lower accuracy' }
	];

	// Available Gemini models
	const geminiModels = [
		{ value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro Preview', description: 'Latest pro model preview, highest accuracy' },
		{ value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Flash model, fast and efficient' },
		{ value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', description: 'Lite flash model, fastest and most efficient' },
		{ value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', description: 'Flash model, fast and efficient' }
	];

	// Check if model is GPT-5 (for reasoning effort settings)
	const isGPT5Model = $derived(
		selectedOpenAIModel.startsWith('gpt-5') || selectedOpenAIModel.startsWith('o1') || selectedOpenAIModel.startsWith('o3')
	);

	let reasoningEffort = $state<'none' | 'low' | 'medium' | 'high'>('low');
	let verbosity = $state<'low' | 'medium' | 'high'>('low');

	async function testAICategorization() {
		testing = true;
		results = null;
		const startTime = Date.now();

		try {
			const response = await fetch('/api/test-ai-categorize-v2', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					transactionCount,
					openaiModel: selectedOpenAIModel,
					geminiModel: selectedGeminiModel,
					temperature: !isGPT5Model ? temperature : undefined,
					maxTokens,
					includeReasoning,
					reasoningEffort: isGPT5Model ? reasoningEffort : undefined,
					verbosity: isGPT5Model ? verbosity : undefined,
					enableSearchGrounding,
					enableMerchantNameCleaning,
					useCategoryNames
				})
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ 
					error: `HTTP ${response.status}: ${response.statusText}`
				}));
				throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
			}

			const data = await response.json();
			const timeTaken = Date.now() - startTime;

			results = {
				...data,
				timeTaken
			};
		} catch (err) {
			const timeTaken = Date.now() - startTime;
			results = {
				success: false,
				results: [],
				errors: [],
				timeTaken,
				error: err instanceof Error ? err.message : 'Unknown error'
			};
		} finally {
			testing = false;
		}
	}

	let promptExpanded = $state(false);
	let openaiPromptExpanded = $state(false);
	let geminiPromptExpanded = $state(false);
</script>

<div class="max-w-6xl mx-auto">
	<h1 class="text-4xl font-bold mb-6">Test AI categorization</h1>

	<p class="text-lg mb-8 text-base-content/70">
		Test the AI categorization service with random uncategorized transactions. 
		Configure model settings and see detailed results including prompts and reasoning.
	</p>

	{#if results?.error?.includes('No AI provider is configured') || results?.error?.includes('API_KEY')}
		<div class="alert alert-warning mb-6">
			<AlertCircle size={20} />
			<div>
				<div class="font-semibold">AI provider API key missing</div>
				<div class="text-sm mt-1">
					Set at least one of the following in your <code class="bg-base-300 px-1 rounded">.env</code> file:
					<ul class="list-disc list-inside mt-2">
						<li><code class="bg-base-300 px-1 rounded">OPENAI_API_KEY</code> for OpenAI</li>
						<li><code class="bg-base-300 px-1 rounded">GEMINI_API_KEY</code> for Google Gemini</li>
					</ul>
					<p class="mt-2">If both are set, both providers will run in parallel for comparison.</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Settings Panel -->
	<div class="card bg-base-200 mb-6">
		<div class="card-body">
			<h2 class="card-title mb-4">Settings</h2>
			
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<!-- OpenAI Model Selection -->
				<div class="form-control">
					<label class="label" for="openai-model-select">
						<span class="label-text font-semibold">OpenAI Model</span>
					</label>
					<select
						id="openai-model-select"
						class="select select-bordered"
						bind:value={selectedOpenAIModel}
						disabled={testing}
					>
						{#each openaiModels as model}
							<option value={model.value}>
								{model.label} - {model.description}
							</option>
						{/each}
					</select>
				</div>

				<!-- Gemini Model Selection -->
				<div class="form-control">
					<label class="label" for="gemini-model-select">
						<span class="label-text font-semibold">Gemini Model</span>
					</label>
					<select
						id="gemini-model-select"
						class="select select-bordered"
						bind:value={selectedGeminiModel}
						disabled={testing}
					>
						{#each geminiModels as model}
							<option value={model.value}>
								{model.label} - {model.description}
							</option>
						{/each}
					</select>
				</div>

				<!-- Transaction Count -->
				<div class="form-control">
					<label class="label" for="transaction-count">
						<span class="label-text font-semibold">Number of transactions</span>
					</label>
					<input
						id="transaction-count"
						type="number"
						class="input input-bordered"
						bind:value={transactionCount}
						min="1"
						max="20"
						disabled={testing}
					/>
					<label class="label">
						<span class="label-text-alt">Random uncategorized transactions (1-20)</span>
					</label>
				</div>

				<!-- Temperature (non-GPT-5) -->
				{#if !isGPT5Model}
					<div class="form-control">
						<label class="label" for="temperature">
							<span class="label-text font-semibold">Temperature</span>
						</label>
						<input
							id="temperature"
							type="range"
							min="0"
							max="1"
							step="0.1"
							class="range range-primary"
							bind:value={temperature}
							disabled={testing}
						/>
						<div class="w-full flex justify-between text-xs px-2">
							<span>0.0</span>
							<span class="font-semibold">{temperature}</span>
							<span>1.0</span>
						</div>
					</div>
				{/if}

				<!-- Max Tokens -->
				<div class="form-control">
					<label class="label" for="max-tokens">
						<span class="label-text font-semibold">Max tokens</span>
					</label>
					<input
						id="max-tokens"
						type="number"
						class="input input-bordered"
						bind:value={maxTokens}
						min="500"
						max="4000"
						step="100"
						disabled={testing}
					/>
					<label class="label">
						<span class="label-text-alt">Maximum response tokens (500-4000)</span>
					</label>
				</div>

				<!-- Include Reasoning -->
				<div class="form-control">
					<label class="label cursor-pointer">
						<span class="label-text font-semibold">Include reasoning</span>
						<input
							type="checkbox"
							class="toggle toggle-primary"
							bind:checked={includeReasoning}
							disabled={testing}
						/>
					</label>
					<label class="label">
						<span class="label-text-alt">Show AI reasoning for each categorization</span>
					</label>
				</div>

				<!-- GPT-5 Specific Settings (only for OpenAI) -->
				{#if isGPT5Model}
					<div class="alert alert-info col-span-full">
						<div>
							<div class="font-semibold">GPT-5 model selected</div>
							<div class="text-sm mt-1">
								GPT-5 models use reasoning effort and verbosity instead of temperature. 
								Lower settings = faster responses.
							</div>
						</div>
					</div>

					<div class="form-control">
						<label class="label" for="reasoning-effort">
							<span class="label-text font-semibold">Reasoning effort</span>
						</label>
						<select
							id="reasoning-effort"
							class="select select-bordered"
							bind:value={reasoningEffort}
							disabled={testing}
						>
							<option value="none">None (fastest)</option>
							<option value="low">Low (balanced) ⭐ Recommended</option>
							<option value="medium">Medium (default)</option>
							<option value="high">High (most thorough, slowest)</option>
						</select>
						<label class="label">
							<span class="label-text-alt">Controls how much reasoning the model does</span>
						</label>
					</div>

					<div class="form-control">
						<label class="label" for="verbosity">
							<span class="label-text font-semibold">Verbosity</span>
						</label>
						<select
							id="verbosity"
							class="select select-bordered"
							bind:value={verbosity}
							disabled={testing}
						>
							<option value="low">Low (faster, less explanation) ⭐ Recommended</option>
							<option value="medium">Medium (default)</option>
							<option value="high">High (more explanation, slower)</option>
						</select>
						<label class="label">
							<span class="label-text-alt">Controls response verbosity</span>
						</label>
					</div>
				{/if}

				<!-- Search Grounding Toggle (for Gemini 2.5+ models) -->
				<div class="form-control">
					<label class="label cursor-pointer">
						<span class="label-text font-semibold">Enable search grounding</span>
						<input
							type="checkbox"
							class="toggle toggle-primary"
							bind:checked={enableSearchGrounding}
							disabled={testing}
						/>
					</label>
					<label class="label">
						<span class="label-text-alt">Allows Gemini to search the web for additional context (Gemini 2.5+ only, may incur additional costs)</span>
					</label>
				</div>

				<!-- Merchant Name Cleaning Toggle -->
				<div class="form-control">
					<label class="label cursor-pointer">
						<span class="label-text font-semibold">Enable merchant name cleaning</span>
						<input
							type="checkbox"
							class="toggle toggle-primary"
							bind:checked={enableMerchantNameCleaning}
							disabled={testing}
						/>
					</label>
					<label class="label">
						<span class="label-text-alt">Request AI to generate cleaned merchant names (shown in results table)</span>
					</label>
				</div>

				<div class="form-control">
					<label class="label cursor-pointer">
						<span class="label-text font-semibold">Use category names (instead of IDs)</span>
						<input
							type="checkbox"
							class="toggle toggle-primary"
							bind:checked={useCategoryNames}
							disabled={testing}
						/>
					</label>
					<label class="label">
						<span class="label-text-alt">AI returns category names instead of numeric IDs in the prompt. Test both methods to compare performance.</span>
					</label>
				</div>
			</div>

			<div class="mt-6">
				<button
					class="btn btn-primary w-full"
					onclick={testAICategorization}
					disabled={testing}
				>
					{#if testing}
						<Loader2 size={20} class="animate-spin" />
						Testing...
					{:else}
						<Play size={20} />
						Test AI categorization
					{/if}
				</button>
			</div>
		</div>
	</div>

	<!-- Results -->
	{#if results}
		<div class="card bg-base-200 mb-6">
			<div class="card-body">
				<h2 class="card-title mb-4">Results</h2>

				{#if results.error}
					<div class="alert alert-error mb-4">
						<AlertCircle size={20} />
						<span>{results.error}</span>
					</div>
				{:else if results.success}
					<div class="alert alert-success mb-4">
						<span>Test completed successfully!</span>
					</div>
				{/if}

				<!-- Performance Stats -->
				{#if results.comparison}
					<!-- Comparison Mode: Show both providers side-by-side -->
					<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
						<!-- OpenAI Results -->
						<div class="card bg-base-300">
							<div class="card-body">
								<h3 class="card-title text-primary mb-4">OpenAI ({results.comparison.openai.model})</h3>
								<div class="stats stats-vertical shadow w-full mb-4">
									<div class="stat">
										<div class="stat-title">Time taken</div>
										<div class="stat-value text-primary">
											{results.comparison.openai.timeTaken ? (results.comparison.openai.timeTaken / 1000).toFixed(2) : 'N/A'}s
										</div>
									</div>
									<div class="stat">
										<div class="stat-title">Results</div>
										<div class="stat-value text-success">{results.comparison.openai.results.length}</div>
									</div>
									<div class="stat">
										<div class="stat-title">Errors</div>
										<div class="stat-value text-error">{results.comparison.openai.errors.length}</div>
									</div>
									{#if results.comparison.openai.tokensUsed}
										<div class="stat">
											<div class="stat-title">Prompt tokens</div>
											<div class="stat-value text-info">{results.comparison.openai.tokensUsed.prompt}</div>
										</div>
										<div class="stat">
											<div class="stat-title">Response tokens</div>
											<div class="stat-value text-warning">{results.comparison.openai.tokensUsed.completion}</div>
										</div>
										<div class="stat">
											<div class="stat-title">Total tokens</div>
											<div class="stat-value">{results.comparison.openai.tokensUsed.total}</div>
										</div>
									{/if}
								</div>
							</div>
						</div>
						
						<!-- Gemini Results -->
						<div class="card bg-base-300">
							<div class="card-body">
								<h3 class="card-title text-secondary mb-4">Gemini ({results.comparison.gemini.model})</h3>
								<div class="stats stats-vertical shadow w-full mb-4">
									<div class="stat">
										<div class="stat-title">Time taken</div>
										<div class="stat-value text-secondary">
											{results.comparison.gemini.timeTaken ? (results.comparison.gemini.timeTaken / 1000).toFixed(2) : 'N/A'}s
										</div>
									</div>
									<div class="stat">
										<div class="stat-title">Results</div>
										<div class="stat-value text-success">{results.comparison.gemini.results.length}</div>
									</div>
									<div class="stat">
										<div class="stat-title">Errors</div>
										<div class="stat-value text-error">{results.comparison.gemini.errors.length}</div>
									</div>
									{#if results.comparison.gemini.tokensUsed}
										<div class="stat">
											<div class="stat-title">Prompt tokens</div>
											<div class="stat-value text-info">{results.comparison.gemini.tokensUsed.prompt}</div>
										</div>
										<div class="stat">
											<div class="stat-title">Response tokens</div>
											<div class="stat-value text-warning">{results.comparison.gemini.tokensUsed.completion}</div>
										</div>
										<div class="stat">
											<div class="stat-title">Total tokens</div>
											<div class="stat-value">{results.comparison.gemini.tokensUsed.total}</div>
										</div>
									{/if}
								</div>
							</div>
						</div>
					</div>
				{:else}
					<!-- Single Provider Mode -->
					<div class="stats stats-vertical lg:stats-horizontal shadow w-full mb-6">
						<div class="stat">
							<div class="stat-title">Time taken</div>
							<div class="stat-value text-primary">
								{results.timeTaken ? (results.timeTaken / 1000).toFixed(2) : 'N/A'}s
							</div>
							<div class="stat-desc">Provider: {results.provider || 'openai'} | Model: {results.model || selectedOpenAIModel}</div>
						</div>
						{#if results.tokensUsed}
							<div class="stat">
								<div class="stat-title">Prompt tokens</div>
								<div class="stat-value text-secondary">{results.tokensUsed.prompt}</div>
							</div>
							<div class="stat">
								<div class="stat-title">Completion tokens</div>
								<div class="stat-value text-accent">{results.tokensUsed.completion}</div>
							</div>
							<div class="stat">
								<div class="stat-title">Total tokens</div>
								<div class="stat-value">{results.tokensUsed.total}</div>
							</div>
						{/if}
						<div class="stat">
							<div class="stat-title">Results</div>
							<div class="stat-value text-success">{results.results.length}</div>
						</div>
						<div class="stat">
							<div class="stat-title">Errors</div>
							<div class="stat-value text-error">{results.errors.length}</div>
						</div>
					</div>
				{/if}

				<!-- Prompt (Expandable) -->
				{#if results.prompt}
					<div class="collapse collapse-arrow bg-base-300 mb-6">
						<input type="checkbox" bind:checked={promptExpanded} />
						<div class="collapse-title text-lg font-semibold cursor-pointer">
							{#if promptExpanded}
								<ChevronUp size={20} class="inline mr-2" />
							{:else}
								<ChevronDown size={20} class="inline mr-2" />
							{/if}
							Prompt sent to AI
						</div>
						<div class="collapse-content">
							<pre class="text-xs overflow-x-auto bg-base-100 p-4 rounded whitespace-pre-wrap">{results.prompt}</pre>
						</div>
					</div>
				{/if}

				<!-- Categorized Transactions -->
				{#if results.comparison}
					<!-- Comparison Mode: Show both side-by-side -->
					
					<!-- Prompt Dropdowns -->
					{#if results.prompt}
						<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
							<!-- OpenAI Prompt -->
							<div class="collapse collapse-arrow bg-base-300">
								<input type="checkbox" bind:checked={openaiPromptExpanded} />
								<div class="collapse-title text-lg font-semibold cursor-pointer">
									{#if openaiPromptExpanded}
										<ChevronUp size={20} class="inline mr-2" />
									{:else}
										<ChevronDown size={20} class="inline mr-2" />
									{/if}
									OpenAI prompt
								</div>
								<div class="collapse-content">
									<pre class="text-xs overflow-x-auto bg-base-100 p-4 rounded whitespace-pre-wrap">{results.prompt}</pre>
								</div>
							</div>
							
							<!-- Gemini Prompt (same prompt for both) -->
							<div class="collapse collapse-arrow bg-base-300">
								<input type="checkbox" bind:checked={geminiPromptExpanded} />
								<div class="collapse-title text-lg font-semibold cursor-pointer">
									{#if geminiPromptExpanded}
										<ChevronUp size={20} class="inline mr-2" />
									{:else}
										<ChevronDown size={20} class="inline mr-2" />
									{/if}
									Gemini prompt
								</div>
								<div class="collapse-content">
									<pre class="text-xs overflow-x-auto bg-base-100 p-4 rounded whitespace-pre-wrap">{results.prompt}</pre>
								</div>
							</div>
						</div>
					{/if}
					
					<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
						<!-- OpenAI Results -->
						<div>
							<h3 class="text-xl font-semibold mb-4 text-primary">OpenAI results</h3>
							<div class="overflow-x-auto">
								<table class="table table-zebra w-full">
									<thead>
										<tr>
											<th>Merchant</th>
											<th>Category</th>
											<th>Confidence</th>
										</tr>
									</thead>
									<tbody>
										{#each results.comparison.openai.results as result}
											<tr class="hover:bg-base-300/50">
												<td>
													{#if result.cleanedMerchantName}
														<div class="font-medium text-sm">
															{result.cleanedMerchantName}
														</div>
														{#if result.originalMerchantName && result.cleanedMerchantName !== result.originalMerchantName}
															<div 
																class="text-xs text-base-content/50 tooltip tooltip-top cursor-help" 
																data-tip={result.originalDescription ? `Description: ${result.originalDescription.substring(0, 50)}${result.originalDescription.length > 50 ? '...' : ''}` : ''}
																title={result.originalDescription ? `Description: ${result.originalDescription}` : ''}
															>
																Original: {result.originalMerchantName}
															</div>
														{/if}
													{:else}
														<div 
															class="font-medium text-sm tooltip tooltip-top cursor-help" 
															data-tip={result.originalMerchantName || result.originalDescription ? `${result.originalMerchantName || '-'}${result.originalDescription ? ` - ${result.originalDescription.substring(0, 50)}${result.originalDescription.length > 50 ? '...' : ''}` : ''}` : ''}
															title={result.originalMerchantName || result.originalDescription ? `${result.originalMerchantName || '-'}${result.originalDescription ? ` - ${result.originalDescription}` : ''}` : ''}
														>
															{result.originalMerchantName || '-'}
														</div>
													{/if}
												</td>
												<td>
													{#if result.categoryName}
														<div class="font-medium text-sm">{result.categoryName}</div>
													{:else}
														<span class="text-base-content/50 text-sm">-</span>
													{/if}
												</td>
												<td>
													<div class="flex items-center gap-2">
														<progress
															class="progress progress-primary w-16"
															value={result.confidence * 100}
															max="100"
														></progress>
														<span class="text-xs">{(result.confidence * 100).toFixed(0)}%</span>
													</div>
												</td>
											</tr>
											{#if result.reasoning}
												<tr class="bg-base-300/30">
													<td colspan="3" class="text-xs text-base-content/70 p-2">
														<div class="font-semibold mb-1">Reasoning:</div>
														<div>{result.reasoning}</div>
													</td>
												</tr>
											{/if}
										{/each}
									</tbody>
								</table>
							</div>
						</div>
						
						<!-- Gemini Results -->
						<div>
							<h3 class="text-xl font-semibold mb-4 text-secondary">Gemini results</h3>
							<div class="overflow-x-auto">
								<table class="table table-zebra w-full">
									<thead>
										<tr>
											<th>Merchant</th>
											<th>Category</th>
											<th>Confidence</th>
										</tr>
									</thead>
									<tbody>
										{#each results.comparison.gemini.results as result}
											<tr class="hover:bg-base-300/50">
												<td>
													{#if result.cleanedMerchantName}
														<div class="font-medium text-sm">
															{result.cleanedMerchantName}
														</div>
														{#if result.originalMerchantName && result.cleanedMerchantName !== result.originalMerchantName}
															<div 
																class="text-xs text-base-content/50 tooltip tooltip-top cursor-help" 
																data-tip={result.originalDescription ? `Description: ${result.originalDescription.substring(0, 50)}${result.originalDescription.length > 50 ? '...' : ''}` : ''}
																title={result.originalDescription ? `Description: ${result.originalDescription}` : ''}
															>
																Original: {result.originalMerchantName}
															</div>
														{/if}
													{:else}
														<div 
															class="font-medium text-sm tooltip tooltip-top cursor-help" 
															data-tip={result.originalMerchantName || result.originalDescription ? `${result.originalMerchantName || '-'}${result.originalDescription ? ` - ${result.originalDescription.substring(0, 50)}${result.originalDescription.length > 50 ? '...' : ''}` : ''}` : ''}
															title={result.originalMerchantName || result.originalDescription ? `${result.originalMerchantName || '-'}${result.originalDescription ? ` - ${result.originalDescription}` : ''}` : ''}
														>
															{result.originalMerchantName || '-'}
														</div>
													{/if}
												</td>
												<td>
													{#if result.categoryName}
														<div class="font-medium text-sm">{result.categoryName}</div>
													{:else}
														<span class="text-base-content/50 text-sm">-</span>
													{/if}
												</td>
												<td>
													<div class="flex items-center gap-2">
														<progress
															class="progress progress-secondary w-16"
															value={result.confidence * 100}
															max="100"
														></progress>
														<span class="text-xs">{(result.confidence * 100).toFixed(0)}%</span>
													</div>
												</td>
											</tr>
											{#if result.reasoning}
												<tr class="bg-base-300/30">
													<td colspan="3" class="text-xs text-base-content/70 p-2">
														<div class="font-semibold mb-1">Reasoning:</div>
														<div>{result.reasoning}</div>
													</td>
												</tr>
											{/if}
										{/each}
									</tbody>
								</table>
							</div>
						</div>
					</div>
					
					<!-- Comparison Table: Side-by-side for each transaction -->
					<div class="mb-6">
						<h3 class="text-xl font-semibold mb-4">Detailed comparison</h3>
						<div class="overflow-x-auto">
							<table class="table table-zebra w-full">
								<thead>
									<tr>
										<th>Transaction</th>
										<th>OpenAI</th>
										<th>Gemini</th>
										<th>Match</th>
									</tr>
								</thead>
								<tbody>
									{#each results.comparison.openai.results as openaiResult}
										{@const geminiResult = results.comparison.gemini.results.find(r => r.transactionId === openaiResult.transactionId)}
										<tr class="hover:bg-base-300/50">
											<td>
												{#if openaiResult.cleanedMerchantName}
													<div class="font-medium text-sm">
														{openaiResult.cleanedMerchantName}
													</div>
													{#if openaiResult.originalMerchantName && openaiResult.cleanedMerchantName !== openaiResult.originalMerchantName}
														<div 
															class="text-xs text-base-content/50 tooltip tooltip-top cursor-help" 
															data-tip={openaiResult.originalDescription ? `Description: ${openaiResult.originalDescription.substring(0, 50)}${openaiResult.originalDescription.length > 50 ? '...' : ''}` : ''}
															title={openaiResult.originalDescription ? `Description: ${openaiResult.originalDescription}` : ''}
														>
															Original: {openaiResult.originalMerchantName}
														</div>
													{/if}
												{:else}
													<div 
														class="font-medium text-sm tooltip tooltip-top cursor-help" 
														data-tip={openaiResult.originalMerchantName || openaiResult.originalDescription ? `${openaiResult.originalMerchantName || '-'}${openaiResult.originalDescription ? ` - ${openaiResult.originalDescription.substring(0, 50)}${openaiResult.originalDescription.length > 50 ? '...' : ''}` : ''}` : ''}
														title={openaiResult.originalMerchantName || openaiResult.originalDescription ? `${openaiResult.originalMerchantName || '-'}${openaiResult.originalDescription ? ` - ${openaiResult.originalDescription}` : ''}` : ''}
													>
														{openaiResult.originalMerchantName || `Transaction ${openaiResult.transactionId}`}
													</div>
												{/if}
												<div class="text-xs text-base-content/50">ID: {openaiResult.transactionId}</div>
											</td>
											<td>
												{#if openaiResult.categoryName}
													<div class="font-medium text-sm text-primary">{openaiResult.categoryName}</div>
													<div class="text-xs text-base-content/50">{(openaiResult.confidence * 100).toFixed(0)}%</div>
												{:else}
													<span class="text-base-content/50 text-sm">-</span>
												{/if}
											</td>
											<td>
												{#if geminiResult?.categoryName}
													<div class="font-medium text-sm text-secondary">{geminiResult.categoryName}</div>
													<div class="text-xs text-base-content/50">{(geminiResult.confidence * 100).toFixed(0)}%</div>
												{:else}
													<span class="text-base-content/50 text-sm">-</span>
												{/if}
											</td>
											<td>
												{#if openaiResult.categoryId && geminiResult?.categoryId}
													{#if openaiResult.categoryId === geminiResult.categoryId}
														<span class="badge badge-success badge-sm">✓ Match</span>
													{:else}
														<span class="badge badge-warning badge-sm">✗ Different</span>
													{/if}
												{:else if !openaiResult.categoryId && !geminiResult?.categoryId}
													<span class="badge badge-ghost badge-sm">Both none</span>
												{:else}
													<span class="badge badge-error badge-sm">One missing</span>
												{/if}
											</td>
										</tr>
										{#if openaiResult.reasoning || geminiResult?.reasoning}
											<tr class="bg-base-300/30">
												<td colspan="4" class="text-xs text-base-content/70 p-2">
													<div class="grid grid-cols-2 gap-4">
														{#if openaiResult.reasoning}
															<div>
																<div class="font-semibold mb-1 text-primary">OpenAI reasoning:</div>
																<div>{openaiResult.reasoning}</div>
															</div>
														{/if}
														{#if geminiResult?.reasoning}
															<div>
																<div class="font-semibold mb-1 text-secondary">Gemini reasoning:</div>
																<div>{geminiResult.reasoning}</div>
															</div>
														{/if}
													</div>
												</td>
											</tr>
										{/if}
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				{:else if results.results.length > 0}
					<!-- Single Provider Mode -->
					<div class="mb-6">
						<h3 class="text-xl font-semibold mb-4">Categorized transactions</h3>
						<div class="overflow-x-auto">
							<table class="table table-zebra w-full">
								<thead>
									<tr>
										<th>Cleaned merchant name</th>
										<th>Category</th>
										<th>Certainty</th>
										<th>Reasoning</th>
										<th>Details</th>
									</tr>
								</thead>
								<tbody>
									{#each results.results as result}
										<tr class="hover:bg-base-300/50">
											<td>
												{#if result.cleanedMerchantName}
													<div class="font-medium">
														{result.cleanedMerchantName}
													</div>
													{#if result.originalMerchantName && result.cleanedMerchantName !== result.originalMerchantName}
														<div 
															class="text-xs text-base-content/50 tooltip tooltip-top cursor-help" 
															data-tip={result.originalDescription ? `Description: ${result.originalDescription.substring(0, 50)}${result.originalDescription.length > 50 ? '...' : ''}` : ''}
															title={result.originalDescription ? `Description: ${result.originalDescription}` : ''}
														>
															Original: {result.originalMerchantName}
														</div>
													{/if}
												{:else}
													<div 
														class="font-medium tooltip tooltip-top cursor-help" 
														data-tip={result.originalMerchantName || result.originalDescription ? `${result.originalMerchantName || '-'}${result.originalDescription ? ` - ${result.originalDescription.substring(0, 50)}${result.originalDescription.length > 50 ? '...' : ''}` : ''}` : ''}
														title={result.originalMerchantName || result.originalDescription ? `${result.originalMerchantName || '-'}${result.originalDescription ? ` - ${result.originalDescription}` : ''}` : ''}
													>
														{result.originalMerchantName || '-'}
													</div>
												{/if}
											</td>
											<td>
												{#if result.categoryName}
													<div class="font-medium">{result.categoryName}</div>
													<div class="text-xs text-base-content/50">ID: {result.categoryId}</div>
												{:else if result.categoryId}
													<div class="text-base-content/70">Category {result.categoryId}</div>
												{:else}
													<span class="text-base-content/50">No category</span>
												{/if}
											</td>
											<td>
												<div class="flex items-center gap-2">
													<progress
														class="progress progress-primary w-24"
														value={result.confidence * 100}
														max="100"
													></progress>
													<span class="text-sm whitespace-nowrap">{(result.confidence * 100).toFixed(0)}%</span>
												</div>
											</td>
											<td class="max-w-xs">
												{#if result.reasoning}
													<div class="text-sm text-base-content/70" title={result.reasoning}>
														{result.reasoning}
													</div>
												{:else}
													<span class="text-base-content/50 text-sm">-</span>
												{/if}
											</td>
											<td>
												<div class="text-xs text-base-content/60">
													<div>ID: {result.transactionId}</div>
													{#if result.amount !== undefined}
														<div>€{result.amount.toFixed(2)}</div>
													{/if}
													{#if result.date}
														<div>{new Date(result.date).toLocaleDateString()}</div>
													{/if}
												</div>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				{/if}

				<!-- Errors -->
				{#if results.errors.length > 0}
					<div class="mb-6">
						<h3 class="text-xl font-semibold mb-4 text-error">Errors</h3>
						<div class="space-y-2">
							{#each results.errors as error}
								<div class="alert alert-error">
									<AlertCircle size={20} />
									<div>
										<div class="font-semibold">Transaction {error.transactionId}</div>
										<div class="text-sm">{error.error}</div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

