<script lang="ts">
	import DashboardWidget from './DashboardWidget.svelte';
	import { TrendingUp, Sparkles } from 'lucide-svelte';

	let {
		totalTransactions,
		uncategorizedCount
	}: {
		totalTransactions: number;
		uncategorizedCount: number;
	} = $props();
</script>

<DashboardWidget size="extra-small">
	<div class="space-y-6">
		{#if uncategorizedCount === totalTransactions && totalTransactions > 0}
			<!-- CTA when no categorization -->
			<div class="flex flex-col items-center justify-center gap-4 py-4">
				<Sparkles size={48} class="text-primary opacity-50" />
				<p class="text-center text-sm opacity-70">Ready to organize your transactions?</p>
				<a href="/categorize-all" class="btn w-full btn-primary"> Start categorizing </a>
			</div>
		{:else}
			<div class="flex items-center justify-between">
				<div class="text-lg">
					<span class="font-bold">{totalTransactions}</span> total transactions <br />
					<span class="font-bold">{uncategorizedCount}</span> are uncategorized
				</div>
				<TrendingUp size={40} class="opacity-30" />
			</div>
		{/if}
	</div>
</DashboardWidget>
