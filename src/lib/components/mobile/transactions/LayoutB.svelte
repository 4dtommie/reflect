<script lang="ts">
	import MobileLink from '$lib/components/mobile/MobileLink.svelte';
	import {
		ArrowLeft,
		Search,
		PiggyBank,
		CreditCard,
		TrendingUp,
		Users,
		User,
		ArrowUpRight,
		ArrowDownLeft,
		Menu,
		ArrowUp,
		ArrowDown
	} from 'lucide-svelte';
	import { mobileScrollY } from '$lib/stores/mobileScroll';
	import { mobileThemeName } from '$lib/stores/mobileTheme';
	import Amount from '$lib/components/mobile/Amount.svelte';
	import { page } from '$app/stores';
	import { formatRecurringSubtitle } from '$lib/utils/dateFormatting';
	import { 
		SavingsContent, 
		TransactionsList, 
		ProductActionButtons 
	} from '$lib/components/mobile/organisms';
	import { productsStore, type Product } from '$lib/mock/products';

	interface Props {
		data: any;
	}

	let { data }: Props = $props();

	// Theme check
	const isOriginal = $derived($mobileThemeName === 'nn-original');

	// For header shadow on scroll
	const headerShadowOpacity = $derived(Math.min($mobileScrollY / 50, 1) * 0.1);

	// Scroll progress for glassy transition
	const scrollProgress = $derived(Math.min($mobileScrollY / 60, 1));
	const blurAmount = $derived(scrollProgress * 12);
	const r = $derived(Math.round(243 + (250 - 243) * scrollProgress));
	const g = $derived(Math.round(239 + (249 - 239) * scrollProgress));
	const b = $derived(Math.round(237 + (248 - 237) * scrollProgress));
	const bgOpacity = $derived(1 - scrollProgress * 0.3);

	// Reactive accounts list from store
	const accounts = $derived($productsStore.filter((p) => p.enabled !== false));

	// Get current product index from URL
	let currentProductIndex = $state(0);

	$effect(() => {
		const productParam = $page.url.searchParams.get('product');
		if (productParam) {
			const index = parseInt(productParam, 10);
			if (!isNaN(index) && index >= 0 && index < accounts.length) {
				currentProductIndex = index;
			}
		}
	});

	const currentProduct = $derived(accounts[currentProductIndex]);

	// Navigation helpers
	const currentLayout = $derived($page.url.searchParams.get('layout') || 'default');
	const backLink = $derived(currentLayout !== 'default' ? `/mobile?layout=${currentLayout}` : '/mobile');

	// Loading state for skeleton
	let isLoading = $state(true);

	$effect(() => {
		isLoading = true;
		const delay = Math.floor(Math.random() * 500) + 200;
		setTimeout(() => {
			isLoading = false;
		}, delay);
	});

	// Get icon for product type
	function getProductIcon(type: string) {
		switch (type) {
			case 'savings':
				return PiggyBank;
			case 'investment':
				return TrendingUp;
			default:
				return CreditCard;
		}
	}
</script>

<!-- Sticky Product Header -->
<header
	class="mobile-header-component sticky top-0 z-20 flex flex-col transition-[backdrop-filter] duration-200"
	style="
		background-color: rgba({r}, {g}, {b}, {bgOpacity});
		backdrop-filter: blur({blurAmount}px);
		-webkit-backdrop-filter: blur({blurAmount}px);
		box-shadow: 0 12px 32px -4px rgba(0, 0, 0, {headerShadowOpacity});
		transform: translateZ(0);
	"
>
	<!-- Navigation Bar -->
	<div class="flex w-full items-center justify-between px-4 pt-[54px] pb-2">
		<MobileLink
			href={backLink}
			class="rounded-full p-2 hover:bg-black/5 active:bg-black/10"
		>
			<ArrowLeft class="h-6 w-6 text-black dark:text-white" />
		</MobileLink>
		<h1 class="font-heading text-[18px] font-bold text-black dark:text-white">
			{currentProduct.name}
		</h1>
		<button class="rounded-full p-2 hover:bg-black/5 active:bg-black/10">
			<Search class="h-6 w-6 text-black dark:text-white" />
		</button>
	</div>

	<!-- Product Info Card -->
	<div class="px-4 pb-4">
		{#if isOriginal}
			<!-- Original theme: Full-width card with buttons inside (matches homepage betaalsaldo) -->
			<div class="rounded-lg bg-white shadow-sm dark:bg-gray-900">
				<!-- Account info row -->
				<div class="flex items-center gap-3 px-4 py-4">
					<div class="relative flex h-11 w-11 shrink-0 items-center justify-center">
						{#if currentProduct.type === 'savings'}
							<PiggyBank class="h-7 w-7 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
						{:else if currentProduct.type === 'investment'}
							<TrendingUp class="h-7 w-7 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
						{:else}
							<CreditCard class="h-7 w-7 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
						{/if}
						<div class="absolute -right-0.5 -bottom-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-mediumOrange-500 text-[9px] font-bold text-white ring-[1.5px] ring-white dark:ring-gray-900">
							N
						</div>
					</div>
					<div class="flex min-w-0 flex-1 flex-col gap-0.5">
						<div class="text-base font-normal text-gray-1000 dark:text-white">
							{currentProduct.name}
						</div>
						<div class="text-[14px] font-normal text-gray-800 dark:text-gray-400">
							{currentProduct.iban || 'NL31 NNBA 1000 0006 45'}
						</div>
					</div>
					<Amount
						amount={currentProduct.balance}
						size="sm"
						class="text-base !font-bold !text-gray-1000 dark:!text-white"
						showSign={false}
						showSymbol={true}
					/>
				</div>

				<!-- Action buttons bar with vertical dividers -->
				<div class="flex items-stretch border-t border-gray-100 px-2 dark:border-gray-800 !bg-white rounded-b-md">
					<button
						type="button"
						class="flex flex-1 flex-col items-center justify-center gap-1 py-3 !bg-white transition-colors active:bg-gray-100 dark:active:bg-gray-800 rounded-bl-md"
					>
						<ArrowUpRight class="h-6 w-6 text-mediumOrange-500" strokeWidth={1.5} />
						<span class="text-[14px] text-gray-1000 dark:text-white" style="font-weight: 500;">Overmaken</span>
					</button>
					<div class="flex items-center py-3">
						<div class="h-full w-px bg-gray-100 dark:bg-gray-700"></div>
					</div>
					<button
						type="button"
						class="flex flex-1 flex-col items-center justify-center gap-1 py-3 !bg-white transition-colors active:bg-gray-100 dark:active:bg-gray-800"
					>
						<ArrowDownLeft class="h-6 w-6 text-mediumOrange-500" strokeWidth={1.5} />
						<span class="text-[14px] text-gray-1000 dark:text-white" style="font-weight: 500;">Betaalverzoek</span>
					</button>
					<div class="flex items-center py-3">
						<div class="h-full w-px bg-gray-100 dark:bg-gray-700"></div>
					</div>
					<button
						type="button"
						class="flex flex-1 flex-col items-center justify-center gap-1 py-3 !bg-white transition-colors active:bg-gray-100 dark:active:bg-gray-800 rounded-br-md"
					>
						<Menu class="h-6 w-6 text-mediumOrange-500" strokeWidth={1.5} />
						<span class="text-[14px] text-gray-1000 dark:text-white" style="font-weight: 500;">Meer</span>
					</button>
				</div>
			</div>
		{:else}
			<!-- Redesign theme: Huge amount display with buttons outside -->
			<div class="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
				<!-- Icon and Type Row -->
				<div class="mb-1 flex items-center gap-2">
					{#if currentProduct.type === 'savings'}
						<PiggyBank class="h-5 w-5 text-gray-500 dark:text-gray-400" strokeWidth={1.5} />
					{:else if currentProduct.type === 'investment'}
						<TrendingUp class="h-5 w-5 text-gray-500 dark:text-gray-400" strokeWidth={1.5} />
					{:else}
						<CreditCard class="h-5 w-5 text-gray-500 dark:text-gray-400" strokeWidth={1.5} />
					{/if}
					<span class="text-sm text-gray-600 dark:text-gray-400">{currentProduct.name}</span>
				</div>

				<!-- Huge Balance -->
				<div class="flex items-baseline gap-1">
					<span class="font-heading text-4xl font-bold text-gray-900 dark:text-white">€</span>
					<Amount
						amount={currentProduct.balance}
						size="huge"
						showSign={false}
						class="font-heading !text-gray-900 dark:!text-white"
					/>
				</div>

				<!-- IBAN -->
				<div class="mt-1 text-sm text-gray-500 dark:text-gray-400">
					{currentProduct.iban || 'NL31 NNBA 1000 0006 45'}
				</div>

				<!-- Extra Info -->
				{#if currentProduct.type === 'savings' && currentProduct.interestRate}
					<div class="mt-2 text-sm text-gray-800 dark:text-gray-400">
						<span class="font-semibold text-green-600">{currentProduct.interestRate}%</span> rente per jaar
					</div>
				{:else if currentProduct.type === 'investment' && currentProduct.performance}
					<div class="mt-2 text-sm text-gray-800 dark:text-gray-400">
						Rendement dit jaar: <span class="font-semibold text-green-600">{currentProduct.performance}</span>
					</div>
				{/if}
			</div>

			<!-- Action buttons outside card (redesign) -->
			<div class="flex gap-2 pt-3">
				<button
					class="flex h-9 flex-1 items-center justify-center gap-2 rounded-full bg-mediumOrange-600 px-4 text-white shadow-sm transition-all active:scale-95"
					aria-label="Primary action"
				>
					<ArrowUp class="h-4 w-4 text-white" strokeWidth={2.2} />
					<span class="font-heading text-sm font-semibold">{currentProduct.type === 'savings' ? 'Opnemen' : 'Betalen'}</span>
				</button>
				<button
					class="flex h-9 flex-1 items-center justify-center gap-2 rounded-full bg-white px-4 shadow-sm transition-all active:scale-95"
					aria-label="Secondary action"
				>
					<ArrowDown class="h-4 w-4 text-mediumOrange-600" strokeWidth={2.2} />
					<span class="font-heading text-sm font-semibold text-gray-700">{currentProduct.type === 'savings' ? 'Storten' : 'Verzoek'}</span>
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
	</div>
</header>

<!-- Content Area -->
<div class="bg-sand-50 px-4 pt-4 pb-24 dark:bg-gray-950">
	{#if currentProduct.type === 'savings'}
		<SavingsContent {isLoading} />
	{:else}
		<TransactionsList
			{isLoading}
			upcomingTransactions={data.upcomingTransactions}
			groupedTransactions={data.groupedTransactions}
			kijkVooruitLink="/mobile/kijk-vooruit?from=/mobile/product-details?product={currentProductIndex}"
			formatRecurringSubtitle={(interval, days) => interval && days !== undefined ? formatRecurringSubtitle(interval, days) : ''}
		/>
	{/if}
	<div class="h-8"></div>
</div>
