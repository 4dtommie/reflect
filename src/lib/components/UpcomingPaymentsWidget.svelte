<script lang="ts">
	import DashboardWidget from './DashboardWidget.svelte';
	import Amount from './Amount.svelte';
	import { Calendar, Clock, AlertTriangle } from 'lucide-svelte';
	import { recurringModalStore } from '$lib/stores/recurringModalStore';

	type Subscription = {
		id: number;
		name: string;
		amount: number;
		interval: string | null;
		status?: string;
		type?: string | null;
		next_expected_date: string | Date | null;
		created_at?: string | Date;
		transactions?: any[];
		categories?: { id: number; name: string; icon?: string | null; color?: string | null } | null;
	};

	let { subscriptions = [] }: { subscriptions: Subscription[] } = $props();

	// Sort by next payment date and take top 5
	const upcomingPayments = $derived.by(() => {
		const now = new Date();
		return [...subscriptions]
			.filter((s) => s.next_expected_date)
			.map((s) => {
				const nextDate = new Date(s.next_expected_date!);
				const diffMs = nextDate.getTime() - now.getTime();
				const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
				return { ...s, nextDate, daysUntil };
			})
			.sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime())
			.slice(0, 5);
	});

	function formatDate(date: Date): string {
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	function getDaysLabel(days: number): string {
		if (days < 0) return 'Overdue';
		if (days === 0) return 'Today';
		if (days === 1) return 'Tomorrow';
		return `in ${days} days`;
	}

	function getStatusColor(days: number): string {
		if (days < 0) return 'text-error';
		if (days <= 3) return 'text-warning';
		if (days <= 7) return 'text-info';
		return 'text-base-content/60';
	}

	function handleOpenModal(subscription: Subscription) {
		recurringModalStore.open({
			...subscription,
			status: subscription.status ?? 'active',
			transactions: subscription.transactions ?? [],
			isIncome: false
		});
	}
</script>

<DashboardWidget size="small" title="Upcoming payments">
	{#if upcomingPayments.length === 0}
		<div class="flex h-full flex-col items-center justify-center py-4 text-center">
			<Calendar size={32} class="mb-2 opacity-30" />
			<p class="text-sm opacity-50">No upcoming payments scheduled</p>
		</div>
	{:else}
		<div class="flex flex-col gap-2">
			{#each upcomingPayments as payment}
				<button
					class="flex w-full cursor-pointer items-center justify-between rounded-lg border border-transparent px-3 py-2 text-left transition-all hover:border-base-300 hover:bg-base-200"
					onclick={() => handleOpenModal(payment)}
				>
					<div class="flex min-w-0 flex-1 flex-col">
						<span class="truncate text-sm font-medium">{payment.name}</span>
						<div class="flex items-center gap-2 text-xs {getStatusColor(payment.daysUntil)}">
							{#if payment.daysUntil < 0}
								<AlertTriangle size={12} />
							{:else}
								<Clock size={12} />
							{/if}
							<span>{formatDate(payment.nextDate)} • {getDaysLabel(payment.daysUntil)}</span>
						</div>
					</div>
					<div class="flex-shrink-0 text-right">
						<Amount value={payment.amount} size="sm" showDecimals={true} isDebit={true} />
					</div>
				</button>
			{/each}
		</div>
	{/if}
</DashboardWidget>
