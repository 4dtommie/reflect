<script lang="ts">
	import {
		Target,
		Scissors,
		PiggyBank,
		Users,
		TrendingUp,
		Sparkles,
		Coffee,
		Plane,
		ShieldCheck,
		ArrowRight,
		UsersRound,
		FileSearch,
		UserCircle,
		Heart,
		Swords,
		Gift,
		Plus,
		ThumbsUp,
		ChevronDown,
		ChevronUp,
		Trophy
	} from 'lucide-svelte';
	import type { ComponentType } from 'svelte';
	import PageTitleWidget from '$lib/components/PageTitleWidget.svelte';

	// Witty random subtitles
	const wittySubtitles = [
		"Your wallet's personal trainer 💪",
		"Because money doesn't grow on trees... yet",
		"Turning 'I should' into 'I did'",
		'Small steps, big coins',
		"Let's get financially spicy 🌶️",
		'Your future self will thank you',
		'Less stress, more progress',
		'Tools to level up your finances'
	];
	const randomSubtitle = wittySubtitles[Math.floor(Math.random() * wittySubtitles.length)];

	// 3-Bucket outcome-based categories
	type OutcomeCategory = 'grow-wealth' | 'community' | 'mindset';

	const outcomeCategories: {
		id: OutcomeCategory | 'all';
		label: string;
		color: string;
		gradient: string;
	}[] = [
		{ id: 'all', label: 'All', color: 'bg-gray-500', gradient: 'from-gray-500 to-gray-600' },
		{
			id: 'grow-wealth',
			label: 'Grow wealth',
			color: 'bg-green-500',
			gradient: 'from-green-500 to-emerald-600'
		},
		{
			id: 'community',
			label: 'Community',
			color: 'bg-blue-500',
			gradient: 'from-blue-500 to-blue-600'
		},
		{
			id: 'mindset',
			label: 'Mindset',
			color: 'bg-amber-500',
			gradient: 'from-amber-500 to-orange-600'
		}
	];

	interface ActionCard {
		id: string;
		title: string;
		description: string;
		icon: ComponentType;
		status: 'coming-soon' | 'beta' | 'available';
		outcome: OutcomeCategory;
		votes?: number;
		isSocial?: boolean;
	}

	// Consolidated action cards (merged bill negotiator, bill crusher, subscription slayer into one)
	const actionCards: ActionCard[] = [
		// Grow Wealth
		{
			id: 'create-budget',
			title: 'Create a budget',
			description: 'Set spending limits and track progress.',
			icon: Target,
			status: 'coming-soon',
			outcome: 'grow-wealth',
			votes: 342
		},
		{
			id: 'subscription-audit',
			title: 'Stop a subscription',
			description: 'Find forgotten subscriptions to cancel.',
			icon: Scissors,
			status: 'coming-soon',
			outcome: 'grow-wealth',
			votes: 891
		},
		{
			id: 'financial-plan',
			title: 'Financial plan',
			description: 'Roadmap for debt payoff and savings.',
			icon: TrendingUp,
			status: 'coming-soon',
			outcome: 'grow-wealth',
			votes: 567
		},
		{
			id: 'savings-challenge',
			title: '52-week challenge',
			description: 'Grow savings week by week.',
			icon: PiggyBank,
			status: 'coming-soon',
			outcome: 'grow-wealth',
			votes: 1203
		},
		{
			id: 'vacation-fund',
			title: 'Vacation fund',
			description: 'Save monthly for your dream trip.',
			icon: Plane,
			status: 'coming-soon',
			outcome: 'grow-wealth',
			votes: 678
		},
		{
			id: 'emergency-fund',
			title: 'Emergency fund',
			description: 'Build your 3-6 month safety net.',
			icon: ShieldCheck,
			status: 'coming-soon',
			outcome: 'grow-wealth',
			votes: 934
		},
		{
			id: 'bill-crusher',
			title: 'Bill crusher',
			description: 'Scripts to negotiate bills and cancel subscriptions.',
			icon: FileSearch,
			status: 'coming-soon',
			outcome: 'grow-wealth',
			votes: 2168
		},

		// Community
		{
			id: 'peer-comparison',
			title: 'Compare with peers',
			description: 'See how you stack up anonymously.',
			icon: Users,
			status: 'coming-soon',
			outcome: 'community',
			votes: 723,
			isSocial: true
		},
		{
			id: 'squad-goals',
			title: 'Squad goals',
			description: 'Shared savings pots with friends.',
			icon: UsersRound,
			status: 'coming-soon',
			outcome: 'community',
			votes: 823,
			isSocial: true
		},
		{
			id: 'karma-roundup',
			title: 'Karma round-up',
			description: 'Round up purchases for charity.',
			icon: Heart,
			status: 'coming-soon',
			outcome: 'community',
			votes: 612,
			isSocial: true
		},
		{
			id: 'zero-spend-duel',
			title: 'Zero-spend duel',
			description: 'No-spend weekend with a friend.',
			icon: Swords,
			status: 'coming-soon',
			outcome: 'community',
			votes: 945,
			isSocial: true
		},
		{
			id: 'crowdfund-dream',
			title: 'Crowdfund my dream',
			description: 'Friends fund your birthday goal.',
			icon: Gift,
			status: 'coming-soon',
			outcome: 'community',
			votes: 734,
			isSocial: true
		},

		// Mindset
		{
			id: 'latte-factor',
			title: 'Latte factor',
			description: 'Small costs that add up big.',
			icon: Coffee,
			status: 'coming-soon',
			outcome: 'mindset',
			votes: 456
		},
		{
			id: 'money-habits',
			title: 'Money habits',
			description: 'Discover your spending triggers.',
			icon: Sparkles,
			status: 'coming-soon',
			outcome: 'mindset',
			votes: 412
		},
		{
			id: 'future-you',
			title: 'Meet "Future you"',
			description: 'Connect with your future self.',
			icon: UserCircle,
			status: 'coming-soon',
			outcome: 'mindset',
			votes: 389
		}
	];

	const heroCard = actionCards.find((c) => c.id === 'latte-factor')!;
	const topPicks = actionCards
		.filter((c) => c.id !== heroCard.id)
		.sort((a, b) => (b.votes || 0) - (a.votes || 0))
		.slice(0, 3);

	// Active actions with action buttons
	interface ActiveAction {
		id: string;
		title: string;
		icon: ComponentType;
		outcome: OutcomeCategory;
		status: 'in-progress' | 'completed';
		progress: number;
		summary: string;
		actionButton: { label: string; amount?: number };
		savedAmount?: number;
	}

	const activeActions: ActiveAction[] = [
		{
			id: 'active-52week',
			title: '52-week challenge',
			icon: PiggyBank,
			outcome: 'grow-wealth',
			status: 'in-progress',
			progress: 35,
			summary: '€273 saved so far',
			actionButton: { label: 'Complete Week 18', amount: 18 }
		},
		{
			id: 'active-emergency',
			title: 'Emergency fund',
			icon: ShieldCheck,
			outcome: 'grow-wealth',
			status: 'in-progress',
			progress: 68,
			summary: '€3,400 of €5,000',
			actionButton: { label: 'Add', amount: 50 }
		},
		{
			id: 'completed-subscription',
			title: 'Subscription audit',
			icon: Scissors,
			outcome: 'grow-wealth',
			status: 'completed',
			progress: 100,
			summary: 'Canceled 3 subscriptions',
			actionButton: { label: 'View' },
			savedAmount: 47
		}
	];

	// Impact stats
	const impactStats = {
		totalSaved: 3673,
		monthlySavings: 47,
		activeCount: activeActions.filter((a) => a.status === 'in-progress').length,
		completedCount: activeActions.filter((a) => a.status === 'completed').length
	};

	let selectedCategory = $state<OutcomeCategory | 'all'>('all');
	let activeView = $state<'your-actions' | 'discover'>('your-actions');
	let showAllCards = $state(false);
	let votedCards = $state<Set<string>>(new Set());

	const filteredCards = $derived(() => {
		const cards = actionCards.filter((c) => c.id !== heroCard.id);
		return selectedCategory === 'all' ? cards : cards.filter((c) => c.outcome === selectedCategory);
	});

	const visibleCards = $derived(() => {
		if (showAllCards || selectedCategory !== 'all') return filteredCards();
		return topPicks;
	});

	const remainingCount = $derived(() => filteredCards().length - visibleCards().length);
	const inProgressActions = $derived(activeActions.filter((a) => a.status === 'in-progress'));
	const completedActions = $derived(activeActions.filter((a) => a.status === 'completed'));

	function handleVote(cardId: string) {
		votedCards = new Set([...votedCards, cardId]);
	}

	function getCategoryColor(outcome: OutcomeCategory) {
		return outcomeCategories.find((c) => c.id === outcome) || outcomeCategories[1];
	}
</script>

<svelte:head>
	<title>Actions - Reflect</title>
</svelte:head>

<div class="space-y-6 px-4 py-4">
	<!-- Header with Title + Stats -->
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<div class="lg:col-span-2">
			<PageTitleWidget title="Take action" subtitle={randomSubtitle} class="h-full" />
		</div>
		<div
			class="flex flex-col justify-center gap-4 rounded-3xl bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white shadow-xl"
		>
			<div class="text-center">
				<p class="text-3xl font-bold">€{impactStats.totalSaved.toLocaleString()}</p>
				<p class="text-sm opacity-80">Total saved</p>
			</div>
			<div class="h-px bg-white/20"></div>
			<div class="flex items-center justify-center gap-6">
				<div class="text-center">
					<p class="text-2xl font-bold">{impactStats.completedCount}</p>
					<p class="text-xs opacity-80">Completed</p>
				</div>
				<div class="h-10 w-px bg-white/30"></div>
				<div class="text-center">
					<p class="text-2xl font-bold">{impactStats.activeCount}</p>
					<p class="text-xs opacity-80">In progress</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Horizontal Gutter -->
	<div class="h-px"></div>

	<!-- Side-by-side layout: 50/50 with gutter -->
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1px_1fr]">
		<!-- LEFT COLUMN: Your Actions -->
		<div class="space-y-4">
			<h3 class="text-sm font-semibold opacity-60">In progress</h3>

			<!-- IN PROGRESS CARDS -->
			{#if inProgressActions.length > 0}
				<div class="space-y-3">
					{#each inProgressActions as action (action.id)}
						{@const cat = getCategoryColor(action.outcome)}
						<div class="rounded-2xl bg-base-100 p-4 shadow-lg">
							<!-- Thick progress bar -->
							<div class="mb-3 h-2 w-full overflow-hidden rounded-full bg-base-200">
								<div
									class="h-full rounded-full bg-gradient-to-r {cat.gradient} transition-all"
									style="width: {action.progress}%"
								></div>
							</div>

							<div class="flex items-center gap-3">
								<div class="{cat.color} flex-shrink-0 rounded-xl p-2 text-white">
									<action.icon size={18} />
								</div>
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2">
										<h3 class="text-sm font-semibold">{action.title}</h3>
										<span class="text-xs opacity-50">{action.progress}%</span>
									</div>
									<p class="text-xs opacity-70">{action.summary}</p>
								</div>
								<button class="btn gap-1 rounded-full btn-xs btn-primary">
									{#if action.actionButton.amount}
										<Plus size={12} />
										€{action.actionButton.amount}
									{:else}
										{action.actionButton.label}
									{/if}
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}

			<!-- COMPLETED - COMPACT TROPHY CASE -->
			{#if completedActions.length > 0}
				<div class="space-y-2">
					<h3 class="flex items-center gap-2 text-sm font-semibold opacity-60">
						<Trophy size={14} /> Completed
					</h3>
					<div class="divide-y divide-base-200 rounded-xl bg-base-100/50">
						{#each completedActions as action (action.id)}
							<div class="flex items-center gap-3 px-3 py-2">
								<div class="text-success">
									<action.icon size={16} />
								</div>
								<span class="flex-1 text-xs">{action.title}</span>
								{#if action.savedAmount}
									<span class="text-xs font-semibold text-success">+€{action.savedAmount}/mo</span>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Empty state -->
			{#if activeActions.length === 0}
				<div class="rounded-2xl bg-base-100/50 p-6 text-center">
					<p class="mb-3 text-sm opacity-70">No active actions yet</p>
					<p class="text-xs opacity-50">Start a new action from the discover section!</p>
				</div>
			{/if}
		</div>

		<!-- Vertical Gutter -->
		<div class="hidden lg:block"></div>

		<!-- RIGHT COLUMN: Discover -->
		<div class="space-y-4">
			<!-- Header row with title + category tabs -->
			<div class="flex items-center justify-between gap-2">
				<h3 class="text-sm font-semibold opacity-60">Top picks</h3>
				<div class="flex flex-wrap justify-end gap-1.5">
					{#each outcomeCategories as cat}
						<button
							class="btn rounded-full transition-all btn-xs {selectedCategory === cat.id
								? cat.id === 'all'
									? 'btn-neutral'
									: cat.color + ' border-0 text-white'
								: 'bg-base-100 btn-ghost'}"
							onclick={() => {
								selectedCategory = cat.id;
								showAllCards = false;
							}}
						>
							{cat.label}
						</button>
					{/each}
				</div>
			</div>

			<!-- Cards Grid -->
			<div>
				<div class="grid grid-cols-2 gap-3">
					<!-- Hero Card (first in grid when showing all) -->
					{#if selectedCategory === 'all'}
						{@const cat = getCategoryColor(heroCard.outcome)}
						<div
							class="group relative rounded-2xl bg-base-100 p-4 shadow-lg transition-all hover:shadow-xl"
						>
							<div class="absolute top-0 left-0 h-1 w-full rounded-t-2xl {cat.color}"></div>
							<span
								class="absolute top-2 right-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700"
								>✨ Recommended</span
							>

							<div class="{cat.color} mb-2 inline-flex rounded-lg p-2 text-white">
								<heroCard.icon size={18} />
							</div>

							<h3 class="text-sm font-bold">{heroCard.title}</h3>
							<p class="mt-1 line-clamp-2 text-xs opacity-60">{heroCard.description}</p>

							<div class="mt-3 flex items-center justify-between">
								<span class="text-xs opacity-40">Coming soon</span>
								<button class="btn gap-1 rounded-full btn-ghost btn-xs">
									<ThumbsUp size={10} />
									{heroCard.votes || 0}
								</button>
							</div>
						</div>
					{/if}

					{#each visibleCards() as card (card.id)}
						{@const cat = getCategoryColor(card.outcome)}
						{@const hasVoted = votedCards.has(card.id)}
						<div
							class="group relative rounded-2xl bg-base-100 p-4 shadow-lg transition-all hover:shadow-xl"
						>
							<div class="absolute top-0 left-0 h-1 w-full rounded-t-2xl {cat.color}"></div>

							{#if card.isSocial}
								<div class="absolute top-3 right-3 flex -space-x-1.5">
									<div
										class="h-4 w-4 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 ring-2 ring-base-100"
									></div>
									<div
										class="h-4 w-4 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 ring-2 ring-base-100"
									></div>
									<div
										class="flex h-4 w-4 items-center justify-center rounded-full bg-base-200 text-[8px] ring-2 ring-base-100"
									>
										+3
									</div>
								</div>
							{/if}

							<div class="{cat.color} mb-2 inline-flex rounded-lg p-2 text-white">
								<card.icon size={18} />
							</div>

							<h3 class="text-sm font-bold">{card.title}</h3>
							<p class="mt-1 line-clamp-2 text-xs opacity-60">{card.description}</p>

							<div class="mt-3 flex items-center justify-between">
								<span class="text-xs opacity-40">Coming soon</span>
								<button
									class="btn gap-1 rounded-full btn-xs {hasVoted ? 'btn-success' : 'btn-ghost'}"
									onclick={() => handleVote(card.id)}
									disabled={hasVoted}
								>
									<ThumbsUp size={10} class={hasVoted ? 'fill-current' : ''} />
									{(card.votes || 0) + (hasVoted ? 1 : 0)}
								</button>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- View All -->
			{#if selectedCategory === 'all' && remainingCount() > 0}
				<div class="text-center">
					<button
						class="btn gap-1 rounded-full btn-ghost btn-sm"
						onclick={() => (showAllCards = !showAllCards)}
					>
						{#if showAllCards}
							Show less <ChevronUp size={16} />
						{:else}
							View all {remainingCount()} more <ChevronDown size={16} />
						{/if}
					</button>
				</div>
			{/if}

			<div class="rounded-xl bg-base-200/50 p-3 text-center">
				<p class="text-xs opacity-60">Vote to help us decide what to build next!</p>
			</div>
		</div>
	</div>
</div>
