<script lang="ts">
	import DashboardWidget from './DashboardWidget.svelte';
	import { Sparkles, AlertCircle, ArrowRight } from 'lucide-svelte';

	let {
		totalTransactions,
		uncategorizedCount,
		categorizedPercentage = 0,
		topUncategorizedMerchants = [],
		variant = 'detailed'
	}: {
		totalTransactions: number;
		uncategorizedCount: number;
		categorizedPercentage?: number;
		topUncategorizedMerchants?: { name: string; count: number }[];
		variant?: 'compact' | 'detailed';
	} = $props();

	const widgetSize = $derived(variant === 'compact' ? 'auto' : 'small');
</script>

<DashboardWidget size={widgetSize}>
	{#if uncategorizedCount === totalTransactions && totalTransactions > 0}
		<!-- CTA when no categorization -->
		<div class="flex h-full flex-col items-center justify-center gap-4 py-4">
			<Sparkles size={48} class="text-primary opacity-50" />
			<p class="text-center text-sm opacity-70">Ready to organize your transactions?</p>
			<a href="/categorize" class="btn w-full btn-primary"> Start categorizing </a>
		</div>
	{:else if variant === 'compact'}
		<!-- Compact variant: Just percentage + pie + CTA -->
		<div class="mb-4 flex items-center justify-between">
			<div>
				<div class="text-4xl font-bold text-primary">
					{Math.round(categorizedPercentage)}%
				</div>
				<div class="text-sm font-medium text-base-content/70">Categorized</div>
			</div>
			<div
				class="radial-progress text-primary/20"
				style="--value:{categorizedPercentage}; --size:3.5rem;"
				role="progressbar"
			>
				<span class="text-xs font-bold text-primary">{Math.round(categorizedPercentage)}%</span>
			</div>
		</div>
		<div class="border-t border-base-200 pt-3">
			<a href="/categorize" class="group btn btn-sm btn-ghost w-full justify-between">
				<span>Improve categorization</span>
				<ArrowRight size={16} class="transition-transform group-hover:translate-x-1" />
			</a>
		</div>
	{:else}
		<!-- Detailed variant: Full stats display -->
		<div class="flex h-full flex-col">
			<div class="mb-4 flex items-center justify-between">
				<div>
					<div class="text-4xl font-bold text-primary">
						{Math.round(categorizedPercentage)}%
					</div>
					<div class="text-sm font-medium text-base-content/70">Categorized</div>
				</div>
				<div
					class="radial-progress text-primary/20"
					style="--value:{categorizedPercentage}; --size:3.5rem;"
					role="progressbar"
				>
					<span class="text-xs font-bold text-primary">{Math.round(categorizedPercentage)}%</span>
				</div>
			</div>

			<div class="flex-1 space-y-4">
				<!-- Transaction Counts -->
				<div class="rounded-lg bg-base-200/50 p-3">
					<div class="flex justify-between text-sm">
						<span class="opacity-70">Total transactions</span>
						<span class="font-bold">{totalTransactions}</span>
					</div>
					<div class="mt-1 flex justify-between text-sm">
						<span class="opacity-70">Uncategorized</span>
						<span class="font-bold text-warning">{uncategorizedCount}</span>
					</div>
				</div>

				<!-- Top Uncategorized Merchants -->
				{#if topUncategorizedMerchants.length > 0}
					<div>
						<div
							class="mb-2 flex items-center gap-2 text-xs font-bold tracking-wider uppercase opacity-50"
						>
							<AlertCircle size={12} />
							Needs attention
						</div>
						<div class="space-y-2">
							{#each topUncategorizedMerchants as merchant (merchant.name)}
								<div class="flex items-center justify-between text-sm">
									<span class="truncate pr-2 opacity-80">{merchant.name || 'Unknown'}</span>
									<span class="badge badge-sm font-mono badge-warning">{merchant.count}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</DashboardWidget>
