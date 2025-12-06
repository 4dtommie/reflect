<script lang="ts">
	import DashboardWidget from './DashboardWidget.svelte';
	import { RefreshCw, Calendar, ArrowRight } from 'lucide-svelte';
	import type { RecurringTransaction } from '@prisma/client';

	let { recurringTransactions = [] }: { recurringTransactions: RecurringTransaction[] } = $props();

	// Filter to transactions within -10 to +10 days, sort by next payment date, max 2
	let sortedTransactions = $derived.by(() => {
		const now = new Date();
		const minDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
		const maxDate = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

		return [...recurringTransactions]
			.filter((tx) => {
				if (!tx.next_expected_date) return false;
				const txDate = new Date(tx.next_expected_date);
				return txDate >= minDate && txDate <= maxDate;
			})
			.sort((a, b) => {
				if (!a.next_expected_date) return 1;
				if (!b.next_expected_date) return -1;
				return new Date(a.next_expected_date).getTime() - new Date(b.next_expected_date).getTime();
			})
			.slice(0, 2);
	});

	function formatDate(date: Date | null) {
		if (!date) return 'Unknown';
		return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}
	function getDaysUntil(date: Date | null) {
		if (!date) return '';
		const diff = new Date(date).getTime() - new Date().getTime();
		const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
		if (days === 0) return 'Today';
		if (days === 1) return 'Tomorrow';
		if (days < 0) return 'Overdue';
		return `in ${days} days`;
	}
</script>

<DashboardWidget size="auto" title="Upcoming payments">
	{#if recurringTransactions.length === 0}
		<div class="flex h-full flex-col items-center justify-center py-6 text-center">
			<RefreshCw size={48} class="mb-4 opacity-50" />
			<h3 class="text-lg font-semibold opacity-50">Subscriptions</h3>
			<p class="mb-4 text-sm opacity-50">Track your recurring payments</p>
			<a href="/recurring/detect" class="btn btn-primary"> Detect subscriptions </a>
		</div>
	{:else}
		<div class="space-y-3">
			{#each sortedTransactions as tx}
				{@const isPositive = Number(tx.amount) > 0}
				<div
					class="flex items-center justify-between border-b border-base-200 pb-2 last:border-0 last:pb-0"
				>
					<div class="flex items-center gap-3">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary"
						>
							<Calendar size={18} />
						</div>
						<div>
							<p class="line-clamp-1 max-w-[120px] font-medium">{tx.name}</p>
							<p class="text-xs text-base-content/60">
								{formatDate(tx.next_expected_date)} • {getDaysUntil(tx.next_expected_date)}
							</p>
						</div>
					</div>
					<div class="text-right">
						<p
							class={isPositive
								? 'inline-block rounded-lg bg-success/10 px-2 py-0.5 font-semibold text-success'
								: 'font-semibold'}
						>
							{isPositive ? '+' : ''}€ {Math.abs(Number(tx.amount)).toFixed(2).replace('.', ',')}
						</p>
						<p class="text-xs text-base-content/60 capitalize">{tx.interval}</p>
					</div>
				</div>
			{/each}

			<div class="border-t border-base-200 pt-1">
				<a href="/recurring" class="group btn btn-block justify-between btn-ghost btn-sm">
					View all subscriptions
					<ArrowRight size={16} class="transition-transform group-hover:translate-x-1" />
				</a>
			</div>
		</div>
	{/if}
</DashboardWidget>
