<script lang="ts">
	import type { PageData } from './$types';
	import DashboardWidget from '$lib/components/DashboardWidget.svelte';
	import PageTitleWidget from '$lib/components/PageTitleWidget.svelte';
	import RecurringStatsWidget from '$lib/components/RecurringStatsWidget.svelte';
	import UpcomingPaymentsWidget from '$lib/components/UpcomingPaymentsWidget.svelte';
	import RecurringItem from '$lib/components/RecurringItem.svelte';
	import Amount from '$lib/components/Amount.svelte';
	import { Search, TrendingDown, TrendingUp, ArrowRight, RefreshCw, Trash2 } from 'lucide-svelte';
	import { invalidateAll } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	// Separate by type: subscriptions, variable costs, and income
	const subscriptions = $derived.by(() => {
		return (data.subscriptions || []).filter((s) => {
			return !s.isIncome && s.status === 'active' && s.type === 'subscription';
		});
	});

	const variableCosts = $derived.by(() => {
		return (data.subscriptions || []).filter((s) => {
			return !s.isIncome && s.status === 'active' && s.type === 'variable_cost';
		});
	});

	const incomeSubscriptions = $derived.by(() => {
		return (data.subscriptions || []).filter((s) => {
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

	const hasData = $derived(
		(data.subscriptions && data.subscriptions.length > 0) ||
			subscriptions.length > 0 ||
			variableCosts.length > 0 ||
			incomeSubscriptions.length > 0
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
	<title>Recurring payments - Reflect</title>
</svelte:head>

<div class="grid grid-cols-1 gap-8 p-4 lg:grid-cols-3">
	<!-- Left Column: Sidebar widgets -->
	<div class="flex flex-col gap-8 lg:col-span-1">
		<!-- Page title -->
		<PageTitleWidget title="Recurring payments" subtitle="Track your subscriptions and income" />

		<!-- Stats widget - only show if we have data -->
		{#if hasData}
			<RecurringStatsWidget
				monthlyTotal={data.stats?.monthlyTotal || 0}
				yearlyTotal={data.stats?.yearlyTotal || 0}
				totalActive={data.stats?.totalActive || 0}
				overdue={data.stats?.overdue || 0}
			/>

			<!-- Upcoming payments widget -->
			<UpcomingPaymentsWidget {subscriptions} />
		{/if}

		<!-- Actions widget -->
		<DashboardWidget size="small" title="Actions">
			<div class="flex h-full flex-col justify-center gap-3">
				<a href="/recurring/detect" class="group btn justify-between btn-primary">
					<span class="flex items-center gap-2">
						<Search size={18} />
						Detect subscriptions
					</span>
					<ArrowRight size={16} class="transition-transform group-hover:translate-x-1" />
				</a>

				{#if hasData}
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
						Last updated: {new Date(
							data.subscriptions?.[0]?.updated_at || Date.now()
						).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
					</p>
				{/if}
			</div>
		</DashboardWidget>
	</div>

	<!-- Right Column: Main content -->
	<div class="flex flex-col gap-8 lg:col-span-2">
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
			<!-- Recurring income -->
			<DashboardWidget size="large" enableHover={false}>
				<div class="mb-4 flex items-center justify-between">
					<div class="flex items-center gap-3">
						<div class="rounded-full bg-success/10 p-2">
							<TrendingUp size={20} class="text-success" />
						</div>
						<div>
							<h2 class="text-xl font-bold">Recurring income</h2>
							<p class="text-sm opacity-60">
								{incomeSubscriptions.length} active source{incomeSubscriptions.length !== 1
									? 's'
									: ''}
							</p>
						</div>
					</div>
					<div class="text-right">
						<p class="text-xs tracking-wide uppercase opacity-50">Monthly</p>
						<p class="text-xl font-bold text-success">
							<Amount
								value={incomeStats.monthlyTotal}
								size="large"
								showDecimals={false}
								isDebit={false}
							/>
						</p>
					</div>
				</div>

				{#if incomeSubscriptions.length > 0}
					<div class="space-y-2">
						{#each incomeSubscriptions as subscription (subscription.id)}
							<RecurringItem {subscription} isIncome={true} />
						{/each}
					</div>
				{:else}
					<div class="py-8 text-center">
						<p class="opacity-50">No recurring income detected yet.</p>
						<p class="mt-1 text-sm opacity-40">
							Salary and regular transfers will appear here after detection.
						</p>
					</div>
				{/if}
			</DashboardWidget>

			<!-- Recurring expenses -->
			<DashboardWidget size="large" enableHover={false}>
				<div class="mb-4 flex items-center justify-between">
					<div class="flex items-center gap-3">
						<div class="rounded-full bg-error/10 p-2">
							<TrendingDown size={20} class="text-error" />
						</div>
						<div>
							<h2 class="text-xl font-bold">Recurring expenses</h2>
							<p class="text-sm opacity-60">
								{subscriptions.length} active subscription{subscriptions.length !== 1 ? 's' : ''}
							</p>
						</div>
					</div>
					<div class="text-right">
						<p class="text-xs tracking-wide uppercase opacity-50">Monthly</p>
						<p class="text-xl font-bold text-error">
							<Amount
								value={data.stats?.monthlyTotal || 0}
								size="large"
								showDecimals={false}
								isDebit={true}
							/>
						</p>
					</div>
				</div>

				{#if subscriptions.length > 0}
					<div class="space-y-2">
						{#each subscriptions as subscription (subscription.id)}
							<RecurringItem {subscription} isIncome={false} />
						{/each}
					</div>
				{:else}
					<div class="py-8 text-center">
						<p class="opacity-50">No recurring expenses detected yet.</p>
						<a href="/recurring/detect" class="mt-2 inline-block link text-sm link-primary">
							Run detection
						</a>
					</div>
				{/if}
			</DashboardWidget>
		{/if}
	</div>
</div>
