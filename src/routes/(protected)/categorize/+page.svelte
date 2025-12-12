<script lang="ts">
	import type { PageData } from './$types';
	import DashboardWidget from '$lib/components/DashboardWidget.svelte';
	import PageTitleWidget from '$lib/components/PageTitleWidget.svelte';
	import TransactionStatsWidget from '$lib/components/TransactionStatsWidget.svelte';
	import CategorizeModal from './CategorizeModal.svelte';
	import ManualCategorizeModal from '$lib/components/ManualCategorizeModal.svelte';
	import { Tags, AlertCircle, ChevronRight } from 'lucide-svelte';
	import Amount from '$lib/components/Amount.svelte';
	import { invalidateAll } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	const subtitles = [
		'Bring order to your financial chaos',
		'Every transaction deserves a home',
		'Turn raw data into insights',
		'Organize now, understand later',
		'The art of financial clarity',
		'Your transactions, properly sorted',
		'From confusion to comprehension',
		'Make sense of your spending'
	];

	const randomSubtitle = subtitles[Math.floor(Math.random() * subtitles.length)];

	// Modal state
	let isModalOpen = $state(false);
	let selectedTransaction = $state<any>(null);

	// Manual Modal state
	let isManualModalOpen = $state(false);
	let selectedManualTransaction = $state<any>(null);
	let selectedManualTransactionCount = $state(0);

	// View more state for uncategorized merchants
	let showAllMerchants = $state(false);

	// AI Buffering State
	let aiBuffer = $state(new Map<number, any>());
	let isBuffering = $state(false);

	// Initialize buffer on mount
	$effect(() => {
		if (data.manualReviewTransactions && data.manualReviewTransactions.length > 0) {
			fillBuffer();
		}
	});

	async function fillBuffer() {
		if (isBuffering) return;

		// Only buffer the top 10 transactions (what the user sees first)
		const MAX_BUFFER_LOOKAHEAD = 10;
		const topTransactions = data.manualReviewTransactions.slice(0, MAX_BUFFER_LOOKAHEAD);

		// Find next 3 transactions from the top set that aren't in buffer
		const transactionsToFetch = topTransactions
			.filter((t: any) => !aiBuffer.has(t.id))
			.slice(0, 3)
			.map((t: any) => t.id);

		if (transactionsToFetch.length === 0) return;

		isBuffering = true;
		console.log('🔄 Buffering AI results for:', transactionsToFetch);

		try {
			const response = await fetch('/api/transactions/categorize-batch', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ transactionIds: transactionsToFetch })
			});

			if (response.ok) {
				const { results } = await response.json();

				// Update buffer
				for (const result of results) {
					aiBuffer.set(result.transactionId, result);
				}
				// Force reactivity update
				aiBuffer = new Map(aiBuffer);

				console.log('✅ Buffer updated, size:', aiBuffer.size);

				// Continue buffering if we haven't reached the lookahead limit
				// We wait a bit to be nice to the API
				setTimeout(() => fillBuffer(), 500);
			}
		} catch (e) {
			console.error('Failed to buffer AI results:', e);
		} finally {
			isBuffering = false;
		}
	}

	// Derived state for merchant counts
	let merchantCounts = $derived.by(() => {
		const counts = new Map<string, number>();
		if (data.manualReviewTransactions) {
			for (const t of data.manualReviewTransactions) {
				const name = t.merchantName.trim();
				counts.set(name, (counts.get(name) || 0) + 1);
			}
		}
		return counts;
	});

	// Derived state for grouped transactions (show only one per merchant)
	let groupedTransactions = $derived.by(() => {
		if (!data.manualReviewTransactions) return [];

		const unique = new Map<string, any>();
		for (const t of data.manualReviewTransactions) {
			const name = t.merchantName.trim();
			if (!unique.has(name)) {
				unique.set(name, t);
			}
		}
		return Array.from(unique.values());
	});

	function handleTransactionClick(transaction: any) {
		console.log('🖱️ Clicked transaction:', transaction.id);
		selectedTransaction = transaction;
		isModalOpen = true;
	}

	function handleMerchantClick(merchant: any) {
		if (merchant.sampleTransaction) {
			selectedManualTransaction = merchant.sampleTransaction;
			selectedManualTransactionCount = merchant.count;
			isManualModalOpen = true;
		} else {
			console.warn('No sample transaction found for merchant:', merchant.name);
		}
	}

	async function handleManualSave(transactionId: number, categoryId: number, merchantName: string) {
		// For the merchant list, we want to categorize ALL transactions for this merchant
		// We use the merchant_id from the selected transaction to find all related transactions
		const merchantId = selectedManualTransaction?.merchantId;
		const originalMerchantName = selectedManualTransaction?.merchantName;

		if (!merchantId && !originalMerchantName) return;

		try {
			const response = await fetch('/api/transactions/categorize-by-merchant', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					merchantId, // Pass merchant_id for reliable matching
					merchantName: originalMerchantName, // Fallback if no merchant_id
					categoryId
				})
			});

			if (!response.ok) {
				throw new Error('Failed to categorize transactions');
			}

			const result = await response.json();
			console.log(`Updated ${result.count} transactions for ${originalMerchantName}`);

			await invalidateAll();
		} catch (e) {
			console.error('Error saving manual category:', e);
			alert('Failed to save category. Please try again.');
		}
	}

	async function handleSaveCategory(
		transactionId: number,
		categoryId: number,
		merchantName: string,
		applyToAllSimilar: boolean = false
	) {
		// If applying to all, we need to find all matching transactions
		let transactionIds = [transactionId];

		if (applyToAllSimilar) {
			const originalMerchantName = data.manualReviewTransactions.find(
				(t: any) => t.id === transactionId
			)?.merchantName;
			if (originalMerchantName) {
				const similar = data.manualReviewTransactions
					.filter((t: any) => t.merchantName.trim() === originalMerchantName.trim())
					.map((t: any) => t.id);
				transactionIds = similar;
			}
		}

		// Use batch endpoint for both single and bulk (it's cleaner)
		// Or loop if we don't have a batch update endpoint yet.
		// Let's assume we'll loop for now as it's safest without new backend code,
		// but ideally we'd make a batch endpoint.
		// Actually, let's just loop for now to be quick, or use a new endpoint.
		// Given the user wants "easy", let's try to do it in one go.
		// I'll update this function to loop for now.

		for (const id of transactionIds) {
			const response = await fetch(`/api/transactions/${id}/categorize`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ categoryId, merchantName })
			});

			if (!response.ok) {
				console.error(`Failed to update transaction ${id}`);
				// Continue with others
			}
		}

		// Refresh data
		await invalidateAll();
		setTimeout(fillBuffer, 100);
	}
	function formatConfidence(confidence: number | null): string {
		if (confidence === null) return 'N/A';
		return `${Math.round(confidence * 100)}%`;
	}
</script>

<!-- ... (head) ... -->

<div class="grid grid-cols-1 gap-6 py-4 lg:grid-cols-3">
	<!-- Left Column (2/3 width) -->
	<div class="space-y-6 lg:col-span-2">
		<!-- Page Title -->
		<PageTitleWidget title="Recategorization" subtitle={randomSubtitle} />

		<!-- 50/50 Split: Uncategorized Merchants | Manual Review Transactions -->
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
			<!-- Left: Uncategorized Merchants List -->
			<DashboardWidget size="medium" enableHover={false}>
				<div class="flex h-full flex-col">
					<div class="mb-4 flex items-center gap-2">
						<Tags size={20} class="text-warning" />
						<h2 class="text-lg font-semibold">Ongecategoriseerd</h2>
					</div>
					<div class="flex-1 space-y-2 overflow-y-auto">
						{#if data.uncategorizedMerchants && data.uncategorizedMerchants.length > 0}
							{@const displayedMerchants = showAllMerchants
								? data.uncategorizedMerchants
								: data.uncategorizedMerchants.slice(0, 10)}
							{@const hasMore = data.uncategorizedMerchants.length > 10}

							{#each displayedMerchants as merchant (merchant.name)}
								<button
									type="button"
									onclick={() => handleMerchantClick(merchant)}
									class="group flex w-full cursor-pointer items-center justify-between rounded-lg border border-base-300 bg-base-200/50 p-3 text-left transition-all hover:border-primary hover:bg-primary/5"
								>
									<div class="min-w-0 flex-1">
										<div class="truncate font-medium">{merchant.name || 'Unknown'}</div>
										<div class="text-xs opacity-70">
											{merchant.count}
											{merchant.count === 1 ? 'transaction' : 'transactions'}
										</div>
									</div>
									<ChevronRight
										size={16}
										class="ml-2 flex-shrink-0 opacity-50 transition-transform group-hover:translate-x-1 group-hover:opacity-100"
									/>
								</button>
							{/each}

							{#if hasMore && !showAllMerchants}
								<button
									type="button"
									onclick={() => (showAllMerchants = true)}
									class="btn w-full cursor-pointer btn-ghost btn-sm"
								>
									Meer tonen ({data.uncategorizedMerchants.length - 10} meer)
								</button>
							{/if}
						{:else}
							<div class="flex h-full items-center justify-center py-8 text-center">
								<div class="opacity-50">
									<Tags size={32} class="mx-auto mb-2" />
									<p class="text-sm">Geen ongecategoriseerde merchants</p>
								</div>
							</div>
						{/if}
					</div>
				</div>
			</DashboardWidget>

			<!-- Right: Manual Review Transactions List -->
			<DashboardWidget size="medium" enableHover={false}>
				<div class="flex h-full flex-col">
					<div class="mb-4 flex items-center gap-2">
						<AlertCircle size={20} class="text-error" />
						<h2 class="text-lg font-semibold">
							Manual review
							<span class="ml-2 text-base font-normal opacity-60"
								>({data.manualReviewTransactions?.length || 0})</span
							>
						</h2>
					</div>
					<div class="flex-1 space-y-2 overflow-y-auto">
						{#if groupedTransactions.length > 0}
							{#each groupedTransactions as transaction (transaction.id)}
								{@const similarCount = merchantCounts.get(transaction.merchantName.trim()) || 0}
								<button
									type="button"
									onclick={() => handleTransactionClick(transaction)}
									class="group flex w-full cursor-pointer flex-col gap-2 rounded-lg border border-base-300 bg-base-200/50 p-3 text-left transition-all hover:border-error hover:bg-error/5"
								>
									<!-- Top row: Merchant name with chevron -->
									<div class="flex items-center gap-2">
										<div
											class="min-w-0 flex-1 truncate font-medium"
											title={transaction.merchantName}
										>
											{transaction.merchant?.name ?? transaction.merchantName}
											{#if similarCount > 1}
												<span class="ml-2 text-xs font-normal opacity-60"
													>({similarCount} similar)</span
												>
											{/if}
										</div>
										<ChevronRight
											size={16}
											class="flex-shrink-0 opacity-50 transition-all group-hover:translate-x-1 group-hover:opacity-100"
										/>
									</div>
									<!-- Bottom row: Amount on left, tags on right -->
									<div class="flex items-center justify-between gap-2">
										<Amount value={parseFloat(transaction.amount)} />
										<div class="flex flex-shrink-0 items-center gap-2">
											{#if transaction.category}
												<span
													class="badge badge-sm"
													style="background-color: {transaction.category.color ||
														'hsl(var(--b3))'}; color: {transaction.category.color
														? 'white'
														: 'hsl(var(--bc))'};"
												>
													{transaction.category.name}
												</span>
											{/if}
											<span class="badge badge-outline badge-sm badge-error">
												{formatConfidence(transaction.category_confidence)}
											</span>
										</div>
									</div>
								</button>
							{/each}
						{:else}
							<div class="flex h-full items-center justify-center py-8 text-center">
								<div class="opacity-50">
									<AlertCircle size={32} class="mx-auto mb-2" />
									<p class="text-sm">No transactions need manual review</p>
								</div>
							</div>
						{/if}
					</div>
				</div>
			</DashboardWidget>
		</div>
	</div>

	<!-- Right Column (1/3 width) -->
	<div class="lg:col-span-1">
		<TransactionStatsWidget
			totalTransactions={data.stats.totalTransactions}
			uncategorizedCount={data.stats.uncategorizedCount}
			categorizedPercentage={data.stats.categorizedPercentage}
			topUncategorizedMerchants={data.stats.topUncategorizedMerchants}
			variant="detailed"
		/>
	</div>
</div>

<CategorizeModal
	isOpen={isModalOpen}
	transaction={selectedTransaction}
	categories={data.categories}
	onClose={() => (isModalOpen = false)}
	onSave={handleSaveCategory}
	preloadedResult={selectedTransaction ? aiBuffer.get(selectedTransaction.id) : null}
	similarCount={selectedTransaction
		? merchantCounts.get(selectedTransaction.merchantName.trim()) || 0
		: 0}
/>

<ManualCategorizeModal
	isOpen={isManualModalOpen}
	transaction={selectedManualTransaction}
	transactionCount={selectedManualTransactionCount}
	categories={data.categories}
	onClose={() => (isManualModalOpen = false)}
	onSave={handleManualSave}
/>
