<script lang="ts">
	import type { PageData } from './$types';
	import PageTitleWidget from '$lib/components/PageTitleWidget.svelte';
	import DashboardWidget from '$lib/components/DashboardWidget.svelte';
	import PlaceholderWidget from '$lib/components/PlaceholderWidget.svelte';
	import RecurringExpensesWidget from '$lib/components/RecurringExpensesWidget.svelte';
	import { formatNumber } from '$lib/utils/locale';
	import { 
		CreditCard, 
		TrendingDown, 
		Calendar, 
		PieChart, 
		Bell, 
		Search,
		Plus,
		Settings
	} from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	const subtitles = [
		'Keep track of your recurring payments',
		'All your subscriptions in one place',
		'Know exactly what you pay for',
		'Manage your monthly commitments',
		'Never miss a payment again',
		'Your subscription command center',
		'Stay on top of recurring costs',
		'Subscription clarity starts here'
	];

	const randomSubtitle = subtitles[Math.floor(Math.random() * subtitles.length)];

	// Summary stats
	const totalSubscriptions = $derived(
		data.subscriptions?.filter((s) => !s.isIncome && s.status === 'active' && s.type === 'subscription').length || 0
	);
</script>

<svelte:head>
	<title>Subscriptions - Reflect</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<!-- Row 1: Title (2 cols) + Stats (1 col) -->
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<div class="lg:col-span-2">
			<PageTitleWidget
				title="Subscriptions"
				subtitle={randomSubtitle}
				class="h-full"
			/>
		</div>

		<!-- Quick stats card -->
		<DashboardWidget size="small" title="Overview">
			<div class="flex h-full flex-col justify-center gap-4">
				<div class="text-center">
					<div class="mb-1">
						<span class="text-3xl font-bold text-error">
							€ {formatNumber(Math.round(data.stats?.monthlyTotal || 0))}
						</span>
					</div>
					<span class="text-sm opacity-50">per month</span>
				</div>

				<div class="grid grid-cols-2 gap-4 border-t border-base-200 pt-4">
					<div class="text-center">
						<div class="text-2xl font-bold">{totalSubscriptions}</div>
						<div class="text-xs opacity-50">active</div>
					</div>
					<div class="text-center">
						<div class="text-2xl font-bold">
							€ {formatNumber(Math.round(data.stats?.yearlyTotal || 0))}
						</div>
						<div class="text-xs opacity-50">per year</div>
					</div>
				</div>
			</div>
		</DashboardWidget>
	</div>

	<!-- Row 2: Subscriptions list (2 cols) + Actions (1 col) -->
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<div class="lg:col-span-2">
			<RecurringExpensesWidget
				subscriptions={data.subscriptions || []}
				monthlyTotal={data.stats?.monthlyTotal || 0}
				title="Active subscriptions"
				emptyMessage="No subscriptions detected yet"
			/>
		</div>

		<!-- Actions panel -->
		<DashboardWidget size="small" title="Quick actions">
			<div class="flex h-full flex-col justify-center gap-3">
				<a href="/recurring/detect" class="btn btn-sm btn-primary justify-start gap-2">
					<Search size={16} />
					Detect subscriptions
				</a>
				<button class="btn btn-sm btn-outline justify-start gap-2" disabled>
					<Plus size={16} />
					Add manually
				</button>
				<button class="btn btn-sm btn-outline justify-start gap-2" disabled>
					<Bell size={16} />
					Set reminders
				</button>
				<button class="btn btn-sm btn-outline justify-start gap-2" disabled>
					<Settings size={16} />
					Manage categories
				</button>
			</div>
		</DashboardWidget>
	</div>

	<!-- Row 3: Category breakdown + Upcoming + Insights -->
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<PlaceholderWidget
			title="By category"
			description="See subscriptions grouped by category"
			size="small"
			icon={PieChart}
		/>

		<PlaceholderWidget
			title="Upcoming payments"
			description="Next 7 days of scheduled payments"
			size="small"
			icon={Calendar}
		/>

		<PlaceholderWidget
			title="Subscription insights"
			description="Trends and optimization suggestions"
			size="small"
			icon={TrendingDown}
		/>
	</div>

	<!-- Row 4: Cancellation tracker + Price history -->
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<PlaceholderWidget
			title="Cancellation tracker"
			description="Track subscriptions you want to cancel"
			size="small"
			icon={CreditCard}
		/>

		<PlaceholderWidget
			title="Price changes"
			description="Monitor price increases over time"
			size="small"
			icon={TrendingDown}
		/>
	</div>
</div>

