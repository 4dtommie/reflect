<script lang="ts">
	import type { PageData } from './$types';
	import DashboardWidget from '$lib/components/DashboardWidget.svelte';
	import PageTitleWidget from '$lib/components/PageTitleWidget.svelte';
	import TransactionStatsWidget from '$lib/components/TransactionStatsWidget.svelte';
	import PlaceholderWidget from '$lib/components/PlaceholderWidget.svelte';
	import { Sparkles, Wand2, Tags, ListChecks, Brain, ArrowRight } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	const subtitles = [
		'Bring order to your financial chaos',
		'Every transaction deserves a home',
		'Turn raw data into insights',
		'Organize now, understand later',
		'The art of financial clarity',
		'Your transactions, properly sorted',
		'From confusion to comprehension',
		'Make sense of your spending'
	];

	const randomSubtitle = subtitles[Math.floor(Math.random() * subtitles.length)];
</script>

<svelte:head>
	<title>Categorization - Reflect</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<!-- Row 1: Title (2 cols) + Stats (1 col) -->
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<div class="lg:col-span-2">
			<PageTitleWidget title="Categorization" subtitle={randomSubtitle} class="h-full" />
		</div>
		<TransactionStatsWidget
			totalTransactions={data.stats.totalTransactions}
			uncategorizedCount={data.stats.uncategorizedCount}
			categorizedPercentage={data.stats.categorizedPercentage}
			topUncategorizedMerchants={data.stats.topUncategorizedMerchants}
			variant="detailed"
		/>
	</div>

	<!-- Row 2: Quick actions -->
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<!-- AI categorization -->
		<DashboardWidget size="small" enableHover={true}>
			<div class="flex h-full flex-col items-center justify-center py-4 text-center">
				<div class="mb-4 rounded-full bg-primary/10 p-4">
					<Brain size={32} class="text-primary" />
				</div>
				<h3 class="mb-2 text-lg font-semibold">AI categorization</h3>
				<p class="mb-4 text-sm opacity-70">
					Let AI automatically categorize your uncategorized transactions
				</p>
				<button class="group btn w-full justify-between btn-primary" disabled>
					<span>Coming soon</span>
					<Sparkles size={16} />
				</button>
			</div>
		</DashboardWidget>

		<!-- Bulk categorize by merchant -->
		<DashboardWidget size="small" enableHover={true}>
			<div class="flex h-full flex-col items-center justify-center py-4 text-center">
				<div class="mb-4 rounded-full bg-secondary/10 p-4">
					<Tags size={32} class="text-secondary" />
				</div>
				<h3 class="mb-2 text-lg font-semibold">By merchant</h3>
				<p class="mb-4 text-sm opacity-70">
					Categorize all transactions from a specific merchant at once
				</p>
				<button class="group btn w-full justify-between btn-secondary" disabled>
					<span>Coming soon</span>
					<ArrowRight size={16} class="transition-transform group-hover:translate-x-1" />
				</button>
			</div>
		</DashboardWidget>

		<!-- Manual review -->
		<DashboardWidget size="small" enableHover={true}>
			<div class="flex h-full flex-col items-center justify-center py-4 text-center">
				<div class="mb-4 rounded-full bg-accent/10 p-4">
					<ListChecks size={32} class="text-accent" />
				</div>
				<h3 class="mb-2 text-lg font-semibold">Manual review</h3>
				<p class="mb-4 text-sm opacity-70">
					Review and categorize transactions one by one
				</p>
				<button class="group btn w-full justify-between btn-accent" disabled>
					<span>Coming soon</span>
					<ArrowRight size={16} class="transition-transform group-hover:translate-x-1" />
				</button>
			</div>
		</DashboardWidget>
	</div>

	<!-- Row 3: Top uncategorized merchants + Rules -->
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<!-- Top uncategorized merchants -->
		<PlaceholderWidget
			title="Top uncategorized merchants"
			description="Quick access to merchants that need categorization the most"
			size="medium"
			icon={Tags}
		/>

		<!-- Categorization rules -->
		<PlaceholderWidget
			title="Categorization rules"
			description="Set up automatic rules to categorize future transactions"
			size="medium"
			icon={Wand2}
		/>
	</div>
</div>

