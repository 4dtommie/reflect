<script lang="ts">
	import MobileLink from '$lib/components/mobile/MobileLink.svelte';
	import {
		ArrowLeft,
		Search,
		PiggyBank,
		CreditCard,
		TrendingUp,
		ChevronDown,
		Check,
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
		ProductActionButtons,
		ActionButtonGroup
	} from '$lib/components/mobile/organisms';
	import { productsStore, type Product, getProductDisplayName } from '$lib/mock/products';

	interface Props {
		data: any;
	}

	let { data }: Props = $props();

	// Theme check
	const isOriginal = $derived($mobileThemeName === 'nn-original');
	const isImproved = $derived($mobileThemeName === 'improved');
	const isRebrand = $derived($mobileThemeName === 'rebrand');

	// For header shadow on scroll
	const headerShadowOpacity = $derived(Math.min($mobileScrollY / 50, 1) * 0.1);

	// Scroll progress for glassy transition
	const scrollProgress = $derived(Math.min($mobileScrollY / 60, 1));
	// Original: sand-50, Rebrand: transparent
	const blurAmount = $derived(isRebrand ? 0 : 0);
	const r = $derived(isOriginal ? 250 : 0);
	const g = $derived(isOriginal ? 249 : 0);
	const b = $derived(isOriginal ? 248 : 0);
	const bgOpacity = $derived(isOriginal ? 1 : 0);

	// Reactive products list from store
	const products = $derived($productsStore.filter((p) => p.enabled !== false));

	// Current product state
	let currentProductIndex = $state(0);
	const currentProduct = $derived(products[currentProductIndex] || products[0]);

	// Slidedown overlay state
	let isSlidedownOpen = $state(false);
	const selectionDelayMs = 300;

	// Navigation helpers
	const currentLayout = $derived($page.url.searchParams.get('layout') || 'default');
	const backLink = $derived(currentLayout !== 'default' ? `/mobile?layout=${currentLayout}` : '/mobile');

	// Initialize product index from URL
	$effect(() => {
		const productParam = $page.url.searchParams.get('product');
		if (productParam) {
			const index = parseInt(productParam, 10);
			if (!isNaN(index) && index >= 0 && index < products.length) {
				currentProductIndex = index;
			}
		}
	});

	function toggleSlidedown() {
		isSlidedownOpen = !isSlidedownOpen;
	}

	function selectProduct(index: number) {
		currentProductIndex = index;
		// Keep the slidedown open briefly so user sees the tapped state
		setTimeout(() => {
			isSlidedownOpen = false;
		}, selectionDelayMs);
	}

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

	// Get display name for product (checks for custom name in localStorage)
	function getDisplayName(product: Product): string {
		return getProductDisplayName(product);
	}
</script>

<!-- Backdrop for slidedown -->
{#if isSlidedownOpen}
	<button
		class="fixed inset-0 z-30 bg-black/40 transition-opacity duration-300"
		onclick={() => (isSlidedownOpen = false)}
		aria-label="Close product selector"
	></button>
{/if}

{#if isImproved}
	<!-- Redesign: Colored header wrapping nav + product card + buttons -->
	<div class="product-colored-header rounded-b-3xl" style="background-color: rgb(200, 225, 235);">
		<header class="sticky top-0 z-40 relative w-full">
			<div class="flex w-full items-center justify-between px-4 pt-[54px] pb-2">
				<MobileLink
					href={backLink}
					class="rounded-full p-2 hover:bg-black/5 active:bg-black/10"
				>
					<ArrowLeft class="h-6 w-6" strokeWidth={1.5} />
				</MobileLink>
				
				<!-- Product Selector Button -->
				<button
					onclick={toggleSlidedown}
					class="flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors hover:bg-black/5 active:bg-black/10"
				>
					<h1 class="font-heading text-[18px] font-bold">
						{getDisplayName(currentProduct)}
					</h1>
					<ChevronDown
						class="h-5 w-5 text-gray-600 transition-transform duration-200 {isSlidedownOpen
							? 'rotate-180'
							: ''}"
						strokeWidth={2}
					/>
				</button>
				
				<button class="rounded-full p-2 hover:bg-black/5 active:bg-black/10">
					<Search class="h-6 w-6" strokeWidth={1.5} />
				</button>
			</div>

			<!-- Slidedown product selector (overlay) -->
			<div class="absolute left-0 right-0 top-full z-50 pointer-events-none">
				<div
					class="mx-auto w-full max-w-none transition-transform duration-300 ease-out origin-top"
					style="transform: translateY({isSlidedownOpen ? '0' : '-8px'}); opacity: {isSlidedownOpen ? 1 : 0}; pointer-events: {isSlidedownOpen ? 'auto' : 'none'}; background-color: rgb(200, 225, 235); box-shadow: 0 8px 24px rgba(0,0,0,0.08);"
				>
					<div class="border-t border-transparent px-2 py-2">
						{#each products as product, i}
							<button
								onclick={() => selectProduct(i)}
								class="flex w-full items-center justify-between rounded-xl px-3 py-3 transition-all active:scale-[0.99] {currentProductIndex === i ? 'bg-white dark:bg-gray-900' : 'hover:bg-white/50'}"
							>
								<div class="flex items-center gap-3">
									<div
										class="flex h-10 w-10 items-center justify-center rounded-full {product.type === 'savings' ? 'bg-green-100' : product.type === 'investment' ? 'bg-blue-100' : 'bg-orange-100'}"
									>
										{#if product.type === 'savings'}
											<PiggyBank class="h-5 w-5 text-green-600" strokeWidth={1.5} />
										{:else if product.type === 'investment'}
											<TrendingUp class="h-5 w-5 text-blue-600" strokeWidth={1.5} />
										{:else}
											<CreditCard class="h-5 w-5 text-orange-600" strokeWidth={1.5} />
										{/if}
									</div>
									<div class="flex flex-col items-start">
										<span class="font-heading text-sm font-semibold text-gray-900">{getDisplayName(product)}</span>
										<span class="text-xs text-gray-500">{product.iban}</span>
									</div>
								</div>
								<div class="flex items-center gap-2">
									<Amount amount={product.balance} size="sm" showSign={false} showSymbol={true} class="font-heading font-semibold !text-gray-900" />
									{#if currentProductIndex === i}
										<Check class="h-5 w-5 text-mediumOrange-600" strokeWidth={2.5} />
									{/if}
								</div>
							</button>
						{/each}
					</div>
				</div>
			</div>
		</header>
		
		<!-- Current Product Info Card (when slidedown is closed) -->
		{#if !isSlidedownOpen}
			<div class="px-4 pb-0">
				<div class="rounded-2xl bg-white p-4 shadow-sm">
					<!-- Icon and name row -->
					<div class="mb-1 flex items-center gap-2">
						{#if currentProduct.type === 'savings'}
							<PiggyBank class="h-5 w-5 text-gray-500" strokeWidth={1.5} />
						{:else if currentProduct.type === 'investment'}
							<TrendingUp class="h-5 w-5 text-gray-500" strokeWidth={1.5} />
						{:else}
							<CreditCard class="h-5 w-5 text-gray-500" strokeWidth={1.5} />
						{/if}
					<span class="text-sm text-gray-600">{getDisplayName(currentProduct)}</span>
					</div>

					<!-- Huge Balance -->
					<div class="flex items-baseline gap-1">
						<span class="font-heading text-4xl font-bold text-gray-900">€</span>
						<Amount
							amount={currentProduct.balance}
							size="huge"
							showSign={false}
							class="font-heading !text-gray-900"
						/>
					</div>

					<!-- IBAN -->
					<div class="mt-1 text-sm text-gray-500">
						{currentProduct.iban || 'NL31 NNBA 1000 0006 45'}
					</div>

					<!-- Extra Info -->
					{#if currentProduct.type === 'savings' && currentProduct.interestRate}
						<div class="mt-2">
							<span class="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-600">
								{currentProduct.interestRate}% rente
							</span>
						</div>
					{:else if currentProduct.type === 'investment' && currentProduct.performance}
						<div class="mt-2">
							<span class="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-600">
								{currentProduct.performance}
							</span>
						</div>
					{/if}
				</div>
			</div>
			
			<!-- Action buttons inside colored area -->
			{@const pdpActions = [
				{ label: currentProduct.type === 'savings' ? 'Opnemen' : 'Betalen', icon: ArrowUp },
				{ label: currentProduct.type === 'savings' ? 'Storten' : 'Verzoek', icon: ArrowDown },
				{ label: 'Meer', icon: Menu, tertiary: true }
			]}
			<div class="px-4 pt-4 pb-4">
				<ActionButtonGroup actions={pdpActions} variant="pdp" class="w-full" />
			</div>
		{/if}
	</div>
{:else}
	<!-- Original/Rebrand: Standard header with slidedown -->
	<header
		class="mobile-header-component sticky top-0 z-40 relative flex flex-col transition-[backdrop-filter] duration-200"
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
			
			<!-- Product Selector Button -->
			<button
				onclick={toggleSlidedown}
				class="flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors hover:bg-black/5 active:bg-black/10"
			>
				<h1 class="font-heading text-[18px] font-bold text-black dark:text-white">
					{getDisplayName(currentProduct)}
				</h1>
				<ChevronDown
					class="h-5 w-5 text-gray-600 transition-transform duration-200 dark:text-gray-400 {isSlidedownOpen
						? 'rotate-180'
						: ''}"
					strokeWidth={2}
				/>
			</button>
			
			<button class="rounded-full p-2 hover:bg-black/5 active:bg-black/10">
				<Search class="h-6 w-6 text-black dark:text-white" />
			</button>
		</div>

		<!-- Slidedown product selector (overlay, does not push content) -->
		<div class="absolute left-0 right-0 top-full z-50 pointer-events-none">
			<div
				class="mx-auto w-full max-w-none transition-transform duration-300 ease-out origin-top"
				style="transform: translateY({isSlidedownOpen ? '0' : '-8px'}); opacity: {isSlidedownOpen ? 1 : 0}; pointer-events: {isSlidedownOpen ? 'auto' : 'none'}; background-color: rgba({r}, {g}, {b}, {bgOpacity}); box-shadow: 0 8px 24px rgba(0,0,0,0.08);"
			>
				<div class="border-t border-transparent px-2 py-2">
						{#each products as product, i}
							<button
								onclick={() => selectProduct(i)}
								class="flex w-full items-center justify-between rounded-xl px-3 py-3 transition-all active:scale-[0.99] {currentProductIndex === i ? 'bg-white dark:bg-gray-900' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}"
							>
								<div class="flex items-center gap-3">
									<div
										class="flex h-10 w-10 items-center justify-center rounded-full {product.type === 'savings' ? 'bg-green-100 dark:bg-green-900/30' : product.type === 'investment' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}"
									>
										{#if product.type === 'savings'}
											<PiggyBank class="h-5 w-5 text-green-600 dark:text-green-400" strokeWidth={1.5} />
										{:else if product.type === 'investment'}
											<TrendingUp class="h-5 w-5 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
										{:else}
											<CreditCard class="h-5 w-5 text-orange-600 dark:text-orange-400" strokeWidth={1.5} />
										{/if}
									</div>
									<div class="flex flex-col items-start">
										<span class="font-heading text-sm font-semibold text-gray-900 dark:text-white">{getDisplayName(product)}</span>
										<span class="text-xs text-gray-500 dark:text-gray-400">{product.iban}</span>
									</div>
								</div>
								<div class="flex items-center gap-2">
									<Amount amount={product.balance} size="sm" showSign={false} showSymbol={true} class="font-heading font-semibold !text-gray-900 dark:!text-white" />
									{#if currentProductIndex === i}
										<Check class="h-5 w-5 text-mediumOrange-600" strokeWidth={2.5} />
									{/if}
								</div>
							</button>
					{/each}
				</div>
			</div>
		</div>

		<!-- Current Product Info Card (Collapsed view) -->
		{#if !isSlidedownOpen}
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
									{getDisplayName(currentProduct)}
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
						<div class="flex items-stretch border-t border-gray-100 px-2 dark:border-gray-800 rounded-b-md">
							<button
								type="button"
								class="flex flex-1 flex-col items-center justify-center gap-1 py-3 transition-colors active:bg-gray-100 dark:active:bg-gray-800 rounded-bl-md"
							>
								<ArrowUp class="h-6 w-6 text-mediumOrange-500" strokeWidth={1.5} />
								<span class="text-[14px] text-gray-1000 dark:text-white" style="font-weight: 500;">Betalen</span>
							</button>
							<div class="flex items-center py-3">
								<div class="h-full w-px bg-gray-100 dark:bg-gray-700"></div>
							</div>
							<button
								type="button"
								class="flex flex-1 flex-col items-center justify-center gap-1 py-3 transition-colors active:bg-gray-100 dark:active:bg-gray-800"
							>
								<ArrowDown class="h-6 w-6 text-mediumOrange-500" strokeWidth={1.5} />
								<span class="text-[14px] text-gray-1000 dark:text-white" style="font-weight: 500;">Verzoek</span>
							</button>
							<div class="flex items-center py-3">
								<div class="h-full w-px bg-gray-100 dark:bg-gray-700"></div>
							</div>
							<button
								type="button"
								class="flex flex-1 flex-col items-center justify-center gap-1 py-3 transition-colors active:bg-gray-100 dark:active:bg-gray-800 rounded-br-md"
							>
								<Menu class="h-6 w-6 text-mediumOrange-500" strokeWidth={1.5} />
								<span class="text-[14px] text-gray-1000 dark:text-white" style="font-weight: 500;">Meer</span>
							</button>
						</div>
					</div>
				{:else}
					<!-- Rebrand theme: Huge amount display with buttons outside -->
					<div class="rounded-2xl {isRebrand ? 'card-glassy' : 'bg-white shadow-sm'} p-4 dark:bg-gray-900">
						<!-- Icon and name row -->
						<div class="mb-1 flex items-center gap-2">
							{#if currentProduct.type === 'savings'}
								<PiggyBank class="h-5 w-5 text-gray-500 dark:text-gray-400" strokeWidth={1.5} />
							{:else if currentProduct.type === 'investment'}
								<TrendingUp class="h-5 w-5 text-gray-500 dark:text-gray-400" strokeWidth={1.5} />
							{:else}
								<CreditCard class="h-5 w-5 text-gray-500 dark:text-gray-400" strokeWidth={1.5} />
							{/if}
						<span class="text-sm text-gray-600 dark:text-gray-400">{getDisplayName(currentProduct)}</span>
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
							<div class="mt-2">
								<span class="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-600 dark:bg-green-900/30 dark:text-green-400">
									{currentProduct.interestRate}% rente
								</span>
							</div>
						{:else if currentProduct.type === 'investment' && currentProduct.performance}
							<div class="mt-2">
								<span class="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-600 dark:bg-green-900/30 dark:text-green-400">
									{currentProduct.performance}
								</span>
							</div>
						{/if}
					</div>

					<!-- Action buttons outside card (rebrand) -->
					{@const pdpActions = [
						{ label: currentProduct.type === 'savings' ? 'Opnemen' : 'Betalen', icon: ArrowUp },
						{ label: currentProduct.type === 'savings' ? 'Storten' : 'Verzoek', icon: ArrowDown },
						{ label: 'Meer', icon: Menu, tertiary: true }
					]}
					<div class="pt-3">
						<ActionButtonGroup actions={pdpActions} variant="pdp" class="w-full" />
					</div>
				{/if}
			</div>
		{/if}
	</header>
{/if}

<!-- Content Area -->
<div class="bg-transparent px-4 pt-4 pb-24 dark:bg-gray-950">
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
