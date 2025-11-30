<script lang="ts">
	import type { PageData } from './$types';
	import WelcomeWidget from '$lib/components/WelcomeWidget.svelte';
	import UploadCTAWidget from '$lib/components/UploadCTAWidget.svelte';
	import TransactionStatsWidget from '$lib/components/TransactionStatsWidget.svelte';
	import PlaceholderWidget from '$lib/components/PlaceholderWidget.svelte';
	import RecentTransactionsWidget from '$lib/components/RecentTransactionsWidget.svelte';
	import Masonry from '$lib/components/Masonry.svelte';
	import { Clock, TrendingUp, PieChart, Target, PiggyBank } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Dashboard - Reflect</title>
</svelte:head>

<Masonry stretchFirst={true} gridGap="2rem" colWidth="minmax(300px, 1fr)" stretchSpan="span 2">
	<WelcomeWidget username={data.user.username} />

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

	<RecentTransactionsWidget transactions={data.recentTransactions} />

	<PlaceholderWidget
		title="Savings goals"
		description="Track your savings milestones"
		size="small"
		icon={PiggyBank}
	/>

	<PlaceholderWidget
		title="Budget tracker"
		description="Monitor your budget goals and progress"
		size="small"
		icon={Target}
	/>
</Masonry>
