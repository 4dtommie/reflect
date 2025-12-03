<script lang="ts">
	import type { PageData } from './$types';
	import DashboardWidget from '$lib/components/DashboardWidget.svelte';
	import PageTitleWidget from '$lib/components/PageTitleWidget.svelte';
	import NetBalanceWidget from '$lib/components/NetBalanceWidget.svelte';
	import UpcomingPaymentsWidget from '$lib/components/UpcomingPaymentsWidget.svelte';
	import RecurringItem from '$lib/components/RecurringItem.svelte';
	import VariableSpendingItem from '$lib/components/VariableSpendingItem.svelte';
	import Amount from '$lib/components/Amount.svelte';
	import { Search, TrendingDown, TrendingUp, ArrowRight, RefreshCw, Trash2, ShoppingCart } from 'lucide-svelte';
	import { invalidateAll } from '$app/navigation';
	import { formatDateShort } from '$lib/utils/locale';

	let { data }: { data: PageData } = $props();

	const subtitles = [
		'Your predictable expenses, all in one place',
		'Track what leaves your account every month',
		'The costs that keep coming back',
		'Know exactly where your money goes',
		'Fixed costs and habitual spending',
		'Your monthly financial commitments',
		'The recurring rhythm of your finances',
		'Subscriptions, bills, and everyday habits',
		'What your future self is already paying for',
		'The autopilot expenses of your life'
	];

	const randomSubtitle = subtitles[Math.floor(Math.random() * subtitles.length)];

	// Type for subscription items
	type SubscriptionItem = NonNullable<PageData['subscriptions']>[number];

	// Separate by type: subscriptions, variable costs, and income
	const subscriptions = $derived.by(() => {
		return (data.subscriptions || []).filter((s: SubscriptionItem) => {
			return !s.isIncome && s.status === 'active' && s.type === 'subscription';
		});
	});

	const variableCosts = $derived.by(() => {
		return (data.subscriptions || []).filter((s: SubscriptionItem) => {
			return !s.isIncome && s.status === 'active' && s.type === 'variable_cost';
		});
	});

	const incomeSubscriptions = $derived.by(() => {
		return (data.subscriptions || []).filter((s: SubscriptionItem) => {
			return s.isIncome && s.status === 'active';
		});
	});

	// Calculate income stats separately
	const incomeStats = $derived.by(() => {
		let monthlyTotal = 0;
		let yearlyTotal = 0;

		for (const sub of incomeSubscriptions) {
			const amount = Number(sub.amount);
			let monthlyAmount = 0;
			let yearlyAmount = 0;

			switch (sub.interval) {
				case 'monthly':
					monthlyAmount = amount;
					yearlyAmount = amount * 12;
					break;
				case 'yearly':
					monthlyAmount = amount / 12;
					yearlyAmount = amount;
					break;
				case 'quarterly':
					monthlyAmount = amount / 3;
					yearlyAmount = amount * 4;
					break;
				case 'weekly':
					monthlyAmount = amount * 4.33;
					yearlyAmount = amount * 52;
					break;
				case '4-weekly':
					monthlyAmount = amount * (52 / 13);
					yearlyAmount = amount * 13;
					break;
				default:
					monthlyAmount = amount;
					yearlyAmount = amount * 12;
			}

			monthlyTotal += monthlyAmount;
			yearlyTotal += yearlyAmount;
		}

		return { monthlyTotal, yearlyTotal };
	});

	// Variable spending patterns from DB
	const variableSpending = $derived(data.variableSpending || []);
	const variableStats = $derived(data.variableStats || null);

	const hasData = $derived(
		(data.subscriptions && data.subscriptions.length > 0) ||
			subscriptions.length > 0 ||
			variableCosts.length > 0 ||
			incomeSubscriptions.length > 0 ||
			variableSpending.length > 0
	);

	async function deleteAllSubscriptions() {
		if (!confirm('Are you sure you want to delete ALL subscriptions? This cannot be undone.'))
			return;

		try {
			const res = await fetch('/api/recurring', { method: 'DELETE' });
			if (res.ok) {
				await invalidateAll();
			} else {
				alert('Failed to delete subscriptions');
			}
		} catch (e) {
			console.error(e);
			alert('Error deleting subscriptions');
		}
	}
</script>

<svelte:head>
	<title>Spending patterns - Reflect</title>
</svelte:head>

<div class="flex flex-col gap-6">
	{#if !hasData}
		<!-- Empty state -->
		<DashboardWidget size="large">
			<div class="flex h-full flex-col items-center justify-center py-12 text-center">
				<div class="mb-6 rounded-full bg-primary/10 p-6">
					<RefreshCw size={48} class="text-primary" />
				</div>
				<h2 class="mb-2 text-2xl font-bold">No recurring payments yet</h2>
				<p class="mb-8 max-w-md opacity-70">
					We haven't detected any subscriptions or recurring income. Run the detection to find
					patterns in your transactions.
				</p>
				<a href="/recurring/detect" class="btn btn-lg btn-primary">
					<Search size={20} class="mr-2" />
					Start detection
				</a>
			</div>
		</DashboardWidget>
	{:else}
		<!-- Row 1: Title (2 cols) + Net Balance (1 col) -->
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
			<div class="lg:col-span-2">
				<PageTitleWidget 
					title="Spending patterns" 
					subtitle={randomSubtitle} 
					monthlySpending={data.monthlySpending || []}
					class="h-full" 
				/>
			</div>
			<NetBalanceWidget
				monthlyIncome={incomeStats.monthlyTotal}
				monthlyExpenses={(data.stats?.monthlyTotal || 0) + (variableStats?.totalMonthlyAverage || 0)}
				recurringExpenses={data.stats?.monthlyTotal || 0}
				variableExpenses={variableStats?.totalMonthlyAverage || 0}
				monthlySavings={data.monthlySavingsAverage || 0}
			/>
		</div>

		<!-- Row 2: Income, Expenses, Variable (3 cols) -->
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
			<!-- Recurring income -->
			<DashboardWidget size="small" enableHover={false}>
				<div class="mb-3">
					<div class="mb-1.5 flex items-center justify-between">
						<div class="flex items-center gap-2">
							<TrendingUp size={18} class="text-success" />
							<h2 class="font-semibold">Income</h2>
						</div>
						<span class="text-lg font-bold text-success">
							<Amount value={incomeStats.monthlyTotal} size="medium" showDecimals={false} isDebit={false} locale="NL" />
						</span>
					</div>
					<div class="h-0.5 w-full rounded-full bg-success"></div>
				</div>

				{#if incomeSubscriptions.length > 0}
					<div>
						{#each incomeSubscriptions as subscription (subscription.id)}
							<RecurringItem {subscription} isIncome={true} />
						{/each}
					</div>
				{:else}
					<p class="py-4 text-center text-sm opacity-50">No income detected</p>
				{/if}
			</DashboardWidget>

			<!-- Recurring expenses -->
			<DashboardWidget size="small" enableHover={false}>
				<div class="mb-3">
					<div class="mb-1.5 flex items-center justify-between">
						<div class="flex items-center gap-2">
							<TrendingDown size={18} class="text-error" />
							<h2 class="font-semibold">Recurring expenses</h2>
						</div>
						<span class="text-lg font-bold text-error">
							<Amount value={data.stats?.monthlyTotal || 0} size="medium" showDecimals={false} isDebit={true} locale="NL" />
						</span>
					</div>
					<div class="h-0.5 w-full rounded-full" style="background-color: rgb(139, 92, 246);"></div>
				</div>

				{#if subscriptions.length > 0}
					<div>
						{#each subscriptions as subscription (subscription.id)}
							<RecurringItem {subscription} isIncome={false} />
						{/each}
					</div>
				{:else}
					<p class="py-4 text-center text-sm opacity-50">No subscriptions detected</p>
				{/if}
			</DashboardWidget>

			<!-- Variable spending -->
			<DashboardWidget size="small" enableHover={false}>
				<div class="mb-3">
					<div class="mb-1.5 flex items-center justify-between">
						<div class="flex items-center gap-2">
							<ShoppingCart size={18} class="text-warning" />
							<h2 class="font-semibold">Variable expenses</h2>
						</div>
						<span class="text-lg font-bold text-warning">
							<Amount value={variableStats?.totalMonthlyAverage || 0} size="medium" showDecimals={false} isDebit={true} locale="NL" />
						</span>
					</div>
					<div class="h-0.5 w-full rounded-full" style="background-color: rgb(196, 181, 253);"></div>
				</div>

				{#if variableSpending.length > 0}
					<div>
						{#each variableSpending as pattern (pattern.id)}
							<VariableSpendingItem {pattern} />
						{/each}
					</div>
				{:else}
					<p class="py-4 text-center text-sm opacity-50">No patterns saved</p>
				{/if}
			</DashboardWidget>
		</div>

		<!-- Row 3: Upcoming, Actions (2 cols) -->
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
			<!-- Upcoming payments -->
			<UpcomingPaymentsWidget {subscriptions} />

			<!-- Actions -->
			<DashboardWidget size="small" title="Actions">
				<div class="flex h-full flex-col justify-center gap-3">
					<a href="/recurring/detect" class="group btn justify-between btn-primary">
						<span class="flex items-center gap-2">
							<Search size={18} />
							Detect patterns
						</span>
						<ArrowRight size={16} class="transition-transform group-hover:translate-x-1" />
					</a>

					<button
						class="group btn justify-between btn-outline btn-error"
						onclick={deleteAllSubscriptions}
					>
						<span class="flex items-center gap-2">
							<Trash2 size={18} />
							Delete all
						</span>
					</button>

					<p class="text-center text-xs opacity-50">
						Last updated: {formatDateShort(data.subscriptions?.[0]?.updated_at || Date.now())}
					</p>
				</div>
			</DashboardWidget>
		</div>
	{/if}
</div>
