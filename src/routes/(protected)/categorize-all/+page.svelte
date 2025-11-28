<script lang="ts">
	import { Loader2, Play, CheckCircle, AlertCircle, Square } from 'lucide-svelte';
	import { onMount } from 'svelte';

	interface CategorizedTransaction {
		id: number;
		description: string;
		merchantName: string; // Display name (may be truncated)
		fullMerchantName: string; // Full cleaned merchant name (for tooltip)
		originalMerchantName: string; // Original raw merchant name for tooltip
		amount: number;
		categoryName: string;
		confidence: number;
		matchType: string;
		date: string;
		matchReason?: string; // Reason for categorization (from matchReasons map)
	}

	let categorizing = $state(false);
	let categorizedCount = $state(0);
	let totalTransactions = $state(0);
	let uncategorizedCount = $state(0); // Track uncategorized transactions
	let progress = $state(0);
	let categorizedTransactions = $state<CategorizedTransaction[]>([]);
	let error = $state<string | null>(null);
	let matchReasons = $state<Record<number, string>>({}); // Track match reasons by transaction ID
	let merchantNameReRunMatches = $state(0); // Track re-run matches during categorization
	let elapsedTime = $state(0); // Elapsed time in seconds
	let timerInterval: ReturnType<typeof setInterval> | null = null;
	let result = $state<{
		totalIterations: number;
		finalUncategorizedCount: number;
		totalCategorized: number;
		keywordMatches: number;
		ibanMatches: number;
		merchantNameMatches: number;
		merchantNameReRunMatches?: number;
		aiMatches: number;
		keywordsAdded: number;
		matchReasons?: Record<number, string>;
		aiAvailable?: boolean;
		aiDebug?: {
			batchesProcessed: number;
			totalTransactionsProcessed: number;
			totalResultsReceived: number;
			resultsAboveThreshold: number;
			resultsBelowThreshold: number;
			errors: string[];
			lastBatchDetails?: {
				batchSize: number;
				resultsReceived: number;
				resultsAboveThreshold: number;
				resultsBelowThreshold: number;
				tokensUsed?: { prompt: number; completion: number; total: number };
			};
		};
	} | null>(null);

	// Poll for newly categorized transactions
	let pollInterval: ReturnType<typeof setInterval> | null = null;
	
	// AI progress state
	let aiProgress = $state<{
		currentBatch: number;
		totalBatches: number;
		batchSize: number;
		transactionsProcessed: number;
		resultsReceived: number;
		resultsAboveThreshold: number;
	} | null>(null);
	
	// Merchant name matching is instant, no progress tracking needed
	
	let currentProgressMessage = $state<string>('');

	async function startCategorization() {
		categorizing = true;
		categorizedCount = 0;
		uncategorizedCount = 0;
		progress = 0;
		elapsedTime = 0;
		categorizedTransactions = [];
		error = null;
		result = null;
		aiProgress = null;
		currentProgressMessage = '';
		matchReasons = {}; // Clear match reasons
		merchantNameReRunMatches = 0; // Reset re-run matches
		
		// Start timer
		if (timerInterval) {
			clearInterval(timerInterval);
		}
		timerInterval = setInterval(() => {
			if (categorizing) {
				elapsedTime++;
			}
		}, 1000);

		// Get initial counts
		try {
			const uncatResponse = await fetch('/api/transactions?pageSize=1&uncategorized=true');
			if (uncatResponse.ok) {
				const uncatData = await uncatResponse.json();
				totalTransactions = uncatData.total || 0;
			}
			
			// Get initial categorized count
			const catResponse = await fetch('/api/transactions?pageSize=1');
			if (catResponse.ok) {
				const catData = await catResponse.json();
				// Total is all transactions, so subtract uncategorized to get categorized
				const allTotal = catData.total || 0;
				categorizedCount = allTotal - totalTransactions;
			}
		} catch (err) {
			console.error('Failed to get transaction count:', err);
		}

		// Start polling for categorized transactions
		startPolling();

		try {
			const response = await fetch('/api/categorize-all', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					maxIterations: 10,
					minConfidence: 0.5
				})
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
				throw new Error(errorData.error || `HTTP ${response.status}`);
			}

			const data = await response.json();
			console.log('Categorization result:', data);
			console.log('merchantNameReRunMatches:', data.merchantNameReRunMatches);
			result = data;
			// Update re-run matches from result
			if (data.merchantNameReRunMatches !== undefined) {
				merchantNameReRunMatches = data.merchantNameReRunMatches;
			}
			// Store match reasons from the result
			if (data.matchReasons) {
				matchReasons = data.matchReasons;
				console.log('Stored match reasons:', matchReasons);
				
				// Update existing transactions with match reasons
				categorizedTransactions = categorizedTransactions.map(t => ({
					...t,
					matchReason: matchReasons[t.id] || t.matchReason
				}));
			} else {
				console.log('No match reasons in response');
			}
			// Update counts from result
			if (data.totalCategorized !== undefined) {
				categorizedCount = data.totalCategorized;
			}
			if (data.finalUncategorizedCount !== undefined) {
				uncategorizedCount = data.finalUncategorizedCount;
			}

			// Final poll to get remaining categorized transactions
			await pollCategorizedTransactions();
			
			// Continue polling for a bit after completion to catch any final updates
			await new Promise(resolve => setTimeout(resolve, 2000));
			await pollCategorizedTransactions();

		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error occurred';
			console.error('Categorization error:', err);
		} finally {
			categorizing = false;
			// Keep polling for a short time after completion to catch final updates
			setTimeout(() => {
				stopPolling();
			}, 3000);
		}
	}

	async function stopCategorization() {
		try {
			const response = await fetch('/api/categorize-all', {
				method: 'DELETE'
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
				throw new Error(errorData.error || `HTTP ${response.status}`);
			}

			// Wait a moment for the cancellation to take effect
			await new Promise(resolve => setTimeout(resolve, 1000));
			
			// Final poll to get any transactions categorized before stopping
			await pollCategorizedTransactions();
			
			// Stop polling
			stopPolling();
			
			// Update status
			categorizing = false;
			currentProgressMessage = 'Categorization stopped';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to stop categorization';
			console.error('Stop categorization error:', err);
		}
	}

	function startPolling() {
		// Poll every 1 second for progress updates and categorized transactions
		pollInterval = setInterval(async () => {
			await pollProgress();
			await pollCategorizedTransactions();
		}, 1000);
	}
	
	async function pollProgress() {
		try {
			const response = await fetch('/api/categorize-all/progress');
			if (!response.ok) return;
			
			const data = await response.json();
			if (data.progress) {
				currentProgressMessage = data.progress.message;
				if (data.progress.aiProgress) {
					aiProgress = data.progress.aiProgress;
				}
				// Update re-run matches from progress
				if (data.progress.merchantNameReRunMatches !== undefined) {
					merchantNameReRunMatches = data.progress.merchantNameReRunMatches;
				}
				// Merge match reasons from progress into state
				if (data.progress.matchReasons) {
					matchReasons = { ...matchReasons, ...data.progress.matchReasons };
					// Update existing transactions with new match reasons
					categorizedTransactions = categorizedTransactions.map(t => ({
						...t,
						matchReason: matchReasons[t.id] || t.matchReason
					}));
				}
			}
		} catch (err) {
			console.error('Failed to poll progress:', err);
		}
	}

	function stopPolling() {
		if (pollInterval) {
			clearInterval(pollInterval);
			pollInterval = null;
		}
		// Stop timer
		if (timerInterval) {
			clearInterval(timerInterval);
			timerInterval = null;
		}
	}
	
	// Format elapsed time as MM:SS
	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	}
	
	// Calculate processed count (categorized + uncategorized)
	const processedCount = $derived(categorizedCount + uncategorizedCount);

	async function pollCategorizedTransactions() {
		try {
			// Update uncategorized count
			const uncatResponse = await fetch('/api/transactions?pageSize=1&uncategorized=true');
			if (uncatResponse.ok) {
				const uncatData = await uncatResponse.json();
				uncategorizedCount = uncatData.total || 0;
			}
			
			// Fetch recently categorized transactions (last 5 minutes)
			const response = await fetch('/api/transactions?pageSize=200&recent=true');
			if (!response.ok) return;

			const data = await response.json();
			const categorized = data.transactions
				.filter((t: any) => t.category_id !== null && t.category)
				.map((t: any) => {
					// merchant.name is always the cleaned name (from merchant record or API fallback)
					// merchantName is always the raw name (for tooltip)
					const cleanedName = t.merchant?.name || '';
					const originalName = t.merchantName || '';
					
					// Truncate merchant name if needed (more than 4 words OR more than 22 characters)
					const wordCount = cleanedName.split(/\s+/).filter(w => w.length > 0).length;
					const shouldTruncate = wordCount > 4 || cleanedName.length > 22;
					const displayMerchantName = shouldTruncate && cleanedName.length > 22
						? cleanedName.substring(0, 22) + '...'
						: cleanedName;
					
					return {
						id: t.id,
						description: t.description || '',
						merchantName: displayMerchantName, // Display name (may be truncated)
						fullMerchantName: cleanedName, // Full cleaned name for tooltip
						originalMerchantName: originalName, // Original raw name for tooltip
						amount: typeof t.amount === 'object' && t.amount?.toNumber
							? t.amount.toNumber()
							: Number(t.amount),
						categoryName: t.category?.name || 'Unknown',
						confidence: 1.0, // Keyword/IBAN matches have high confidence, AI will be filtered by API
						matchType: 'keyword', // We'll update this if we track it
						date: t.date,
						matchReason: matchReasons[t.id] || undefined
					};
				});
				
				// Debug: log match reasons for first few transactions
				if (categorized.length > 0) {
					console.log('Match reasons check:', {
						transactionIds: categorized.slice(0, 3).map(t => t.id),
						matchReasonsAvailable: Object.keys(matchReasons).length,
						firstTransactionReason: categorized[0]?.matchReason
					});
				}

			// Add new transactions to the top (avoid duplicates)
			const existingIds = new Set(categorizedTransactions.map(t => t.id));
			const newTransactions = categorized.filter((t: CategorizedTransaction) => !existingIds.has(t.id));
			
			if (newTransactions.length > 0) {
				categorizedTransactions = [...newTransactions, ...categorizedTransactions];
			}
			
			// Update categorized count from actual categorized transactions list
			// Don't fetch from API as it might not be accurate during processing
			categorizedCount = categorizedTransactions.length;
			
			// Update progress - get current uncategorized count
			try {
				const uncatResponse = await fetch('/api/transactions?pageSize=1&uncategorized=true');
				if (uncatResponse.ok) {
					const uncatData = await uncatResponse.json();
					const remainingUncategorized = uncatData.total || 0;
					// Use the initial totalTransactions if available, otherwise calculate from current state
					const currentTotal = totalTransactions > 0 
						? totalTransactions 
						: categorizedCount + remainingUncategorized;
					if (currentTotal > 0) {
						progress = Math.min(100, (categorizedCount / currentTotal) * 100);
					}
				}
			} catch (err) {
				console.error('Failed to update progress:', err);
			}
		} catch (err) {
			console.error('Failed to poll categorized transactions:', err);
		}
	}

	onMount(() => {
		return () => {
			stopPolling();
		};
	});
</script>

	<div class="mb-6">
		<h1 class="text-3xl font-bold mb-2">Categorize all transactions</h1>
		<p class="text-base-content/70">
			Automatically categorize all uncategorized transactions using keywords, IBAN matching, and AI.
		</p>
	</div>

	<div class="flex items-center justify-between mb-6">
		<div>
			<h2 class="text-xl font-semibold mb-1">Status</h2>
			<p class="text-sm text-base-content/70">
				{#if categorizing}
					Categorization in progress...
				{:else if result}
					Complete
				{:else}
					Ready to start
				{/if}
			</p>
		</div>
		<div class="flex gap-2">
			{#if categorizing}
				<button
					class="btn btn-error"
					onclick={stopCategorization}
				>
					<Square class="w-4 h-4 mr-2" />
					Stop
				</button>
			{:else}
				<button
					class="btn btn-primary"
					onclick={startCategorization}
				>
					<Play class="w-4 h-4 mr-2" />
					Start categorization
				</button>
			{/if}
		</div>
	</div>

	{#if categorizing || result}
		<div class="space-y-4 mb-6">
			<!-- Progress Stats -->
			<div class="stats stats-vertical lg:stats-horizontal shadow w-full">
				<div class="stat">
					<div class="stat-title">Verwerkt</div>
					<div class="stat-value text-primary">{processedCount}</div>
					<div class="stat-desc">
						{#if totalTransactions > 0}
							van {totalTransactions} transacties
						{:else}
							transacties
						{/if}
					</div>
				</div>
				<div class="stat">
					<div class="stat-title">Gecategoriseerd</div>
					<div class="stat-value text-success">{categorizedCount}</div>
					<div class="stat-desc">transacties</div>
				</div>
				<div class="stat">
					<div class="stat-title">Niet gecategoriseerd</div>
					<div class="stat-value text-warning">{uncategorizedCount}</div>
					<div class="stat-desc">transacties</div>
				</div>
				<div class="stat">
					<div class="stat-title">Tijd</div>
					<div class="stat-value text-info">{formatTime(elapsedTime)}</div>
					<div class="stat-desc">
						{#if categorizing}
							lopend
						{:else}
							totale tijd
						{/if}
					</div>
				</div>
			</div>

					<!-- Progress Bar -->
					{#if categorizing || (result && totalTransactions > 0)}
						<div class="w-full">
							<div class="flex justify-between mb-2">
								<span class="text-sm font-medium">Progress</span>
								<span class="text-sm font-medium">{Math.round(progress)}%</span>
							</div>
							<progress
								class="progress progress-primary w-full"
								value={progress}
								max="100"
							></progress>
						</div>
					{/if}
					
					<!-- Current Progress Message -->
					{#if categorizing && currentProgressMessage}
						<div class="alert alert-info">
							<Loader2 class="w-5 h-5 animate-spin" />
							<span class="text-sm">{currentProgressMessage}</span>
						</div>
					{/if}

					<!-- Vector Search Progress -->
					
					<!-- AI Progress -->
					{#if categorizing && aiProgress}
						<div class="bg-base-200 p-4 rounded-lg">
							<h3 class="text-lg font-semibold mb-2">AI Processing</h3>
							<div class="space-y-2 text-sm">
								<div class="flex justify-between items-center">
									<span class="font-semibold">Batch progress:</span>
									<span>{aiProgress.currentBatch} / {aiProgress.totalBatches}</span>
								</div>
								<progress
									class="progress progress-secondary w-full"
									value={aiProgress.currentBatch}
									max={aiProgress.totalBatches}
								></progress>
								<div class="grid grid-cols-2 gap-4 mt-3">
									<div>
										<span class="font-semibold">Transactions processed:</span>
										<span class="ml-2">{aiProgress.transactionsProcessed}</span>
									</div>
									<div>
										<span class="font-semibold">Results received:</span>
										<span class="ml-2">{aiProgress.resultsReceived}</span>
									</div>
									<div>
										<span class="font-semibold">Successful (≥50%):</span>
										<span class="ml-2 text-success">{aiProgress.resultsAboveThreshold}</span>
									</div>
									<div>
										<span class="font-semibold">Current batch size:</span>
										<span class="ml-2">{aiProgress.batchSize}</span>
									</div>
								</div>
							</div>
						</div>
					{/if}

			<!-- Results Summary -->
			{#if result}
				<div class="alert alert-info">
					<CheckCircle class="w-6 h-6" />
					<div>
						<div class="font-bold">Categorization complete!</div>
						<div class="text-sm">
							<p>• Keywords: {result.keywordMatches} matches</p>
							<p>• IBAN: {result.ibanMatches} matches</p>
							<p>• Merchant name: {result.merchantNameMatches || 0} matches</p>
							{#if result.merchantNameReRunMatches !== undefined}
								<p>• Herhaalde matches: {result.merchantNameReRunMatches} matches (na AI batches)</p>
							{/if}
							<p>• AI: {result.aiMatches} matches (≥50% confidence)</p>
							{#if result.aiDebug}
								<p class="mt-2 font-semibold">AI Details:</p>
								<p class="ml-4">• {result.aiDebug.totalTransactionsProcessed} transactions processed with AI</p>
								<p class="ml-4">• {result.aiDebug.resultsAboveThreshold} successfully categorized (≥50% confidence)</p>
								{#if result.aiDebug.resultsBelowThreshold > 0}
									<p class="ml-4">• {result.aiDebug.resultsBelowThreshold} below threshold (&lt;50% confidence)</p>
								{/if}
							{/if}
							{#if result.keywordsAdded > 0}
								<p>• {result.keywordsAdded} new keywords added</p>
							{/if}
						</div>
					</div>
				</div>
				
				<!-- AI Debug Info -->
				{#if result.aiDebug}
					<div class="bg-base-200 p-4 rounded-lg">
						<h3 class="text-lg font-semibold mb-3">AI Debug Information</h3>
						<div class="space-y-2 text-sm">
							<div class="grid grid-cols-2 gap-4">
								<div>
									<span class="font-semibold">AI Available:</span>
									<span class="ml-2">{result.aiAvailable ? '✅ Yes' : '❌ No'}</span>
								</div>
								<div>
									<span class="font-semibold">Batches processed:</span>
									<span class="ml-2">{result.aiDebug.batchesProcessed}</span>
								</div>
								<div>
									<span class="font-semibold">Transactions processed:</span>
									<span class="ml-2">{result.aiDebug.totalTransactionsProcessed}</span>
								</div>
								<div>
									<span class="font-semibold">Results received:</span>
									<span class="ml-2">{result.aiDebug.totalResultsReceived}</span>
								</div>
								<div>
									<span class="font-semibold">Above threshold (≥50%):</span>
									<span class="ml-2 text-success">{result.aiDebug.resultsAboveThreshold}</span>
								</div>
								<div>
									<span class="font-semibold">Below threshold (&lt;50%):</span>
									<span class="ml-2 text-warning">{result.aiDebug.resultsBelowThreshold}</span>
								</div>
							</div>
							
							{#if result.aiDebug.lastBatchDetails}
								<div class="divider my-2"></div>
								<div>
									<span class="font-semibold">Last batch details:</span>
									<ul class="list-disc list-inside mt-1 space-y-1">
										<li>Batch size: {result.aiDebug.lastBatchDetails.batchSize} transactions</li>
										<li>Results received: {result.aiDebug.lastBatchDetails.resultsReceived}</li>
										<li>Above threshold: {result.aiDebug.lastBatchDetails.resultsAboveThreshold}</li>
										<li>Below threshold: {result.aiDebug.lastBatchDetails.resultsBelowThreshold}</li>
										{#if result.aiDebug.lastBatchDetails.tokensUsed}
											<li>Tokens used: {result.aiDebug.lastBatchDetails.tokensUsed.total} (prompt: {result.aiDebug.lastBatchDetails.tokensUsed.prompt}, completion: {result.aiDebug.lastBatchDetails.tokensUsed.completion})</li>
										{/if}
									</ul>
								</div>
							{/if}
							
							{#if result.aiDebug.errors.length > 0}
								<div class="divider my-2"></div>
								<div>
									<span class="font-semibold text-error">AI Errors:</span>
									<ul class="list-disc list-inside mt-1 space-y-1">
										{#each result.aiDebug.errors as error}
											<li class="text-error">{error}</li>
										{/each}
									</ul>
								</div>
							{/if}
							
							{#if result.aiDebug.totalResultsReceived === 0 && result.aiAvailable}
								<div class="alert alert-warning mt-4">
									<AlertCircle class="w-6 h-6" />
									<div>
										<div class="font-bold">No AI results received</div>
										<div class="text-sm">AI is available but returned no results. Check console logs for more details.</div>
									</div>
								</div>
							{/if}
						</div>
					</div>
				{/if}
			{/if}
		</div>
	{/if}

	{#if error}
		<div class="alert alert-error mb-6">
			<AlertCircle class="w-6 h-6" />
			<span>{error}</span>
		</div>
	{/if}

	<!-- Categorized Transactions Table -->
	{#if categorizedTransactions.length > 0}
		<div class="mb-6">
			<h2 class="text-xl font-semibold mb-4">Categorized transactions</h2>
			<div class="overflow-x-auto max-h-96 overflow-y-auto">
				<table class="table table-zebra">
					<thead class="sticky top-0 bg-base-200">
						<tr>
							<th>Date</th>
							<th>Merchant</th>
							<th>Amount</th>
							<th>Category</th>
							<th>Reason</th>
						</tr>
					</thead>
					<tbody>
						{#each categorizedTransactions as transaction}
							<tr>
								<td>
									{new Date(transaction.date).toLocaleDateString('en-US', {
										day: '2-digit',
										month: '2-digit',
										year: 'numeric'
									})}
								</td>
								<td class="font-medium">
									<span 
										title={transaction.fullMerchantName !== transaction.merchantName
											? transaction.fullMerchantName
											: (transaction.originalMerchantName 
												? (transaction.originalMerchantName !== transaction.fullMerchantName 
													? `Original: ${transaction.originalMerchantName}` 
													: transaction.originalMerchantName)
												: '')}
									>
										{transaction.merchantName || transaction.fullMerchantName || transaction.originalMerchantName || '-'}
									</span>
								</td>
								<td class="font-mono">
									€{transaction.amount.toFixed(2)}
								</td>
								<td>
									<span class="badge badge-primary">{transaction.categoryName}</span>
								</td>
								<td>
									{#if transaction.matchReason}
										<span class="badge badge-sm badge-outline">{transaction.matchReason}</span>
									{:else}
										<span class="text-base-content/50">-</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}


