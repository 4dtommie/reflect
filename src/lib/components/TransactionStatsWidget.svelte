<script lang="ts">
	import DashboardWidget from './DashboardWidget.svelte';
	import { Sparkles, AlertCircle, ArrowRight } from 'lucide-svelte';
	import confetti from 'canvas-confetti';
	import { onMount } from 'svelte';

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

	// Fun emoticons based on percentage
	const emoticon = $derived.by(() => {
		if (categorizedPercentage >= 100) return '🦄';
		if (categorizedPercentage > 95) return '🤩';
		if (categorizedPercentage > 90) return '😎';
		if (categorizedPercentage > 75) return '😃';
		if (categorizedPercentage > 50) return '🙂';
		return '🤔';
	});

	// Motivational messages
	const message = $derived.by(() => {
		if (categorizedPercentage >= 100) return 'Categorization Nirvana achieved!';
		if (categorizedPercentage > 95) return 'So close to perfection!';
		if (categorizedPercentage > 90) return 'You are crushing it!';
		if (categorizedPercentage > 75) return 'Making great progress!';
		if (categorizedPercentage > 50) return 'Halfway there!';
		return "Let's get organized!";
	});

	// Trigger confetti on 100%
	$effect(() => {
		if (categorizedPercentage >= 100) {
			confetti({
				particleCount: 100,
				spread: 70,
				origin: { y: 0.6 }
			});
		}
	});
</script>

<DashboardWidget size={widgetSize} title="Getting organized">
	{#if uncategorizedCount === totalTransactions && totalTransactions > 0}
		<!-- CTA when no categorization -->
		<div class="flex h-full flex-col items-center justify-center gap-4 py-4">
			<Sparkles size={48} class="text-primary opacity-50" />
			<p class="text-center text-sm opacity-70">Ready to organize your transactions?</p>
			<a href="/categorize-all" class="btn w-full btn-primary"> Start categorizing </a>
		</div>
	{:else if variant === 'compact'}
		<!-- Compact variant: Just percentage + pie + CTA -->
		<div class="mb-4 flex items-center justify-between">
			<div>
				<div class="flex items-center gap-2 text-4xl font-bold text-primary">
					<span>{Math.round(categorizedPercentage)}%</span>
					<span class="animate-bounce text-3xl">{emoticon}</span>
				</div>
				<div class="text-sm font-medium text-base-content/70">{message}</div>
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
			<a href="/categorize" class="group btn w-full justify-between btn-ghost btn-sm">
				<span>Improve categorization</span>
				<ArrowRight size={16} class="transition-transform group-hover:translate-x-1" />
			</a>
		</div>
	{:else}
		<!-- Detailed variant: Full stats display -->
		<div class="flex h-full flex-col">
			<div class="mb-4 flex items-center justify-between">
				<div>
					<div class="flex items-center gap-2 text-4xl font-bold text-primary">
						<span>{Math.round(categorizedPercentage)}%</span>
						<span class="animate-bounce text-3xl">{emoticon}</span>
					</div>
					<div class="text-sm font-medium text-base-content/70">{message}</div>
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
