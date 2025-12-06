<script lang="ts">
	import type { PageData } from './$types';
	import WelcomeWidget from '$lib/components/WelcomeWidget.svelte';
	import ChatWidget from '$lib/components/ChatWidget.svelte';
	import UploadCTAWidget from '$lib/components/UploadCTAWidget.svelte';
	import TransactionStatsWidget from '$lib/components/TransactionStatsWidget.svelte';
	import PlaceholderWidget from '$lib/components/PlaceholderWidget.svelte';
	import RecentTransactionsWidget from '$lib/components/RecentTransactionsWidget.svelte';
	import RecurringWidget from '$lib/components/RecurringWidget.svelte';
	import NetBalanceWidget from '$lib/components/NetBalanceWidget.svelte';
	import { TrendingUp, Target, PiggyBank } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Dashboard - Reflect</title>
</svelte:head>

<div class="grid grid-cols-1 gap-8 py-4 lg:grid-cols-3">
	<!-- Left Column (2/3 width) -->
	<div class="space-y-8 lg:col-span-2">
		<WelcomeWidget username={data.user.username} />

		<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
			<!-- Left sub-column -->
			<div class="space-y-8">
				<RecentTransactionsWidget transactions={data.recentTransactions.slice(0, 2)} />

				{#if data.stats.categorizedCount > 0}
					<RecurringWidget recurringTransactions={data.recurringTransactions} />
				{:else if data.stats.totalTransactions > 0}
					<PlaceholderWidget
						title="Upcoming payments"
						description="Categorize transactions to detect recurring payments"
						size="small"
						icon={TrendingUp}
					/>
				{/if}
			</div>

			<!-- Right sub-column -->
			<div class="space-y-8">
				<ChatWidget insight={data.chatInsight} />

				<PlaceholderWidget
					title="Savings goals"
					description="Track your savings milestones"
					size="small"
					icon={PiggyBank}
				/>
			</div>
		</div>
	</div>

	<!-- Right Column (1/3 width) -->
	<div class="space-y-8 lg:col-span-1">
		{#if data.stats.totalTransactions === 0}
			<UploadCTAWidget hasTransactions={false} />
		{/if}

		{#if data.stats.totalTransactions > 0}
			<TransactionStatsWidget
				totalTransactions={data.stats.totalTransactions}
				uncategorizedCount={data.stats.uncategorizedCount}
				categorizedPercentage={data.stats.categorizedPercentage}
				topUncategorizedMerchants={data.stats.topUncategorizedMerchants}
				variant="compact"
			/>
		{:else}
			<PlaceholderWidget
				title="Transaction stats"
				description="See your transaction statistics here"
				size="medium"
				icon={TrendingUp}
			/>
		{/if}

		{#if data.recurringTransactions.length > 0}
			<NetBalanceWidget
				monthlyIncome={data.balanceData.monthlyIncome}
				monthlyExpenses={data.balanceData.monthlyExpenses}
				recurringExpenses={data.balanceData.recurringExpenses}
				variableExpenses={data.balanceData.variableExpenses}
				monthlySavings={data.balanceData.monthlySavings}
				actionLabel="View spending patterns"
				actionHref="/recurring"
			/>
		{:else if data.stats.categorizedCount > 0}
			<PlaceholderWidget
				title="Average income to spend"
				description="Run subscription detection to see your spendable income"
				size="small"
				icon={TrendingUp}
			/>
		{/if}

		<PlaceholderWidget
			title="Budget tracker"
			description="Monitor your budget goals and progress"
			size="small"
			icon={Target}
		/>
	</div>
</div>
