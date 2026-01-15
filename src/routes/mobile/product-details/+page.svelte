<script lang="ts">
	import Card from '$lib/components/mobile/Card.svelte';
	import TransactionItem from '$lib/components/mobile/TransactionItem.svelte';
	import HorizontalCarousel from '$lib/components/mobile/HorizontalCarousel.svelte';
	import AccountCard from '$lib/components/mobile/AccountCard.svelte';
	import MobileLink from '$lib/components/mobile/MobileLink.svelte';
	import EmptyState from '$lib/components/mobile/EmptyState.svelte';
	import {
		ArrowLeft,
		Search,
		ArrowRight,
		PiggyBank,
		CreditCard,
		ArrowUp,
		ArrowDown,
		Menu,
		Plus
	} from 'lucide-svelte';
	import { mobileScrollY } from '$lib/stores/mobileScroll';
	import { mobileThemeName } from '$lib/stores/mobileTheme';
	import WidgetHeader from '$lib/components/mobile/WidgetHeader.svelte';
	import WidgetAction from '$lib/components/mobile/WidgetAction.svelte';
	import Amount from '$lib/components/mobile/Amount.svelte';
	import { page } from '$app/stores';
	import { formatRecurringSubtitle } from '$lib/utils/dateFormatting';
	import { Bike, GraduationCap, ArrowUpRight, ArrowDownLeft } from 'lucide-svelte';
	import SavingsGoalItem from '$lib/components/mobile/SavingsGoalItem.svelte';
	import InterestWidget from '$lib/components/mobile/InterestWidget.svelte';
	import LayoutA from '$lib/components/mobile/transactions/LayoutA.svelte';
	import LayoutB from '$lib/components/mobile/transactions/LayoutB.svelte';
	import LayoutC from '$lib/components/mobile/transactions/LayoutC.svelte';

	// Data from server
	let { data } = $props();

	// For header shadow on scroll
	const headerShadowOpacity = $derived(Math.min($mobileScrollY / 50, 1) * 0.1);

	// Scroll progress for glassy transition (0 = at top, 1 = scrolled down)
	const scrollProgress = $derived(Math.min($mobileScrollY / 60, 1));

	// Interpolate color from sand-100 to sand-50 on scroll
	const r = $derived(Math.round(243 + (250 - 243) * scrollProgress));
	const g = $derived(Math.round(239 + (249 - 239) * scrollProgress));
	const b = $derived(Math.round(237 + (248 - 237) * scrollProgress));
	const blurAmount = $derived(scrollProgress * 12);
	const bgOpacity = $derived(1 - scrollProgress * 0.15);

	// Simple theme check
	const isOriginal = $derived($mobileThemeName === 'nn-original');
	// Theme-aware dividers (original shows no dividers, improved shows dividers)
	const dividerClasses = $derived(isOriginal ? '' : 'divide-y divide-gray-100 dark:divide-gray-800');

	import { productsStore, type Product } from '$lib/mock/products';

	// Reactive accounts list (derived from productsStore)
	const accounts = $derived($productsStore.filter((p) => p.enabled !== false));

	let carouselIndex = $state(0);
	const currentLayout = $derived($page.url.searchParams.get('layout') || 'default');

	// Initialize carousel index from URL param or default to 0
	$effect(() => {
		const accountIndexParam = $page.url.searchParams.get('accountIndex');
		if (accountIndexParam) {
			const index = parseInt(accountIndexParam, 10);
			if (!isNaN(index) && index >= 0 && index < accounts.length) {
				carouselIndex = index;
			}
		}
	});

	const backLink = '/mobile';

	// Loading state for skeleton
	let isLoading = $state(true);
	let lastLoaded = $state<Record<number, number>>({});

	$effect(() => {
		const lastTime = lastLoaded[carouselIndex];
		const now = Date.now();

		if (lastTime && now - lastTime < 60000) {
			isLoading = false;
		} else {
			isLoading = true;
			const delay = Math.floor(Math.random() * 700) + 300;
			setTimeout(() => {
				isLoading = false;
				lastLoaded[carouselIndex] = Date.now();
			}, delay);
		}
	});
</script>

<svelte:head>
	<title>Rekeningen - Reflect Mobile</title>
</svelte:head>

<!-- Main Layout Grid -->
<div class="dashboard-layout transactions-layout px-0 pt-0 pb-4 font-nn">
	{#if currentLayout === 'A'}
		<LayoutA {data} />
	{:else if currentLayout === 'B'}
		<LayoutB {data} />
	{:else if currentLayout === 'C'}
		<LayoutC {data} />
	{:else}
		<!-- Header -->
		<header
			class="mobile-header-component flex items-center justify-between transition-[backdrop-filter] duration-200 landscape:col-span-full"
			style="
				background-color: rgba({r}, {g}, {b}, {bgOpacity});
				backdrop-filter: blur({blurAmount}px);
				-webkit-backdrop-filter: blur({blurAmount}px);
				box-shadow: 0 12px 32px -4px rgba(0, 0, 0, {headerShadowOpacity});
				transform: translateZ(0);
			"
		>
			<div class="header-inner flex w-full items-center justify-between px-4 pt-[54px] pb-2 landscape:relative landscape:px-0 landscape:pt-0">
				<MobileLink
					href={backLink}
					class="header-btn-left rounded-full p-2 hover:bg-black/5 active:bg-black/10"
				>
					<ArrowLeft class="h-6 w-6 text-black" />
				</MobileLink>
				<h1 class="header-title font-heading text-[20px] font-bold text-black">Rekeningen</h1>
				<button class="header-btn-right rounded-full p-2 hover:bg-black/5 active:bg-black/10">
					<Search class="h-6 w-6 text-black" />
				</button>
			</div>
		</header>

		<div class="dashboard-sidebar landscape:mt-0 landscape:px-0">
			<!-- Account Cards Section (Portrait Only) -->
			{#if isOriginal}
				<!-- Original Theme: Carousel of cards with buttons inside (matches homepage betaalsaldo) -->
				<div
					class="w-full bg-sand-100 pt-0 pb-4 transition-[border-radius] duration-300 landscape:hidden {carouselIndex >=
					accounts.length - 1
						? 'rounded-br-3xl'
						: 'rounded-br-none'} {carouselIndex === 0 ? 'rounded-bl-3xl' : 'rounded-bl-none'}"
				>
					<HorizontalCarousel
						bind:currentIndex={carouselIndex}
						showIndicators={false}
						itemCount={accounts.length}
						cardWidth={310}
						gap={12}
					>
						{#each accounts as account (account.id)}
							<AccountCard name={account.name} balance={account.balance} type={account.type} variant="original" />
						{/each}
					</HorizontalCarousel>
				</div>
			{:else}
				<!-- Improved Theme: Carousel of account cards with huge amount and buttons outside -->
				<div
					class="w-full bg-sand-100 pt-0 pb-0 transition-[border-radius] duration-300 landscape:hidden {carouselIndex >=
					accounts.length - 1
						? 'rounded-br-3xl'
						: 'rounded-br-none'} {carouselIndex === 0 ? 'rounded-bl-3xl' : 'rounded-bl-none'}"
				>
					<HorizontalCarousel
						bind:currentIndex={carouselIndex}
						showIndicators={false}
						itemCount={accounts.length}
						cardWidth={310}
						gap={12}
					>
						{#each accounts as account (account.id)}
							<AccountCard name={account.name} balance={account.balance} type={account.type} variant="redesign-huge" />
						{/each}
					</HorizontalCarousel>
				</div>
				
				<!-- Action buttons outside the card for redesign -->
				<div class="flex gap-2 px-4 pt-3 pb-5">
					<button
						class="flex h-9 flex-1 items-center justify-center gap-2 rounded-full bg-mediumOrange-600 px-4 text-white shadow-sm transition-all active:scale-95"
						aria-label="Primary action"
					>
						<ArrowUp class="h-4 w-4 text-white" strokeWidth={2.2} />
						<span class="font-heading text-sm font-semibold">{accounts[carouselIndex]?.type === 'savings' ? 'Opnemen' : 'Betalen'}</span>
					</button>
					<button
						class="flex h-9 flex-1 items-center justify-center gap-2 rounded-full bg-white px-4 shadow-sm transition-all active:scale-95"
						aria-label="Secondary action"
					>
						<ArrowDown class="h-4 w-4 text-mediumOrange-600" strokeWidth={2.2} />
						<span class="font-heading text-sm font-semibold text-gray-700">{accounts[carouselIndex]?.type === 'savings' ? 'Storten' : 'Verzoek'}</span>
					</button>
					<button
						class="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-white px-3 shadow-sm transition-all active:scale-95"
						aria-label="More actions"
					>
						<Menu class="h-4 w-4 text-gray-500" strokeWidth={2} />
						<span class="font-heading text-sm font-semibold text-gray-500">Meer</span>
					</button>
				</div>
			{/if}

			<!-- Interactive Vermogen Card (Landscape Only) -->
			<div class="sidebar-account-list hidden landscape:block">
				<WidgetHeader title="Vermogen" class="mb-3" />
				<Card padding="p-0">
					<div class="flex flex-col">
						{#each accounts as account, i}
							<button
								onclick={() => (carouselIndex = i)}
								class="flex items-center justify-between px-4 py-3 transition-all active:scale-[0.99] {carouselIndex === i ? 'active-account-row bg-black/5 dark:bg-white/10' : ''}"
							>
								<div class="flex min-w-0 flex-1 items-center gap-3">
									<div class="relative shrink-0">
										{#if account.type === 'savings'}
											<PiggyBank class="h-5 w-5 text-gray-800 dark:text-gray-200" strokeWidth={1.5} />
										{:else}
											<CreditCard class="h-5 w-5 text-gray-800 dark:text-gray-200" strokeWidth={1.5} />
										{/if}
									</div>
									<div class="flex min-w-0 flex-1 flex-col overflow-hidden text-left">
										<div class="truncate text-sm font-normal text-gray-600 dark:text-gray-400">
											{account.name}
										</div>
										<div class="account-amount-landscape">
											<Amount
												amount={account.balance}
												size="sm"
												class="font-heading font-semibold !text-gray-900 dark:!text-gray-200"
												showSign={false}
												showSymbol={true}
											/>
										</div>
									</div>
								</div>
							</button>
						{/each}
					</div>
					<div class="p-4 pt-2">
						<div class="flex gap-2">
							<button class="dark:bg-gray-1100 flex h-9 flex-1 items-center justify-center gap-2 rounded-full bg-sand-100 px-3 transition-all active:scale-95 active:bg-sand-200 dark:active:bg-gray-900">
								<ArrowUp class="h-4 w-4 text-mediumOrange-600" strokeWidth={2.5} />
								<span class="font-heading text-xs font-semibold text-gray-700 dark:text-gray-200">{accounts[carouselIndex]?.type === 'savings' ? 'Opnemen' : 'Betalen'}</span>
							</button>
							<button class="dark:bg-gray-1100 flex h-9 flex-1 items-center justify-center gap-2 rounded-full bg-sand-100 px-3 transition-all active:scale-95 active:bg-sand-200 dark:active:bg-gray-900">
								<ArrowDown class="h-4 w-4 text-mediumOrange-600" strokeWidth={2.5} />
								<span class="font-heading text-xs font-semibold text-gray-700 dark:text-gray-200">{accounts[carouselIndex]?.type === 'savings' ? 'Storten' : 'Verzoek'}</span>
							</button>
							<button class="dark:bg-gray-1100 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-sand-100 transition-all active:scale-95 active:bg-sand-200 dark:active:bg-gray-900">
								<Menu class="h-4 w-4 text-mediumOrange-600" strokeWidth={2.5} />
							</button>
						</div>
					</div>
				</Card>
			</div>
		</div>

		<!-- Content: Transactions List -->
		<div class="dashboard-main bg-sand-50 px-4 pt-4 pb-24 landscape:bg-transparent landscape:px-0 landscape:pt-0 landscape:pb-8">
			{#if accounts[carouselIndex]?.name === 'Internetsparen'}
				{#if isLoading}
					<div class="animate-pulse">
						<WidgetHeader title="Betalingen" class="mb-3">
							<div class="h-4 w-20 rounded bg-gray-200 dark:bg-gray-800"></div>
						</WidgetHeader>
						<Card padding="p-0" class="mb-6">
							<div class={dividerClasses}>
								<div class="flex items-center gap-3 px-4 py-3">
									<div class="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-800"></div>
									<div class="flex-1 space-y-2">
										<div class="h-4 w-32 rounded bg-gray-200 dark:bg-gray-800"></div>
										<div class="h-3 w-24 rounded bg-gray-200 dark:bg-gray-800"></div>
									</div>
									<div class="h-4 w-16 rounded bg-gray-200 dark:bg-gray-800"></div>
								</div>
							</div>
						</Card>
					</div>
				{:else}
					<WidgetHeader title="Betalingen" class="mb-3">
						<WidgetAction label="Bekijk alles" />
					</WidgetHeader>

					<Card padding="p-0" class="mb-6">
						<div class={dividerClasses}>
							<TransactionItem
								merchant="Spaaropdracht"
								subtitle="Automatische overboeking"
								amount={150.0}
								size="sm"
								isDebit={false}
								showSubtitle={true}
								categoryIcon="savings"
								class="px-4 py-3"
								designVariant={isOriginal ? 'original' : 'redesign'}
								date={new Date().toISOString()}
								description="Automatische overboeking 08:30"
							/>
							<TransactionItem
								merchant="Vakantie potje"
								subtitle="Eenmalige inleg"
								amount={50.0}
								size="sm"
								isDebit={false}
								showSubtitle={true}
								categoryIcon="holiday"
								class="px-4 py-3"
								designVariant={isOriginal ? 'original' : 'redesign'}
								date={new Date().toISOString()}
								description="Eenmalige inleg 09:15"
							/>
						</div>
					</Card>

					<InterestWidget interestRate={2.1} interestAmount={14.5} bonusAmount={5.25} />

					<WidgetHeader title="Spaardoelen" class="mb-3" />

					<Card padding="p-0" class="mb-6">
						<div class={dividerClasses}>
							<SavingsGoalItem title="Nieuwe fiets" saved={1500} target={2000} icon={Bike} color="bg-blue-800" />
							<SavingsGoalItem title="Studie Jip" saved={5500} target={12000} icon={GraduationCap} color="bg-blue-800" />
						</div>
					</Card>

					<button class="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-transparent py-4 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-50 active:scale-[0.99] dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800">
						<Plus class="h-5 w-5" />
						Spaardoel toevoegen
					</button>
				{/if}
			{:else if isLoading}
				<div class="animate-pulse">
					<WidgetHeader title="Verwacht" class="mb-4">
						<div class="h-4 w-20 rounded bg-gray-200 dark:bg-gray-800"></div>
					</WidgetHeader>
					<Card padding="p-0" class="mb-6">
						<div class={dividerClasses}>
							{#each Array(2) as _}
								<div class="p-4">
									<div class="flex items-center justify-between">
										<div class="flex items-center gap-3">
											<div class="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-800"></div>
											<div class="space-y-2">
												<div class="h-4 w-32 rounded bg-gray-200 dark:bg-gray-800"></div>
												<div class="h-3 w-20 rounded bg-gray-200 dark:bg-gray-800"></div>
											</div>
										</div>
										<div class="h-4 w-16 rounded bg-gray-200 dark:bg-gray-800"></div>
									</div>
								</div>
							{/each}
						</div>
					</Card>
				</div>
			{:else}
				<WidgetHeader title="Verwacht" class="mb-4">
					<WidgetAction
						label="Kijk vooruit"
						href="/mobile/kijk-vooruit?from=/mobile/product-details?accountIndex={carouselIndex}"
					/>
				</WidgetHeader>

				<div class="mb-6">
					{#if data.upcomingTransactions && data.upcomingTransactions.length > 0}
						<Card padding="p-0">
							<div class={dividerClasses}>
								{#each data.upcomingTransactions as t}
									<div class="block bg-white p-4 first:rounded-t-2xl last:rounded-b-2xl active:bg-gray-50">
										<TransactionItem
											merchant={t.merchant}
											subtitle={formatRecurringSubtitle(t.interval, t.daysUntil)}
											amount={t.isDebit ? -t.amount : t.amount}
											isDebit={t.isDebit}
											categoryIcon={t.categoryIcon}
											size="md"
											fontHeading={true}
											useLogo={true}
											designVariant={isOriginal ? 'original' : 'redesign'}
											date={t.nextDate}
										/>
									</div>
								{/each}
							</div>
						</Card>
					{/if}
				</div>

				<div class="space-y-6">
					{#each data.groupedTransactions as group}
						<section>
							<div class="mb-3 flex items-baseline gap-3 px-1">
								<h2 class="font-heading text-base font-bold text-gray-900">{group.dateLabel}</h2>
								{#if group.incomingCount > 1}
									<div class="rounded-md bg-green-50 px-2 py-0.5 text-sm font-bold text-green-700">
										{group.formattedIncoming}
									</div>
								{/if}
								{#if group.outgoingCount > 1}
									<div class="rounded-md bg-gray-200/60 px-2 py-0.5 text-sm font-bold text-gray-700">
										{group.formattedOutgoing}
									</div>
								{/if}
							</div>
							<Card padding="p-0">
								<div class={dividerClasses}>
									{#each group.transactions as t}
										<MobileLink
											href={`/mobile/transactions/${t.id}?from=${encodeURIComponent($page.url.pathname + $page.url.search)}`}
											class="block bg-white p-4 first:rounded-t-2xl last:rounded-b-2xl active:bg-gray-50"
										>
											<TransactionItem
												merchant={t.merchant}
												subtitle={t.category}
												amount={t.isDebit ? -t.amount : t.amount}
												isDebit={t.isDebit}
												categoryIcon={t.categoryIcon}
												size="md"
												showChevron={true}
												designVariant={isOriginal ? 'original' : 'redesign'}
												date={t.date}
												description={t.description ?? t.note ?? t.category}
											/>
										</MobileLink>
									{/each}
								</div>
							</Card>
						</section>
					{:else}
						<div class="mt-8 text-center text-sm text-gray-600">Geen transacties gevonden</div>
					{/each}
				</div>
			{/if}
			<div class="h-8"></div>
		</div>
	{/if}
</div>
