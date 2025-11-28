<script lang="ts">
	import DashboardWidget from './DashboardWidget.svelte';
	import { Database, TrendingUp, Sparkles } from 'lucide-svelte';

	let {
		totalTransactions,
		categorizedCount,
		categorizedPercentage
	}: {
		totalTransactions: number;
		categorizedCount: number;
		categorizedPercentage: number;
	} = $props();

	const getProgressColor = (percentage: number) => {
		if (percentage >= 80) return 'progress-success';
		if (percentage >= 50) return 'progress-warning';
		return 'progress-error';
	};
</script>

<DashboardWidget size="medium">
	<div class="space-y-6">
		<!-- Total Transactions -->
		<div class="flex items-center justify-between">
			<div>
				<div class="text-sm opacity-60">Total transactions</div>
				<div class="text-3xl font-bold">{totalTransactions.toLocaleString()}</div>
			</div>
			<Database size={40} class="opacity-30" />
		</div>

		{#if categorizedCount === 0 && totalTransactions > 0}
			<!-- CTA when no categorization -->
			<div class="flex flex-col items-center justify-center gap-4 py-4">
				<Sparkles size={48} class="text-primary opacity-50" />
				<p class="text-center text-sm opacity-70">Ready to organize your transactions?</p>
				<a href="/categorize-all" class="btn btn-primary"> Start categorizing </a>
			</div>
		{:else}
			<!-- Categorized Count -->
			<div class="flex items-center justify-between">
				<div>
					<div class="text-sm opacity-60">Categorized</div>
					<div class="text-3xl font-bold text-secondary">{categorizedCount.toLocaleString()}</div>
					<div class="text-xs opacity-50">{categorizedPercentage.toFixed(1)}% of total</div>
				</div>
				<TrendingUp size={40} class="opacity-30" />
			</div>

			<!-- Progress Bar -->
			<div class="space-y-2">
				<div class="flex justify-between text-sm">
					<span>Categorization progress</span>
					<span class="font-semibold">{categorizedPercentage.toFixed(1)}%</span>
				</div>
				<progress
					class="progress {getProgressColor(categorizedPercentage)} w-full"
					value={categorizedPercentage}
					max="100"
				></progress>
			</div>
		{/if}
	</div>
</DashboardWidget>
