<script lang="ts">
	import type { PageData } from './$types';
	import WelcomeWidget from '$lib/components/WelcomeWidget.svelte';
	import UploadCTAWidget from '$lib/components/UploadCTAWidget.svelte';
	import TransactionStatsWidget from '$lib/components/TransactionStatsWidget.svelte';
	import PlaceholderWidget from '$lib/components/PlaceholderWidget.svelte';
	import RecentTransactionsWidget from '$lib/components/RecentTransactionsWidget.svelte';
	import { Clock, TrendingUp, PieChart, Target, PiggyBank, RefreshCw } from 'lucide-svelte';

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
			<div>
				<RecentTransactionsWidget transactions={data.recentTransactions} />
			</div>

			<!-- Right sub-column -->
			<div class="space-y-8">
				<PlaceholderWidget
					title="Top categories"
					description="See where your money goes most"
					size="small"
					icon={PieChart}
				/>

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
			/>
		{:else}
			<PlaceholderWidget
				title="Transaction stats"
				description="See your transaction statistics here"
				size="medium"
				icon={TrendingUp}
			/>
		{/if}

		<PlaceholderWidget
			title="Subscriptions"
			description="Track your recurring payments"
			size="small"
			icon={RefreshCw}
		/>

		<PlaceholderWidget
			title="Budget tracker"
			description="Monitor your budget goals and progress"
			size="small"
			icon={Target}
		/>
	</div>
</div>
