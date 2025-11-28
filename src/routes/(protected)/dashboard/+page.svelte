<script lang="ts">
	import type { PageData } from './$types';
	import WelcomeWidget from '$lib/components/WelcomeWidget.svelte';
	import UploadCTAWidget from '$lib/components/UploadCTAWidget.svelte';
	import TransactionStatsWidget from '$lib/components/TransactionStatsWidget.svelte';
	import PlaceholderWidget from '$lib/components/PlaceholderWidget.svelte';
	import RecentTransactionsWidget from '$lib/components/RecentTransactionsWidget.svelte';
	import { Clock, TrendingUp, PieChart, Target, PiggyBank } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Dashboard - Reflect</title>
</svelte:head>

<div class="grid auto-rows-fr grid-cols-1 gap-8 p-4 md:grid-cols-2 lg:grid-cols-3">
	<WelcomeWidget username={data.user.username} />

	<UploadCTAWidget hasTransactions={data.stats.totalTransactions > 0} />

	{#if data.stats.totalTransactions > 0}
		<TransactionStatsWidget
			totalTransactions={data.stats.totalTransactions}
			categorizedCount={data.stats.categorizedCount}
			categorizedPercentage={data.stats.categorizedPercentage}
		/>
	{:else}
		<PlaceholderWidget
			title="Transaction stats"
			description="See your transaction statistics here"
			size="medium"
			icon={TrendingUp}
		/>
	{/if}

	<div class="h-full lg:row-span-2">
		<RecentTransactionsWidget transactions={data.recentTransactions} />
	</div>

	<PlaceholderWidget
		title="Monthly spending"
		description="Track your spending trends over time"
		size="medium"
		icon={TrendingUp}
	/>

	<PlaceholderWidget
		title="Top categories"
		description="See where your money goes most"
		size="medium"
		icon={PieChart}
	/>

	<PlaceholderWidget
		title="Budget tracker"
		description="Monitor your budget goals and progress"
		size="small"
		icon={Target}
	/>

	<PlaceholderWidget
		title="Savings goals"
		description="Track your savings milestones"
		size="small"
		icon={PiggyBank}
	/>
</div>
