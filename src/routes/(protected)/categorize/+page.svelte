<script lang="ts">
	import type { PageData } from './$types';
	import DashboardWidget from '$lib/components/DashboardWidget.svelte';
	import PageTitleWidget from '$lib/components/PageTitleWidget.svelte';
	import TransactionStatsWidget from '$lib/components/TransactionStatsWidget.svelte';
	import { Tags, AlertCircle, ChevronRight } from 'lucide-svelte';
	import Amount from '$lib/components/Amount.svelte';

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

	// Placeholder for modal - will be implemented later
	let selectedTransactionId: number | null = $state(null);
	let selectedMerchantName: string | null = $state(null);

	// View more state for uncategorized merchants
	let showAllMerchants = $state(false);

	function handleTransactionClick(transactionId: number) {
		selectedTransactionId = transactionId;
		// TODO: Open modal dialog
		console.log('Transaction clicked:', transactionId);
	}

	function handleMerchantClick(merchantName: string) {
		selectedMerchantName = merchantName;
		// TODO: Open modal dialog
		console.log('Merchant clicked:', merchantName);
	}

	function formatConfidence(confidence: number | null): string {
		if (confidence === null) return 'N/A';
		return `${Math.round(confidence * 100)}%`;
	}
</script>

<svelte:head>
	<title>Categorization - Reflect</title>
</svelte:head>

<div class="grid grid-cols-1 gap-6 py-4 lg:grid-cols-3">
	<!-- Left Column (2/3 width) -->
	<div class="space-y-6 lg:col-span-2">
		<!-- Page Title -->
		<PageTitleWidget title="Categorization" subtitle={randomSubtitle} />

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
									on:click={() => handleMerchantClick(merchant.name)}
									class="group flex w-full items-center justify-between rounded-lg border border-base-300 bg-base-200/50 p-3 text-left transition-all hover:border-primary hover:bg-primary/5"
								>
									<div class="flex-1 min-w-0">
										<div class="truncate font-medium">{merchant.name || 'Unknown'}</div>
										<div class="text-xs opacity-70">
											{merchant.count} {merchant.count === 1 ? 'transaction' : 'transactions'}
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
									on:click={() => showAllMerchants = true}
									class="btn btn-ghost btn-sm w-full"
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
						<h2 class="text-lg font-semibold">Manual review</h2>
					</div>
					<div class="flex-1 space-y-2 overflow-y-auto">
						{#if data.manualReviewTransactions && data.manualReviewTransactions.length > 0}
							{#each data.manualReviewTransactions as transaction (transaction.id)}
								<button
									type="button"
									on:click={() => handleTransactionClick(transaction.id)}
									class="group flex w-full flex-col gap-2 rounded-lg border border-base-300 bg-base-200/50 p-3 text-left transition-all hover:border-error hover:bg-error/5"
								>
									<!-- Top row: Merchant name with chevron -->
									<div class="flex items-center gap-2">
										<div class="flex-1 min-w-0 truncate font-medium">{transaction.merchantName}</div>
										<ChevronRight
											size={16}
											class="flex-shrink-0 opacity-50 transition-all group-hover:translate-x-1 group-hover:opacity-100"
										/>
									</div>
									<!-- Bottom row: Amount on left, tags on right -->
									<div class="flex items-center justify-between gap-2">
										<Amount value={parseFloat(transaction.amount)} />
										<div class="flex items-center gap-2 flex-shrink-0">
											{#if transaction.category}
												<span
													class="badge badge-sm"
													style="background-color: {transaction.category.color || 'hsl(var(--b3))'}; color: {transaction.category.color ? 'white' : 'hsl(var(--bc))'};"
												>
													{transaction.category.name}
												</span>
											{/if}
											<span class="badge badge-sm badge-error badge-outline">
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


