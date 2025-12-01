<script lang="ts">
	import DashboardWidget from './DashboardWidget.svelte';
	import { RefreshCw, Calendar, ArrowRight } from 'lucide-svelte';
	import type { RecurringTransaction } from '@prisma/client';

	let { recurringTransactions = [] }: { recurringTransactions: RecurringTransaction[] } = $props();

	// Sort by next payment date
	let sortedTransactions = $derived(
		[...recurringTransactions]
			.sort((a, b) => {
				if (!a.next_expected_date) return 1;
				if (!b.next_expected_date) return -1;
				return new Date(a.next_expected_date).getTime() - new Date(b.next_expected_date).getTime();
			})
			.slice(0, 3)
	);

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

<DashboardWidget size="medium" title="Upcoming Payments">
	{#if recurringTransactions.length === 0}
		<div class="flex h-full flex-col items-center justify-center py-6 text-center">
			<RefreshCw size={48} class="mb-4 opacity-50" />
			<h3 class="text-lg font-semibold opacity-50">Subscriptions</h3>
			<p class="mb-4 text-sm opacity-50">Track your recurring payments</p>
			<a href="/recurring/detect" class="btn btn-primary"> Detect subscriptions </a>
		</div>
	{:else}
		<div class="flex h-full flex-col">
			<div class="flex-1 space-y-3">
				{#each sortedTransactions as tx}
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
								<p class="line-clamp-1 font-medium">{tx.name}</p>
								<p class="text-xs text-base-content/60">
									{formatDate(tx.next_expected_date)} • {getDaysUntil(tx.next_expected_date)}
								</p>
							</div>
						</div>
						<div class="text-right">
							<p class="font-semibold">€{Math.abs(Number(tx.amount)).toFixed(2)}</p>
							<p class="text-xs text-base-content/60 capitalize">{tx.interval}</p>
						</div>
					</div>
				{/each}
			</div>

			<div class="mt-4 border-t border-base-200 pt-2">
				<a href="/recurring" class="group btn btn-block justify-between btn-ghost btn-sm">
					View all subscriptions
					<ArrowRight size={16} class="transition-transform group-hover:translate-x-1" />
				</a>
			</div>
		</div>
	{/if}
</DashboardWidget>
