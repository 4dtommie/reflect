<script lang="ts">
	import DashboardWidget from './DashboardWidget.svelte';
	import RecurringItem from './RecurringItem.svelte';
	import Amount from './Amount.svelte';
	import { TrendingDown, ArrowRight } from 'lucide-svelte';

	type Transaction = {
		id: number;
		date: string | Date;
		amount: number;
		merchantName?: string | null;
		cleaned_merchant_name?: string | null;
	};

	type Subscription = {
		id: number;
		name: string;
		amount: number;
		interval: string | null;
		status: string;
		type: string | null;
		next_expected_date: Date | string | null;
		created_at: Date | string;
		updated_at: Date | string;
		isIncome: boolean;
		merchants?: { name: string } | null;
		categories?: { name: string; icon: string | null; color: string | null } | null;
		transactions: Transaction[];
	};

	let {
		subscriptions = [],
		monthlyTotal = 0,
		title = 'Recurring expenses',
		emptyMessage = 'No subscriptions detected',
		maxItems = 0,
		actionLabel = '',
		actionHref = ''
	}: {
		subscriptions?: Subscription[];
		monthlyTotal?: number;
		title?: string;
		emptyMessage?: string;
		maxItems?: number;
		actionLabel?: string;
		actionHref?: string;
	} = $props();

	// Filter to only expense subscriptions (not income)
	const expenseSubscriptions = $derived.by(() => {
		const filtered = subscriptions.filter((s) => !s.isIncome && s.status === 'active' && s.type === 'subscription');
		return maxItems > 0 ? filtered.slice(0, maxItems) : filtered;
	});

	const hasMore = $derived(maxItems > 0 && subscriptions.filter((s) => !s.isIncome && s.status === 'active' && s.type === 'subscription').length > maxItems);
	const showAction = $derived(actionLabel && actionHref);
</script>

<DashboardWidget size="small" enableHover={false}>
	<div class="mb-3">
		<div class="mb-1.5 flex items-center justify-between">
			<div class="flex items-center gap-2">
				<TrendingDown size={18} class="text-error" />
				<h2 class="font-semibold">{title}</h2>
			</div>
			<span class="text-lg font-bold text-error">
				<Amount value={monthlyTotal} size="medium" showDecimals={false} isDebit={true} locale="NL" />
			</span>
		</div>
		<div class="h-0.5 w-full rounded-full" style="background-color: rgb(139, 92, 246);"></div>
	</div>

	{#if expenseSubscriptions.length > 0}
		<div>
			{#each expenseSubscriptions as subscription (subscription.id)}
				<RecurringItem {subscription} isIncome={false} />
			{/each}
		</div>
		{#if hasMore}
			<p class="pt-2 text-center text-xs opacity-50">
				+{subscriptions.filter((s) => !s.isIncome && s.status === 'active' && s.type === 'subscription').length - maxItems} more
			</p>
		{/if}
	{:else}
		<p class="py-4 text-center text-sm opacity-50">{emptyMessage}</p>
	{/if}

	{#if showAction}
		<div class="mt-3 border-t border-base-200 pt-3">
			<a href={actionHref} class="btn btn-sm btn-ghost w-full justify-between group">
				<span>{actionLabel}</span>
				<ArrowRight size={16} class="transition-transform group-hover:translate-x-1" />
			</a>
		</div>
	{/if}
</DashboardWidget>

