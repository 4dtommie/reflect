<script lang="ts">
	import Amount from './Amount.svelte';
	import { ChevronDown, ChevronUp } from 'lucide-svelte';
	import { slide } from 'svelte/transition';
	import { formatDateShort } from '$lib/utils/locale';

	type Transaction = {
		id: number;
		date: string | Date;
		amount: number;
		merchantName?: string | null;
	};

	type Subscription = {
		id: number;
		name: string;
		amount: number;
		interval: string | null;
		status: string;
		next_expected_date: string | Date | null;
		created_at: string | Date;
		transactions: Transaction[];
		merchants?: { name: string } | null;
		categories?: { name: string; icon: string | null; color: string | null } | null;
	};

	let {
		subscription,
		isIncome = false
	}: {
		subscription: Subscription;
		isIncome?: boolean;
	} = $props();

	let expanded = $state(false);

	// Calculate stats
	const stats = $derived.by(() => {
		const txs = subscription.transactions || [];
		if (txs.length === 0) {
			return {
				occurrences: 0,
				totalPaid: 0,
				averageAmount: subscription.amount,
				firstSeen: null,
				amountTrend: 'stable' as const
			};
		}

		const amounts = txs.map((t) => Math.abs(Number(t.amount)));
		const totalPaid = amounts.reduce((sum, a) => sum + a, 0);
		const averageAmount = totalPaid / amounts.length;

		// Calculate trend (compare first half to second half)
		let amountTrend: 'up' | 'down' | 'stable' = 'stable';
		if (amounts.length >= 2) {
			const latest = amounts[0];
			const oldest = amounts[amounts.length - 1];
			const diff = ((latest - oldest) / oldest) * 100;
			if (diff > 5) amountTrend = 'up';
			else if (diff < -5) amountTrend = 'down';
		}

		// Find first seen date
		const sortedByDate = [...txs].sort(
			(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
		);
		const firstSeen = sortedByDate.length > 0 ? new Date(sortedByDate[0].date) : null;

		return {
			occurrences: txs.length,
			totalPaid,
			averageAmount,
			firstSeen,
			amountTrend
		};
	});

	// Days until next payment
	const daysUntil = $derived.by(() => {
		if (!subscription.next_expected_date) return null;
		const nextDate = new Date(subscription.next_expected_date);
		const now = new Date();
		const diffMs = nextDate.getTime() - now.getTime();
		return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
	});


	function getIntervalLabel(interval: string | null): string {
		if (!interval) return 'Unknown';
		const labels: Record<string, string> = {
			monthly: 'Monthly',
			weekly: 'Weekly',
			yearly: 'Yearly',
			quarterly: 'Quarterly',
			'4-weekly': '4-weekly'
		};
		return labels[interval] || interval;
	}

	function getDaysLabel(days: number | null): string {
		if (days === null) return '';
		if (days < 0) return `${Math.abs(days)}d overdue`;
		if (days === 0) return 'Today';
		if (days === 1) return 'Tomorrow';
		return `in ${days}d`;
	}

	function getDaysColor(days: number | null): string {
		if (days === null) return '';
		if (days < 0) return 'badge-error';
		if (days <= 3) return 'badge-warning';
		if (days <= 7) return 'badge-info';
		return 'badge-ghost';
	}
</script>

<div class="border-b border-base-200 last:border-b-0">
	<button
		class="flex w-full cursor-pointer items-center justify-between gap-3 py-2.5 text-left transition-colors hover:bg-base-200/30 focus:outline-none"
		onclick={() => (expanded = !expanded)}
	>
		<!-- Left: Chevron + Name + Tags -->
		<div class="flex min-w-0 flex-1 items-center gap-2">
			<div class="flex-shrink-0 text-base-content/30">
				{#if expanded}
					<ChevronUp size={16} />
				{:else}
					<ChevronDown size={16} />
				{/if}
			</div>

			<span class="truncate">{subscription.name}</span>
		</div>

		<!-- Right: Amount -->
		<div class="flex-shrink-0">
			<span class="font-semibold">
				<Amount value={subscription.amount} size="small" showDecimals={true} isDebit={!isIncome} locale="NL" />
			</span>
		</div>
	</button>

	<!-- Expanded content -->
	{#if expanded}
		<div
			transition:slide={{ duration: 150 }}
			class="rounded-lg bg-base-200/30 p-4 pb-3"
			style="background-color: rgba(0, 0, 0, 0.03);"
		>
			<!-- Key Metrics Grid -->
			<div class="mb-4 grid grid-cols-3 gap-4 border-b border-base-300/50 pb-3">
				<div class="flex flex-col">
					<span class="mb-1 text-[10px] uppercase tracking-wide opacity-50">Total {new Date().getFullYear()}</span>
					<span class="text-base font-semibold">
						<Amount value={stats.totalPaid} size="small" showDecimals={false} isDebit={!isIncome} locale="NL" />
					</span>
				</div>
				<div class="flex flex-col">
					<span class="mb-1 text-[10px] uppercase tracking-wide opacity-50">Average</span>
					<span class="text-base font-semibold">
						<Amount value={Math.round(stats.averageAmount)} size="small" showDecimals={false} isDebit={!isIncome} locale="NL" />
					</span>
				</div>
				<div class="flex flex-col">
					<span class="mb-1 text-[10px] uppercase tracking-wide opacity-50">Frequency</span>
					<span class="text-base font-semibold">{getIntervalLabel(subscription.interval)}</span>
				</div>
			</div>

			<!-- Transaction history -->
			{#if subscription.transactions && subscription.transactions.length > 0}
				<div class="mb-4 space-y-2">
					<div class="mb-2 text-[10px] uppercase tracking-wide opacity-50">Recent transactions</div>
					{#each subscription.transactions.slice(0, 5) as tx (tx.id)}
						<div class="flex items-center justify-between gap-4 text-xs">
							<span class="opacity-70">{formatDateShort(tx.date)}</span>
							<div class="flex-1 border-t border-dotted border-base-300/50"></div>
							<span class="font-medium">
								<Amount value={tx.amount} size="small" showDecimals={true} isDebit={!isIncome} locale="NL" />
							</span>
						</div>
					{/each}
					{#if subscription.transactions.length > 5}
						<p class="pt-1 text-xs opacity-40">+{subscription.transactions.length - 5} more</p>
					{/if}
				</div>
			{/if}

			<!-- Divider and Since date -->
			<div class="border-t border-base-300/50 pt-3">
				{#if stats.firstSeen}
					<p class="text-xs opacity-60">Since {formatDateShort(stats.firstSeen)}</p>
				{/if}
			</div>
		</div>
	{/if}
</div>



