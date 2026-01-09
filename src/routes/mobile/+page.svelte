<script lang="ts">
	import { page } from '$app/stores';
	import Card from '$lib/components/mobile/Card.svelte';
	import TransactionItem from '$lib/components/mobile/TransactionItem.svelte';
	import MoneyChart from '$lib/components/mobile/MoneyChart.svelte';
	import InsightsCarousel from '$lib/components/mobile/InsightsCarousel.svelte';
	import AccountCard from '$lib/components/mobile/AccountCard.svelte';
	import Amount from '$lib/components/mobile/Amount.svelte';
	import {
		QrCode,
		Settings2,
		MoreVertical,
		CreditCard,
		RefreshCw,
		Smartphone,
		ArrowRight,
		ChevronRight,
		ArrowUp,
		ArrowDown,
		Users,
		User,
		PiggyBank,
		TrendingUp
	} from 'lucide-svelte';
	import MobileHeader from '$lib/components/mobile/MobileHeader.svelte';
	import WidgetHeader from '$lib/components/mobile/WidgetHeader.svelte';
	import WidgetAction from '$lib/components/mobile/WidgetAction.svelte';
	import MobileLink from '$lib/components/mobile/MobileLink.svelte';

	// Data from server
	let { data } = $props();

	const widgetStyleParam = $derived($page.url.searchParams.get('widgetStyle'));
	let widgetStyle = $state<'default' | 'list'>('default');

	$effect(() => {
		if (widgetStyleParam) {
			widgetStyle = widgetStyleParam as 'default' | 'list';
			localStorage.setItem('widgetStyle', widgetStyle);
		} else {
			const stored = localStorage.getItem('widgetStyle') as 'default' | 'list';
			if (stored) {
				widgetStyle = stored;
			}
		}
	});

	// Placeholder accounts for the list view
	const accounts = [
		{ id: 1, name: 'Gezamenlijke rekening', balance: 1200.0, type: 'checking' as const },
		{ id: 2, name: 'Spaarrekening', balance: 5432.1, type: 'savings' as const },
		{ id: 3, name: 'Beleggingsrekening', balance: 12847.53, type: 'investment' as const }
	];
	// Random emoticon for header
	const emoticons = ['👋', '😎', '😀', '😊', '✌️', '✨'];
	let emoticon = $state('👋');

	$effect(() => {
		emoticon = emoticons[Math.floor(Math.random() * emoticons.length)];
	});
</script>

<svelte:head>
	<title>Reflect Mobile</title>
</svelte:head>

<!-- Header -->
<MobileHeader class="flex items-center justify-between px-4 pb-3">
	<button
		class="dark:hover:bg-gray-1200 flex h-10 w-10 items-center justify-center rounded-lg hover:bg-sand-100"
	>
		<QrCode class="h-6 w-6 text-black dark:text-white" strokeWidth={1.5} />
	</button>
	<h1 class="font-heading text-xl font-bold text-black dark:text-white">
		Hi, {data.userName}
		{emoticon}
	</h1>
	<button
		class="dark:hover:bg-gray-1200 flex h-10 w-10 items-center justify-center rounded-lg hover:bg-sand-100"
	>
		<Settings2 class="h-6 w-6 text-black dark:text-white" strokeWidth={1.5} />
	</button>
</MobileHeader>

<div class="space-y-6 px-4 pt-0 pb-4 font-nn">
	<!-- Betaalsaldo -->
	<!-- Betaalsaldo -->
	<!-- Betaalsaldo -->
	<section>
		<WidgetHeader title="Vermogen" class="mb-3" />
		{#if widgetStyle === 'default'}
			<Card padding="p-0">
				<div class="p-4">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-3">
							<div class="relative">
								<CreditCard class="h-8 w-8 text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
								<div
									class="absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center rounded-full bg-mediumOrange-500 text-[10px] font-bold text-white ring-2 ring-white"
								>
									N
								</div>
							</div>
							<div>
								<div class="font-bold dark:text-white">P. de Vries</div>
								<div class="text-sm font-normal text-gray-600 dark:text-gray-400">
									NL31 NNBA 1000 0006 45
								</div>
							</div>
						</div>
						<div class="text-lg font-bold dark:text-white">€ 50,00</div>
					</div>
				</div>
				<div class="px-4 py-3">
					<div class="flex gap-2">
						<button
							class="dark:bg-gray-1100 flex h-9 flex-1 items-center justify-center gap-2 rounded-full bg-sand-100 px-4 transition-all active:scale-95 active:bg-sand-200 dark:active:bg-gray-900"
						>
							<RefreshCw class="h-4 w-4 text-mediumOrange-600" strokeWidth={2} />
							<span class="font-heading text-sm font-semibold text-gray-700 dark:text-gray-200"
								>Overmaken</span
							>
						</button>
						<button
							class="dark:bg-gray-1100 flex h-9 flex-1 items-center justify-center gap-2 rounded-full bg-sand-100 px-4 transition-all active:scale-95 active:bg-sand-200 dark:active:bg-gray-900"
						>
							<Smartphone class="h-4 w-4 text-mediumOrange-600" strokeWidth={2} />
							<span class="font-heading text-sm font-semibold text-gray-700 dark:text-gray-200"
								>Verzoek</span
							>
						</button>
					</div>
				</div>
			</Card>
		{:else}
			<Card padding="p-0">
				<!-- Accounts List -->
				<div class="flex flex-col pt-2">
					{#each accounts as account, i}
						<MobileLink
							href="/mobile/transactions?accountIndex={i}"
							class="flex items-center justify-between px-4 py-3 transition-all active:scale-[0.99] active:bg-gray-50 dark:active:bg-gray-800"
						>
							<div class="flex items-center gap-3">
								<div class="relative">
									{#if account.type === 'savings'}
										<PiggyBank class="h-5 w-5 text-gray-800 dark:text-gray-200" strokeWidth={1.5} />
									{:else if account.type === 'investment'}
										<TrendingUp
											class="h-5 w-5 text-gray-800 dark:text-gray-200"
											strokeWidth={1.5}
										/>
									{:else}
										<CreditCard
											class="h-5 w-5 text-gray-800 dark:text-gray-200"
											strokeWidth={1.5}
										/>
									{/if}
								</div>
								<div>
									<div class="text-sm font-normal text-gray-600 dark:text-gray-400">
										{account.name}
									</div>
								</div>
							</div>
							<div class="flex items-center gap-1">
								<Amount
									amount={account.balance}
									size="sm"
									class="font-heading font-semibold !text-gray-900 dark:!text-gray-200"
									showSign={false}
									showSymbol={true}
								/>
								<ChevronRight class="h-3.5 w-3.5 text-gray-400" strokeWidth={2} />
							</div>
						</MobileLink>
					{/each}
				</div>

				<!-- Action Buttons Footer -->
				<div class="p-4 pt-2">
					<div class="flex gap-2">
						<button
							class="dark:bg-gray-1100 flex h-9 flex-1 items-center justify-center gap-2 rounded-full bg-sand-100 px-4 transition-all active:scale-95 active:bg-sand-200 dark:active:bg-gray-900"
						>
							<ArrowUp class="h-4 w-4 text-mediumOrange-600" strokeWidth={2.5} />
							<span class="font-heading text-sm font-semibold text-gray-700 dark:text-gray-200"
								>Betalen</span
							>
						</button>
						<button
							class="dark:bg-gray-1100 flex h-9 flex-1 items-center justify-center gap-2 rounded-full bg-sand-100 px-4 transition-all active:scale-95 active:bg-sand-200 dark:active:bg-gray-900"
						>
							<ArrowDown class="h-4 w-4 text-mediumOrange-600" strokeWidth={2.5} />
							<span class="font-heading text-sm font-semibold text-gray-700 dark:text-gray-200"
								>Verzoek</span
							>
						</button>
						<button
							class="dark:bg-gray-1100 flex h-9 w-9 items-center justify-center rounded-full bg-sand-100 transition-all active:scale-95 active:bg-sand-200 dark:active:bg-gray-900"
						>
							<MoreVertical class="h-4 w-4 text-mediumOrange-600" strokeWidth={2.5} />
						</button>
					</div>
				</div>
			</Card>
		{/if}
	</section>

	<!-- Inzichten Carousel -->
	<InsightsCarousel />

	<!-- Transacties -->
	<section>
		<WidgetHeader title="Betalingen" class="mb-3">
			<WidgetAction label="Bekijk alles" href="/mobile/transactions" />
		</WidgetHeader>

		<Card padding="p-0">
			<div class="dark:divide-gray-1100 divide-y divide-gray-100">
				{#each data.transactions as t}
					<TransactionItem
						merchant={t.merchant}
						subtitle={t.subline}
						amount={t.isDebit ? -t.amount : t.amount}
						isDebit={t.isDebit}
						categoryIcon={t.categoryIcon}
						compact={true}
						showSubtitle={false}
						showChevron={true}
						class="dark:active:bg-gray-1100 px-4 py-3 active:bg-gray-50"
					/>
				{:else}
					<div class="p-4 text-center text-sm text-gray-600 dark:text-gray-400">
						Geen transacties
					</div>
				{/each}
			</div>
		</Card>
	</section>
</div>
