<script lang="ts">
	import Amount from './Amount.svelte';
	import {
		ChevronDown,
		ChevronUp,
		TrendingUp,
		TrendingDown,
		Minus,
		Calendar,
		Clock,
		Hash,
		Wallet
	} from 'lucide-svelte';
	import { slide } from 'svelte/transition';

	type Transaction = {
		id: number;
		date: string | Date;
		amount: number;
		merchantName: string;
	};

	type Subscription = {
		id: number;
		name: string;
		amount: number;
		interval: string;
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

	function formatDate(date: string | Date): string {
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function formatShortDate(date: string | Date): string {
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric'
		});
	}

	function getIntervalLabel(interval: string): string {
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

<div class="rounded-xl bg-base-200/50 transition-all duration-200 hover:bg-base-200">
	<button
		class="flex w-full cursor-pointer items-center justify-between gap-4 p-4 text-left focus:outline-none"
		onclick={() => (expanded = !expanded)}
	>
		<!-- Left: Icon + Name + Interval -->
		<div class="flex min-w-0 flex-1 items-center gap-3">
			<div class="flex-shrink-0 text-base-content/40">
				{#if expanded}
					<ChevronUp size={18} />
				{:else}
					<ChevronDown size={18} />
				{/if}
			</div>

			<div class="min-w-0 flex-1">
				<div class="flex items-center gap-2">
					<h3 class="truncate font-semibold">{subscription.name}</h3>

					<!-- Amount trend indicator -->
					{#if stats.amountTrend === 'up'}
						<TrendingUp size={14} class="flex-shrink-0 text-warning" />
					{:else if stats.amountTrend === 'down'}
						<TrendingDown size={14} class="flex-shrink-0 text-success" />
					{/if}
				</div>

				<div class="flex items-center gap-2 text-xs opacity-60">
					<span>{getIntervalLabel(subscription.interval)}</span>
					{#if daysUntil !== null}
						<span>•</span>
						<span class="badge badge-xs {getDaysColor(daysUntil)}">{getDaysLabel(daysUntil)}</span>
					{/if}
				</div>
			</div>
		</div>

		<!-- Right: Amount -->
		<div class="flex-shrink-0 text-right">
			<div class="text-lg font-bold">
				<Amount value={subscription.amount} size="medium" showDecimals={true} isDebit={!isIncome} />
			</div>
		</div>
	</button>

	<!-- Expanded content -->
	{#if expanded}
		<div transition:slide={{ duration: 200 }} class="border-t border-base-300 px-4 pt-4 pb-4">
			<!-- Stats grid -->
			<div class="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
				<div class="flex items-start gap-2">
					<Hash size={14} class="mt-0.5 flex-shrink-0 text-primary" />
					<div>
						<p class="text-xs opacity-50">Occurrences</p>
						<p class="font-semibold">{stats.occurrences}</p>
					</div>
				</div>

				<div class="flex items-start gap-2">
					<Wallet size={14} class="mt-0.5 flex-shrink-0 text-primary" />
					<div>
						<p class="text-xs opacity-50">Total paid</p>
						<p class="font-semibold">
							<Amount
								value={stats.totalPaid}
								size="small"
								showDecimals={false}
								isDebit={!isIncome}
							/>
						</p>
					</div>
				</div>

				<div class="flex items-start gap-2">
					<Minus size={14} class="mt-0.5 flex-shrink-0 text-primary" />
					<div>
						<p class="text-xs opacity-50">Average</p>
						<p class="font-semibold">
							<Amount
								value={stats.averageAmount}
								size="small"
								showDecimals={true}
								isDebit={!isIncome}
							/>
						</p>
					</div>
				</div>

				{#if stats.firstSeen}
					<div class="flex items-start gap-2">
						<Calendar size={14} class="mt-0.5 flex-shrink-0 text-primary" />
						<div>
							<p class="text-xs opacity-50">First seen</p>
							<p class="font-semibold">{formatShortDate(stats.firstSeen)}</p>
						</div>
					</div>
				{/if}
			</div>

			<!-- Transaction history -->
			{#if subscription.transactions && subscription.transactions.length > 0}
				<div class="mt-4">
					<p class="mb-2 text-xs font-medium uppercase tracking-wide opacity-50">
						Recent transactions
					</p>
					<div class="space-y-1">
						{#each subscription.transactions.slice(0, 5) as tx}
							<div
								class="flex items-center justify-between rounded-lg bg-base-100/50 px-3 py-2 text-sm"
							>
								<span class="opacity-70">{formatDate(tx.date)}</span>
								<Amount value={tx.amount} size="small" showDecimals={true} isDebit={!isIncome} />
							</div>
						{/each}
					</div>

					{#if subscription.transactions.length > 5}
						<p class="mt-2 text-center text-xs opacity-50">
							+{subscription.transactions.length - 5} more transactions
						</p>
					{/if}
				</div>
			{/if}

			<!-- Next payment info -->
			{#if subscription.next_expected_date}
				<div class="mt-4 flex items-center gap-2 rounded-lg bg-base-100/50 px-3 py-2">
					<Clock size={14} class="text-primary" />
					<span class="text-sm">
						<span class="opacity-70">Next payment:</span>
						<span class="font-medium">
							{formatDate(subscription.next_expected_date)}
						</span>
					</span>
				</div>
			{/if}
		</div>
	{/if}
</div>


