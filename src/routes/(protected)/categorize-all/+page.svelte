<script lang="ts">
	import { Loader2, Play, CheckCircle, AlertCircle, SquareStop } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import DashboardWidget from '$lib/components/DashboardWidget.svelte';
	import StatItem from '$lib/components/StatItem.svelte';

	const categorizationMessages = [
		'Time to organize your financial chaos! 🎯',
		'Let AI do the heavy lifting while you relax.',
		'Categorization: because "miscellaneous" isn\'t a category.',
		'From chaos to clarity, one transaction at a time!',
		'Your transactions deserve better than "uncategorized".',
		"Let's sort this out, shall we?",
		'AI-powered categorization: smarter than a spreadsheet.',
		'Turning transaction chaos into financial insights!',
		'Categorize now, analyze later, profit always!',
		'Your wallet called, it wants better organization.',
		'From random expenses to organized insights!',
		"Categorization: it's like Marie Kondo for your finances.",
		'Let the magic of AI organize your spending! ✨',
		'One click, thousands of transactions organized.',
		'Categorization: the unsung hero of financial clarity.'
	];

	const randomMessage = categorizationMessages[Math.floor(Math.random() * categorizationMessages.length)];

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

<div class="grid grid-cols-1 gap-8 p-4 md:grid-cols-2 lg:grid-cols-3">
	<div class="col-span-full grid grid-cols-1 gap-8 lg:grid-cols-3">
		<!-- Title Widget (Large) -->
		<div class="lg:col-span-2">
			<DashboardWidget size="wide">
				<div class="flex h-full flex-col justify-center px-6 pt-3 pb-6">
					<h1 class="mb-4 text-7xl font-bold">Categorize all transactions</h1>
					<p class="text-2xl opacity-70">
						{randomMessage}
					</p>
				</div>
			</DashboardWidget>
		</div>

		<!-- Status Widget (Small) -->
		<DashboardWidget size="small">
			<div class="flex h-full flex-col justify-between">
				<div>
					{#if categorizing || result}
						<div class="mb-4 grid grid-cols-2 gap-4">
							<StatItem
								label="Total transactions"
								value={totalTransactions > 0 ? totalTransactions : processedCount}
								color="text-primary"
							/>
							<StatItem label="Categorized" value={categorizedCount} color="text-success" />
							<StatItem label="Uncategorized" value={uncategorizedCount} color="text-warning" />
							<StatItem label="Time" value={formatTime(elapsedTime)} color="text-info" />
						</div>
					{/if}
					
					{#if categorizing && totalTransactions > 0}
						<div class="mb-4">
							<div class="flex justify-between mb-2">
								<span class="text-xs text-base-content/70">Progress</span>
								<span class="text-xs text-base-content/70">{Math.round(progress)}%</span>
							</div>
							<progress
								class="progress progress-primary w-full"
								value={progress}
								max="100"
							></progress>
						</div>
					{/if}
				</div>
				
				<div class="flex gap-2">
					{#if categorizing}
						<button class="btn btn-error w-full" onclick={stopCategorization}>
							<SquareStop class="w-4 h-4 mr-2" />
							Stop
						</button>
					{:else}
						<button class="btn btn-primary w-full" onclick={startCategorization}>
							<Play class="w-4 h-4 mr-2" />
							Start categorization
						</button>
					{/if}
				</div>
			</div>
		</DashboardWidget>
	</div>

	<!-- Content Section -->
	<div class="col-span-full">
		{#if error}
			<DashboardWidget size="full">
				<div class="alert alert-error">
					<AlertCircle class="w-6 h-6" />
					<span>{error}</span>
				</div>
			</DashboardWidget>
		{/if}

	<!-- Categorized Transactions Table -->
	{#if categorizedTransactions.length > 0}
		<div class="col-span-full grid grid-cols-1 gap-8 lg:grid-cols-3">
			<div class="lg:col-span-2">
				<DashboardWidget size="large" title="Categorized transactions">
					<div class="relative overflow-x-auto max-h-96 overflow-y-auto">
						<table class="table table-zebra">
							<thead class="sticky top-0 bg-base-200">
								<tr>
									<th>Date</th>
									<th>Merchant</th>
									<th>Amount</th>
									<th>Category</th>
								</tr>
							</thead>
							<tbody>
								{#each categorizedTransactions as transaction, index}
									<tr
										class="group relative"
										onmouseenter={(e) => {
											if (transaction.matchReason) {
												const tooltip = document.getElementById(`tooltip-${index}`);
												if (tooltip) {
													const rect = e.currentTarget.getBoundingClientRect();
													const tableRect = e.currentTarget.closest('table')?.getBoundingClientRect();
													if (tableRect) {
														tooltip.style.display = 'block';
														tooltip.style.top = `${rect.top - tableRect.top - 120}px`;
														tooltip.style.left = `${rect.left - tableRect.left + rect.width / 2}px`;
													}
												}
											}
										}}
										onmouseleave={() => {
											const tooltip = document.getElementById(`tooltip-${index}`);
											if (tooltip) {
												tooltip.style.display = 'none';
											}
										}}
									>
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
												{transaction.merchantName ||
													transaction.fullMerchantName ||
													transaction.originalMerchantName ||
													'-'}
											</span>
										</td>
										<td>€{transaction.amount.toFixed(2)}</td>
										<td>
											<span class="badge badge-primary">{transaction.categoryName}</span>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
						{#each categorizedTransactions as transaction, index}
							{#if transaction.matchReason}
								<div
									id="tooltip-{index}"
									class="absolute z-50 hidden pointer-events-none -translate-x-1/2"
									style="display: none;"
								>
									<div
										class="bg-base-200 border border-base-300 rounded-lg shadow-lg p-3 text-sm whitespace-nowrap"
										style="min-width: 200px;"
									>
										<div class="font-semibold mb-1">Match reason:</div>
										<div class="text-base-content/80">{transaction.matchReason}</div>
										<div
											class="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-base-300"
										></div>
									</div>
								</div>
							{/if}
						{/each}
					</div>
				</DashboardWidget>
			</div>
		</div>
	{/if}
	</div>
</div>
