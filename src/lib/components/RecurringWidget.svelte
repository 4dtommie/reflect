<script lang="ts">
	import DashboardWidget from './DashboardWidget.svelte';
	import { RefreshCw, Calendar, ArrowRight } from 'lucide-svelte';
	import type { RecurringTransaction } from '@prisma/client';
	import { detectionStore } from '$lib/stores/detectionStore';
	import { recurringModalStore } from '$lib/stores/recurringModalStore';

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

	function handleOpenModal(tx: RecurringTransaction) {
		recurringModalStore.open({
			id: tx.id,
			name: tx.name,
			amount: Number(tx.amount),
			interval: tx.interval,
			status: tx.status,
			type: tx.type,
			next_expected_date: tx.next_expected_date,
			transactions: [],
			isIncome: Number(tx.amount) > 0
		});
	}
</script>

<DashboardWidget
	size="auto"
	title="Upcoming payments"
	actionLabel="View all"
	actionHref="/recurring"
>
	{#if recurringTransactions.length === 0}
		<div class="flex h-full flex-col items-center justify-center py-6 text-center">
			<RefreshCw size={48} class="mb-4 opacity-50" />
			<h3 class="text-lg font-semibold opacity-50">Subscriptions</h3>
			<p class="mb-4 text-sm opacity-50">Track your recurring payments</p>
			<button onclick={() => detectionStore.runDetection()} class="btn btn-primary"
				>Detect subscriptions</button
			>
		</div>
	{:else}
		<div class="flex flex-col gap-2">
			{#each sortedTransactions as tx}
				{@const isPositive = Number(tx.amount) > 0}
				<button
					class="flex w-full cursor-pointer items-center justify-between rounded-lg border border-transparent px-3 py-2 text-left transition-all hover:border-base-300 hover:bg-base-200"
					onclick={() => handleOpenModal(tx)}
				>
					<div class="flex min-w-0 flex-1 flex-col">
						<span class="truncate text-sm font-medium">{tx.name}</span>
						<div class="flex items-center gap-2 text-xs text-base-content/60">
							<Calendar size={12} />
							<span
								>{formatDate(tx.next_expected_date)} • {getDaysUntil(tx.next_expected_date)}</span
							>
						</div>
					</div>
					<div class="flex-shrink-0 text-right">
						<p
							class={isPositive
								? 'inline-block rounded-lg bg-success/10 px-2 py-0.5 text-sm font-semibold text-success'
								: 'text-sm font-semibold'}
						>
							{isPositive ? '+' : ''}€ {Math.abs(Number(tx.amount)).toFixed(2).replace('.', ',')}
						</p>
					</div>
				</button>
			{/each}
		</div>
	{/if}
</DashboardWidget>
