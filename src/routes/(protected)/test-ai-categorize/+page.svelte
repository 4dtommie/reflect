<script lang="ts">
	import { Loader2, Play, AlertCircle, CheckCircle, X } from 'lucide-svelte';

	let testing = $state(false);
		let results = $state<{
		success: boolean;
		results: Array<{
			transactionId: number;
			categoryId: number | null;
			categoryName?: string | null;
			confidence: number;
			suggestedKeywords: string[];
			cleanedMerchantName?: string;
			reasoning?: string;
			originalMerchantName?: string;
			originalDescription?: string;
			hasCounterpartyIban?: boolean;
			transactionType?: string;
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
	} | null>(null);

	let batchSize = $state(18); // Default batch size for GPT-5
	let selectedModel = $state('gpt-5'); // Default model (GPT-5 for highest accuracy)
	let availableTransactions = $state<Array<{ id: number; description: string; merchantName: string }>>([]);
	
	// GPT-5 optimization settings (optimized for speed)
	let reasoningEffort = $state<'minimal' | 'low' | 'medium' | 'high'>('minimal');
	let verbosity = $state<'low' | 'medium' | 'high'>('low');
	let includeReasoning = $state(false); // No explanation for faster responses
	let temperature = $state(0.3);
	
	// Check if selected model is GPT-5
	const isGPT5Model = $derived(
		selectedModel.startsWith('gpt-5') || selectedModel.startsWith('o1') || selectedModel.startsWith('o3')
	);

	// Available models with speed/accuracy info
	const models = [
		{
			value: 'gpt-5-nano',
			label: 'GPT-5 Nano',
			description: 'Newest, most economical, high volume',
			speed: 'Very Fast',
			cost: 'Lowest',
			recommendedBatchSize: 12
		},
		{
			value: 'gpt-5-mini',
			label: 'GPT-5 Mini',
			description: 'Newest, fast & cost-efficient, best balance',
			speed: 'Very Fast',
			cost: 'Low',
			recommendedBatchSize: 15
		},
		{
			value: 'gpt-5',
			label: 'GPT-5',
			description: 'Newest, highest accuracy, expert-level reasoning',
			speed: 'Fast',
			cost: 'Medium-High',
			recommendedBatchSize: 18
		},
		{
			value: 'gpt-4o-mini',
			label: 'GPT-4o Mini',
			description: 'Fast & cheap, good accuracy (previous gen)',
			speed: 'Very Fast',
			cost: 'Low',
			recommendedBatchSize: 10
		},
		{
			value: 'gpt-3.5-turbo',
			label: 'GPT-3.5 Turbo',
			description: 'Very fast, lower accuracy (older model)',
			speed: 'Fastest',
			cost: 'Very Low',
			recommendedBatchSize: 8
		},
		{
			value: 'gpt-4o',
			label: 'GPT-4o',
			description: 'Fast, high accuracy (previous gen)',
			speed: 'Fast',
			cost: 'Medium',
			recommendedBatchSize: 12
		},
		{
			value: 'gpt-4',
			label: 'GPT-4',
			description: 'Accurate, slower (previous gen)',
			speed: 'Slower',
			cost: 'High',
			recommendedBatchSize: 15
		}
	];

	// Get recommended batch size for selected model
	const recommendedBatchSize = $derived(
		models.find(m => m.value === selectedModel)?.recommendedBatchSize || 10
	);

	// Check if batch size is too large
	const batchSizeWarning = $derived(
		batchSize > recommendedBatchSize + 3
			? `⚠️ Batch size is large. For ${selectedModel}, recommended max is ${recommendedBatchSize} transactions for best accuracy.`
			: null
	);

	// Load available uncategorized transactions
	async function loadTransactions() {
		try {
			const response = await fetch('/api/transactions?pageSize=50');
			if (!response.ok) throw new Error('Failed to load transactions');
			const data = await response.json();
			
			// Filter for uncategorized transactions
			availableTransactions = data.transactions
				.filter((t: any) => !t.category_id)
				.map((t: any) => ({
					id: t.id,
					description: t.description,
					merchantName: t.merchantName
				}));
		} catch (err) {
			console.error('Error loading transactions:', err);
		}
	}

	// Load transactions on mount
	$effect(() => {
		loadTransactions();
	});

	async function testAICategorization() {
		testing = true;
		results = null;
		const startTime = Date.now();

		try {
			// Randomly select transactions based on batch size
			if (availableTransactions.length === 0) {
				throw new Error('No uncategorized transactions available');
			}

			// Shuffle array and take first N
			const shuffled = [...availableTransactions].sort(() => Math.random() - 0.5);
			const selectedCount = Math.min(batchSize, shuffled.length);
			const transactionIds = shuffled.slice(0, selectedCount).map(t => t.id);

			if (transactionIds.length === 0) {
				throw new Error('No transactions available');
			}

			const response = await fetch('/api/test-ai-categorize', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					transactionIds,
					batchSize,
					model: selectedModel,
					reasoningEffort: isGPT5Model ? reasoningEffort : undefined,
					verbosity: isGPT5Model ? verbosity : undefined,
					includeReasoning,
					temperature: !isGPT5Model ? temperature : undefined,
				})
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ 
					error: `HTTP ${response.status}: ${response.statusText}`,
					details: 'Failed to parse error response'
				}));
				const errorMessage = errorData.error || errorData.message || `HTTP ${response.status}`;
				const errorDetails = errorData.details ? `\n\nDetails: ${errorData.details}` : '';
				throw new Error(errorMessage + errorDetails);
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

</script>

<div class="max-w-6xl mx-auto">
	<h1 class="text-4xl font-bold mb-6">Test AI Categorization</h1>

	<p class="text-lg mb-8 text-base-content/70">
		Test the AI categorization service with a small batch of transactions. 
		This page shows detailed debugging information including tokens, time, and results.
	</p>

	{#if results?.error?.includes('OpenAI API is not configured') || results?.error?.includes('OPENAI_API_KEY')}
		<div class="alert alert-warning mb-6">
			<AlertCircle size={20} />
			<div>
				<div class="font-semibold">OpenAI API Key Missing</div>
				<div class="text-sm mt-1">
					To use AI categorization, you need to set the <code class="bg-base-300 px-1 rounded">OPENAI_API_KEY</code> environment variable in your <code class="bg-base-300 px-1 rounded">.env</code> file.
					<br />
					<strong>Quick fix:</strong> Create a <code class="bg-base-300 px-1 rounded">.env</code> file in the project root and add: <code class="bg-base-300 px-1 rounded">OPENAI_API_KEY=sk-your-key-here</code>
				</div>
			</div>
		</div>
	{/if}

	<!-- Configuration -->
	<div class="card bg-base-200 mb-6">
		<div class="card-body">
			<h2 class="card-title mb-4">Test Configuration</h2>
			
			<div class="form-control mb-4">
				<label class="label" for="batch-size">
					<span class="label-text">Batch Size</span>
					<button
						type="button"
						class="btn btn-xs btn-ghost"
						onclick={() => (batchSize = recommendedBatchSize)}
						disabled={testing}
						title="Set to recommended batch size"
					>
						Use recommended ({recommendedBatchSize})
					</button>
				</label>
				<input
					id="batch-size"
					type="number"
					class="input input-bordered {batchSizeWarning ? 'input-warning' : ''}"
					bind:value={batchSize}
					min="1"
					max="20"
					disabled={testing}
				/>
				<label class="label" for="batch-size">
					<span class="label-text-alt">
						Number of transactions per batch (1-20)
						{#if batchSizeWarning}
							<br />
							<span class="text-warning font-semibold">{batchSizeWarning}</span>
						{:else}
							<br />
							<span class="text-base-content/60">Recommended: {recommendedBatchSize} for {selectedModel} (larger batches may reduce accuracy)</span>
						{/if}
					</span>
				</label>
			</div>

			<div class="form-control mb-4">
				<label class="label" for="model-select">
					<span class="label-text">Model</span>
				</label>
				<select
					id="model-select"
					class="select select-bordered"
					bind:value={selectedModel}
					disabled={testing}
				>
					{#each models as model}
						<option value={model.value}>
							{model.label} - {model.description} ({model.speed}, {model.cost})
						</option>
					{/each}
				</select>
				<label class="label" for="model-select">
					<span class="label-text-alt">
						Choose model to test speed and accuracy
						<br />
						<span class="text-base-content/60">Optimal batch size: {recommendedBatchSize} transactions</span>
					</span>
				</label>
			</div>

			<!-- Advanced Settings Panel -->
			<details class="collapse collapse-arrow bg-base-300 mb-4">
				<summary class="collapse-title text-lg font-semibold cursor-pointer">
					⚙️ Advanced Settings
				</summary>
				<div class="collapse-content">
					<div class="pt-4 space-y-4">
						<!-- Include Reasoning Toggle -->
						<div class="form-control">
							<label class="label cursor-pointer">
								<span class="label-text">
									<span class="font-semibold">Include reasoning in response</span>
									<br />
									<span class="text-sm text-base-content/60">
										Turn off for faster responses (saves tokens and time)
									</span>
								</span>
								<input
									type="checkbox"
									class="toggle toggle-primary"
									bind:checked={includeReasoning}
									disabled={testing}
								/>
							</label>
						</div>


						{#if isGPT5Model}
							<!-- GPT-5 Specific Settings -->
							<div class="divider">GPT-5 Optimization</div>
							
							<div class="form-control">
								<label class="label" for="reasoning-effort">
									<span class="label-text font-semibold">Reasoning Effort</span>
								</label>
								<select
									id="reasoning-effort"
									class="select select-bordered"
									bind:value={reasoningEffort}
									disabled={testing}
								>
									<option value="minimal">Minimal (Fastest, 40-50% faster)</option>
									<option value="low">Low (Balanced, 25-40% faster) ⭐ Recommended</option>
									<option value="medium">Medium (Default)</option>
									<option value="high">High (Most thorough, slowest)</option>
								</select>
								<label class="label" for="reasoning-effort">
									<span class="label-text-alt">
										Controls how much reasoning the model does. Lower = faster responses.
									</span>
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
									<option value="low">Low (Faster, less explanation) ⭐ Recommended</option>
									<option value="medium">Medium (Default)</option>
									<option value="high">High (More explanation, slower)</option>
								</select>
								<label class="label" for="verbosity">
									<span class="label-text-alt">
										Controls response verbosity. Lower = faster generation.
									</span>
								</label>
							</div>
						{:else}
							<!-- Non-GPT-5 Settings -->
							<div class="divider">Model Settings</div>
							
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
									<span>0.0 (Deterministic)</span>
									<span class="font-semibold">{temperature}</span>
									<span>1.0 (Creative)</span>
								</div>
								<label class="label" for="temperature">
									<span class="label-text-alt">
										Lower = more consistent, Higher = more variable. Recommended: 0.3
									</span>
								</label>
							</div>
						{/if}

						<div class="alert alert-info mt-4">
							<div>
								<div class="font-semibold">💡 Speed Tips</div>
								<div class="text-sm mt-1">
									{#if isGPT5Model}
										• Use "Minimal" reasoning effort for fastest responses<br />
										• Turn off "Include reasoning" to save tokens and time<br />
										• Use "Low" verbosity for faster generation
									{:else}
										• Lower temperature = faster, more consistent<br />
										• Turn off "Include reasoning" to save tokens
									{/if}
								</div>
							</div>
						</div>
					</div>
				</div>
			</details>

			{#if batchSizeWarning}
				<div class="alert alert-warning mb-4">
					<AlertCircle size={20} />
					<div>
						<div class="font-semibold">Large batch size may reduce accuracy</div>
						<div class="text-sm mt-1">
							With {batchSize} transactions, the AI may get confused or mix up transaction details. 
							For best results, use batches of {recommendedBatchSize} or fewer transactions.
						</div>
					</div>
				</div>
			{/if}

			<div class="alert alert-info mb-4">
				<AlertCircle size={20} />
				<div>
					<div class="font-semibold">Random Selection</div>
					<div class="text-sm mt-1">
						{availableTransactions.length} uncategorized transactions available.
						<br />
						Click "Test AI Categorization" to randomly select {batchSize} transaction{batchSize !== 1 ? 's' : ''} for testing.
					</div>
				</div>
			</div>

			<button
				class="btn btn-primary"
				onclick={testAICategorization}
				disabled={testing || availableTransactions.length === 0}
			>
				{#if testing}
					<Loader2 size={20} class="animate-spin" />
					Testing...
				{:else}
					<Play size={20} />
					Test AI Categorization
				{/if}
			</button>
		</div>
	</div>

	<!-- Results -->
	{#if results}
		<div class="card bg-base-200 mb-6">
			<div class="card-body">
				<h2 class="card-title mb-4">Test Results</h2>

				{#if results.error}
					<div class="alert alert-error mb-4">
						<AlertCircle size={20} />
						<span>{results.error}</span>
					</div>
				{:else if results.success}
					<div class="alert alert-success mb-4">
						<CheckCircle size={20} />
						<span>Test completed successfully!</span>
					</div>
				{/if}

				<!-- Performance Stats -->
				<div class="stats stats-vertical lg:stats-horizontal shadow w-full mb-6">
				<div class="stat">
					<div class="stat-title">Time Taken</div>
					<div class="stat-value text-primary">
						{results.timeTaken ? (results.timeTaken / 1000).toFixed(2) : 'N/A'}s
					</div>
					<div class="stat-desc">Model: {results.model || selectedModel}</div>
				</div>
					{#if results.tokensUsed}
						<div class="stat">
							<div class="stat-title">Prompt Tokens</div>
							<div class="stat-value text-secondary">{results.tokensUsed.prompt}</div>
						</div>
						<div class="stat">
							<div class="stat-title">Completion Tokens</div>
							<div class="stat-value text-accent">{results.tokensUsed.completion}</div>
						</div>
						<div class="stat">
							<div class="stat-title">Total Tokens</div>
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

				<!-- Cost Estimate -->
				{#if results.tokensUsed}
					{@const inputCost = (results.tokensUsed.prompt / 1_000_000) * 0.15}
					{@const outputCost = (results.tokensUsed.completion / 1_000_000) * 0.60}
					{@const totalCost = inputCost + outputCost}
					<div class="alert alert-info mb-4">
						<div class="flex justify-between items-center">
							<span>Estimated Cost (gpt-4o-mini):</span>
							<span class="font-bold">${totalCost.toFixed(6)}</span>
						</div>
						<div class="text-xs mt-2">
							Input: ${inputCost.toFixed(6)} | Output: ${outputCost.toFixed(6)}
						</div>
					</div>
				{/if}

				<!-- Results Table -->
				{#if results.results.length > 0}
					{@const hasReasoning = results.results.some(r => r.reasoning)}
					<div class="mb-6">
						<h3 class="text-xl font-semibold mb-4">Categorization Results</h3>
						<div class="overflow-x-auto">
							<table class="table table-zebra w-full">
								<thead>
									<tr>
										<th class="w-40">Category</th>
										<th class="w-32">Confidence</th>
										<th class="w-80">Merchant</th>
										<th class="w-80">Keywords</th>
										<th class="w-20">IBAN</th>
										<th class="w-32">Type</th>
										{#if hasReasoning}
											<th class="w-64">Reasoning</th>
										{/if}
									</tr>
								</thead>
								<tbody>
									{#each results.results as result}
										{@const hasOriginalData = result.originalMerchantName || result.originalDescription}
										{@const tooltipText = hasOriginalData 
											? `Transaction ID: ${result.transactionId}\nRaw Merchant: ${result.originalMerchantName || 'N/A'}\nDescription: ${result.originalDescription || 'N/A'}` 
											: `Transaction ID: ${result.transactionId}`}
										<tr class="hover:bg-base-300/50">
											<td
												class="tooltip {hasOriginalData ? 'cursor-help' : ''}"
												data-tip={tooltipText}
											>
												{#if result.categoryName}
													<div class="font-medium">{result.categoryName}</div>
													<div class="text-xs text-base-content/50">ID: {result.categoryId}</div>
												{:else if result.categoryId}
													<div class="text-base-content/70">Category {result.categoryId}</div>
												{:else}
													<span class="text-base-content/50">null</span>
												{/if}
											</td>
											<td>
												<div class="flex items-center gap-2">
													<progress
														class="progress progress-primary w-20"
														value={result.confidence * 100}
														max="100"
													></progress>
													<span class="text-sm whitespace-nowrap">{(result.confidence * 100).toFixed(0)}%</span>
												</div>
											</td>
											<td>
												{#if result.cleanedMerchantName}
													<div 
														class="tooltip cursor-help font-medium"
														data-tip={`Raw: ${result.originalMerchantName || 'N/A'}`}
													>
														{result.cleanedMerchantName}
													</div>
												{:else if result.originalMerchantName}
													<div class="text-base-content/70 font-medium">
														{result.originalMerchantName}
													</div>
												{:else}
													<span class="text-base-content/50 text-sm">-</span>
												{/if}
											</td>
											<td>
												<div class="flex flex-wrap gap-1">
													{#each result.suggestedKeywords as keyword}
														<span class="badge badge-primary badge-sm">{keyword}</span>
													{/each}
													{#if result.suggestedKeywords.length === 0}
														<span class="text-base-content/50 text-sm">-</span>
													{/if}
												</div>
											</td>
											<td class="text-center">
												{#if result.hasCounterpartyIban}
													<CheckCircle size={20} class="text-success mx-auto" />
												{:else}
													<span class="text-base-content/30">-</span>
												{/if}
											</td>
											<td>
												<span class="badge badge-outline badge-sm">{result.transactionType || 'Other'}</span>
											</td>
											{#if hasReasoning}
												<td 
													class="text-sm text-base-content/70 max-w-xs"
													title={result.reasoning || ''}
												>
													{#if result.reasoning}
														{result.reasoning}
													{:else}
														<span class="text-base-content/50">-</span>
													{/if}
												</td>
											{/if}
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
									<X size={20} />
									<div>
										<div class="font-semibold">Transaction {error.transactionId}</div>
										<div class="text-sm">{error.error}</div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Prompt (for debugging) -->
				{#if results.prompt}
					<div class="collapse collapse-arrow bg-base-300 mb-4">
						<input type="checkbox" />
						<div class="collapse-title text-sm font-medium">Show Prompt Sent to OpenAI</div>
						<div class="collapse-content">
							<pre class="text-xs overflow-x-auto bg-base-100 p-4 rounded whitespace-pre-wrap">{results.prompt}</pre>
						</div>
					</div>
				{/if}

				<!-- Raw JSON (for debugging) -->
				<div class="collapse collapse-arrow bg-base-300">
					<input type="checkbox" />
					<div class="collapse-title text-sm font-medium">Show Raw JSON Response</div>
					<div class="collapse-content">
						<pre class="text-xs overflow-x-auto bg-base-100 p-4 rounded">{JSON.stringify(results, null, 2)}</pre>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Info about available transactions -->
	{#if availableTransactions.length === 0}
		<div class="alert alert-warning">
			<AlertCircle size={20} />
			<span>No uncategorized transactions found. Upload some transactions first!</span>
		</div>
	{/if}
</div>

