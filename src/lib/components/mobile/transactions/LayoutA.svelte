<script lang="ts">
	import Card from '$lib/components/mobile/Card.svelte';
	import TransactionItem from '$lib/components/mobile/TransactionItem.svelte';
	import HorizontalCarousel from '$lib/components/mobile/HorizontalCarousel.svelte';
	import AccountCard from '$lib/components/mobile/AccountCard.svelte';
	import MobileLink from '$lib/components/mobile/MobileLink.svelte';
	import BottomSheet from '$lib/components/mobile/BottomSheet.svelte';
	import MerchantLogo from '$lib/components/MerchantLogo.svelte';
	import {
		ArrowLeft,
		Search,
		PiggyBank,
		CreditCard,
		ArrowUp,
		ArrowDown,
		Menu,
		Calendar,
		Repeat,
		Tag,
		ChevronRight,
		Pause,
		Trash2
	} from 'lucide-svelte';
	import { mobileScrollY } from '$lib/stores/mobileScroll';
	import { mobileThemeName } from '$lib/stores/mobileTheme';
	import { mobileNavDirection } from '$lib/stores/mobileNavDirection';
	import { scrollPositions, saveScrollPosition } from '$lib/stores/scrollPositions';
	import WidgetHeader from '$lib/components/mobile/WidgetHeader.svelte';
	import WidgetAction from '$lib/components/mobile/WidgetAction.svelte';
	import Amount from '$lib/components/mobile/Amount.svelte';
	import { page } from '$app/stores';
	import { formatRecurringSubtitle } from '$lib/utils/dateFormatting';
	import { onMount } from 'svelte';
	import { 
		SavingsContent, 
		TransactionsList,
		ActionButtonGroup
	} from '$lib/components/mobile/organisms';

	interface Props {
		data: any;
	}

	let { data }: Props = $props();

	// Theme check
	const isRebrand = $derived($mobileThemeName === 'rebrand');
	const isImproved = $derived($mobileThemeName === 'improved');

	// For header shadow on scroll
	const headerShadowOpacity = $derived(Math.min($mobileScrollY / 50, 1) * 0.1);

	// Scroll progress for glassy transition (0 = solid, 1 = frosted glass)
	const scrollProgress = $derived(Math.min($mobileScrollY / 60, 1));

	// Original theme uses sand-50 header, rebrand uses transparent
	const isOriginal = $derived($mobileThemeName === 'nn-original');
	const blurAmount = 0;
	const r = $derived(isOriginal ? 250 : 0);
	const g = $derived(isOriginal ? 249 : 0);
	const b = $derived(isOriginal ? 248 : 0);
	const bgOpacity = $derived(isOriginal ? 1 : 0);

	import { productsStore, type Product } from '$lib/mock/products';

	// Reactive accounts list from store
	const accounts = $derived($productsStore.filter((p) => p.enabled !== false));

	let carouselIndex = $state(0);

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

	// Build back link with layout param
	const currentLayout = $derived($page.url.searchParams.get('layout') || 'default');
	const backLink = $derived(currentLayout !== 'default' ? `/mobile?layout=${currentLayout}` : '/mobile');

	// Loading state for skeleton - skip on back navigation
	let isLoading = $state(false);
	let lastLoaded = $state<Record<number, number>>({});
	let hasInitialized = $state(false);

	// Save scroll position before navigation
	$effect(() => {
		const currentPath = $page.url.pathname + $page.url.search;
		const scrollY = $mobileScrollY;
		if (scrollY > 0) {
			saveScrollPosition(currentPath, scrollY);
		}
	});

	// Restore scroll position on back navigation
	onMount(() => {
		const navDir = $mobileNavDirection;
		const currentPath = $page.url.pathname + $page.url.search;
		
		if (navDir === 'back') {
			// Skip loading skeleton on back navigation
			isLoading = false;
			hasInitialized = true;
			
			// Restore scroll position
			const savedPos = $scrollPositions[currentPath];
			if (savedPos && savedPos > 0) {
				requestAnimationFrame(() => {
					try {
						const appContent = document.querySelector('.mobile-content') as HTMLElement | null;
						if (appContent) {
							console.debug('restoring scroll on .mobile-content to', savedPos);
							appContent.scrollTop = savedPos;
						} else {
							console.debug('no .mobile-content, falling back to window.scrollTo', savedPos);
							window.scrollTo(0, savedPos);
						}
					} catch (err) {
						console.error('error restoring scroll position', err);
					}
				});
			}
		}
	});

	// Expected transaction bottom sheet state
	let expectedSheetOpen = $state(false);
	let selectedExpected = $state<any>(null);

	function openExpectedSheet(t: any) {
		selectedExpected = t;
		expectedSheetOpen = true;
	}

	function closeExpectedSheet() {
		expectedSheetOpen = false;
		selectedExpected = null;
	}

	// Format interval for display
	function formatInterval(interval: string): string {
		const labels: Record<string, string> = {
			monthly: 'Maandelijks',
			weekly: 'Wekelijks',
			yearly: 'Jaarlijks',
			quarterly: 'Per kwartaal',
			'4-weekly': '4-wekelijks'
		};
		return labels[interval] || interval;
	}

	// Format date for display
	function formatNextDate(dateStr: string): string {
		const date = new Date(dateStr);
		const days = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
		const months = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
		return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
	}

	$effect(() => {
		// Skip if already initialized (e.g., from back navigation)
		if (hasInitialized && $mobileNavDirection === 'back') {
			isLoading = false;
			return;
		}

		// Check if we loaded this index recently (last 60s)
		const lastTime = lastLoaded[carouselIndex];
		const now = Date.now();

		if (lastTime && now - lastTime < 60000) {
			// Recently loaded, show immediately
			isLoading = false;
		} else if (!hasInitialized || $mobileNavDirection === 'forward') {
			// Only show skeleton on fresh load or forward navigation
			isLoading = true;
			// Random delay between 300ms and 1000ms
			const delay = Math.floor(Math.random() * 700) + 300;
			setTimeout(() => {
				isLoading = false;
				lastLoaded[carouselIndex] = Date.now();
				hasInitialized = true;
			}, delay);
		}
	});
</script>

{#if isImproved}
	<!-- Redesign: Colored header wrapping nav + carousel + buttons -->
	<div class="product-colored-header rounded-b-3xl" style="background-color: rgb(200, 225, 235);">
		<header class="sticky top-0 z-20 w-full" style="background-color: rgb(200, 225, 235);">
			<div class="flex w-full items-center justify-between px-4 pt-[54px] pb-2">
				<MobileLink
					href={backLink}
					class="rounded-full p-2 hover:bg-black/5 active:bg-black/10"
				>
					<ArrowLeft class="h-6 w-6" strokeWidth={1.5} />
				</MobileLink>
				<h1 class="font-heading text-[20px] font-bold">Rekeningen</h1>
				<button class="rounded-full p-2 hover:bg-black/5 active:bg-black/10">
					<Search class="h-6 w-6" strokeWidth={1.5} />
				</button>
			</div>
		</header>
		
		<!-- Carousel inside colored header -->
		<div class="w-full pt-0 pb-0 landscape:hidden">
			<HorizontalCarousel
				bind:currentIndex={carouselIndex}
				showIndicators={false}
				itemCount={accounts.length}
				cardWidth={310}
				gap={12}
			>
				{#each accounts as account, i (account.id)}
					<AccountCard name={account.name} balance={account.balance} type={account.type} isJoint={i === 0} variant="redesign-huge" />
				{/each}
			</HorizontalCarousel>
		</div>
		
		<!-- Action buttons inside colored area -->
		{#if accounts[carouselIndex]}
			{@const pdpActions = [
				{ label: accounts[carouselIndex]?.type === 'savings' ? 'Opnemen' : 'Betalen', icon: ArrowUp },
				{ label: accounts[carouselIndex]?.type === 'savings' ? 'Storten' : 'Verzoek', icon: ArrowDown },
				{ label: 'Meer', icon: Menu, tertiary: true }
			]}
			<div class="px-4 pt-4 pb-4">
				<ActionButtonGroup actions={pdpActions} variant="pdp" class="w-full" />
			</div>
		{/if}
	</div>
{:else}
	<!-- Original/Rebrand: Standard header -->
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
		<div
			class="header-inner flex w-full items-center justify-between px-4 pt-[54px] pb-2 landscape:relative landscape:px-0 landscape:pt-0"
		>
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
		<!-- Account Cards Carousel (Portrait Only) - with buttons inside cards -->
		<div
			class="w-full pt-0 pb-4 transition-[border-radius] duration-300 landscape:hidden bg-transparent {carouselIndex >=
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
				{#each accounts as account, i (account.id)}
					<AccountCard name={account.name} balance={account.balance} type={account.type} isJoint={i === 0} variant="carousel-buttons" />
				{/each}
			</HorizontalCarousel>
		</div>
	</div>
{/if}

<!-- Content: Transactions List -->
<div
	class="dashboard-main px-4 pt-4 pb-24 landscape:bg-transparent landscape:px-0 landscape:pt-0 landscape:pb-8 bg-transparent"
>
	{#if accounts[carouselIndex]?.name === 'Internetsparen'}
		<SavingsContent {isLoading} />
	{:else if isLoading}
		<!-- Payments Skeleton -->
		<div class="animate-pulse">
			<WidgetHeader title="Verwacht" class="mb-4">
				<div class="h-4 w-20 rounded bg-gray-200 dark:bg-gray-800"></div>
			</WidgetHeader>
			<Card padding="p-0" class="mb-6">
				<div class="divide-y divide-gray-100">
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
		<!-- Section Header -->
		<WidgetHeader title="Verwacht" class="mb-4">
			<WidgetAction
				label="Kijk vooruit"
				href="/mobile/kijk-vooruit?from=/mobile/product-details?accountIndex={carouselIndex}"
			/>
		</WidgetHeader>

		<!-- Upcoming Transactions -->
		<div class="mb-6">
			{#if data.upcomingTransactions && data.upcomingTransactions.length > 0}
				<Card padding="p-0">
					<div class="divide-y divide-gray-100">
						{#each data.upcomingTransactions as t}
							<button
								onclick={() => openExpectedSheet(t)}
								class="block w-full {isRebrand ? 'bg-transparent active:bg-white/20' : 'bg-white active:bg-gray-50'} p-4 text-left first:rounded-t-2xl last:rounded-b-2xl"
							>
								<TransactionItem
									merchant={t.merchant}
									subtitle={formatRecurringSubtitle(t.interval, t.daysUntil)}
									amount={t.isDebit ? -t.amount : t.amount}
									isDebit={t.isDebit}
									categoryIcon={t.categoryIcon}
									size="md"
									fontHeading={true}
									useLogo={true}
									showChevron={true}
								/>
							</button>
						{/each}
					</div>
				</Card>
			{/if}
		</div>

		<!-- Transaction Groups -->
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
						<div class="{isRebrand ? 'divide-y divide-white/30' : 'divide-y divide-gray-100'}">
							{#each group.transactions as t}
								<MobileLink
									href={`/mobile/transactions/${t.id}?from=${encodeURIComponent($page.url.pathname + $page.url.search)}`}
									class="block {isRebrand ? 'bg-transparent active:bg-white/20' : 'bg-white active:bg-gray-50'} p-4 first:rounded-t-2xl last:rounded-b-2xl"
								>
									<TransactionItem
										merchant={t.merchant}
										subtitle={t.category}
										amount={t.isDebit ? -t.amount : t.amount}
										isDebit={t.isDebit}
										categoryIcon={t.categoryIcon}
										size="md"
										showChevron={true}
									/>
								</MobileLink>
							{/each}
						</div>
					</Card>
				</section>
			{:else}
				<div class="mt-8 text-center text-sm text-gray-800">Geen transacties gevonden</div>
			{/each}
		</div>
	{/if}
	<div class="h-8"></div>
</div>

<!-- Expected Transaction Bottom Sheet -->
<BottomSheet bind:open={expectedSheetOpen} onClose={closeExpectedSheet} title="Verwachte betaling">
	{#if selectedExpected}
		<div class="space-y-4">
			<!-- Merchant header -->
			<div class="flex items-center gap-4 pb-2">
				<div class="rounded-xl bg-white p-2 shadow-sm">
					<MerchantLogo merchantName={selectedExpected.merchant} categoryIcon={selectedExpected.categoryIcon} size="lg" />
				</div>
				<div class="flex-1">
					<h3 class="font-heading text-lg font-bold text-gray-900 dark:text-white">{selectedExpected.merchant}</h3>
					<p class="text-sm text-gray-500">{selectedExpected.daysLabel}</p>
				</div>
				<div class="text-right">
					<Amount
						amount={selectedExpected.isDebit ? -selectedExpected.amount : selectedExpected.amount}
						size="lg"
						class="font-heading !text-xl {selectedExpected.isDebit ? '!text-gray-900' : '!text-green-600'}"
					/>
				</div>
			</div>

			<!-- Details card -->
			<Card padding="p-4">
				<div class="space-y-4">
					<div class="flex items-center gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
							<Calendar class="h-5 w-5 text-gray-600" strokeWidth={1.5} />
						</div>
						<div>
							<p class="text-xs text-gray-500">Volgende betaling</p>
							<p class="font-medium text-gray-900">{formatNextDate(selectedExpected.nextDate)}</p>
						</div>
					</div>

					<div class="flex items-center gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
							<Repeat class="h-5 w-5 text-gray-600" strokeWidth={1.5} />
						</div>
						<div>
							<p class="text-xs text-gray-500">Frequentie</p>
							<p class="font-medium text-gray-900">{formatInterval(selectedExpected.interval)}</p>
						</div>
					</div>

					<div class="flex items-center gap-3">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-full"
							style="background-color: {selectedExpected.categoryColor ? selectedExpected.categoryColor + '20' : 'rgb(243, 239, 237)'}"
						>
							<Tag
								class="h-5 w-5"
								style="color: {selectedExpected.categoryColor || 'rgb(107, 114, 128)'}"
								strokeWidth={1.5}
							/>
						</div>
						<div>
							<p class="text-xs text-gray-500">Categorie</p>
							<p class="font-medium text-gray-900">{selectedExpected.category}</p>
						</div>
					</div>
				</div>
			</Card>

			<!-- Actions -->
			<Card padding="p-0">
				<div class="divide-y divide-gray-100">
					<button class="flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors active:bg-gray-50">
						<div class="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100">
							<Pause class="h-5 w-5 text-gray-600" strokeWidth={1.5} />
						</div>
						<span class="flex-1 text-sm text-gray-900">Pauzeer abonnement</span>
						<ChevronRight class="h-4 w-4 text-gray-400" strokeWidth={2} />
					</button>
					<button class="flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors active:bg-gray-50">
						<div class="flex h-9 w-9 items-center justify-center rounded-full bg-red-50">
							<Trash2 class="h-5 w-5 text-red-600" strokeWidth={1.5} />
						</div>
						<span class="flex-1 text-sm text-red-600">Verwijder abonnement</span>
						<ChevronRight class="h-4 w-4 text-gray-400" strokeWidth={2} />
					</button>
				</div>
			</Card>
		</div>
	{/if}
</BottomSheet>