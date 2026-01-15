<script lang="ts">
	import MobileLink from '$lib/components/mobile/MobileLink.svelte';
	import {
		ArrowLeft,
		Search,
		PiggyBank,
		CreditCard,
		TrendingUp,
		ChevronDown,
		Check
	} from 'lucide-svelte';
	import { mobileScrollY } from '$lib/stores/mobileScroll';
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

	// For header shadow on scroll
	const headerShadowOpacity = $derived(Math.min($mobileScrollY / 50, 1) * 0.1);

	// Scroll progress for glassy transition
	const scrollProgress = $derived(Math.min($mobileScrollY / 60, 1));
	const blurAmount = $derived(scrollProgress * 12);
	const r = $derived(Math.round(243 + (250 - 243) * scrollProgress));
	const g = $derived(Math.round(239 + (249 - 239) * scrollProgress));
	const b = $derived(Math.round(237 + (248 - 237) * scrollProgress));
	const bgOpacity = $derived(1 - scrollProgress * 0.3);

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
</script>

<!-- Backdrop for slidedown -->
{#if isSlidedownOpen}
	<button
		class="fixed inset-0 z-30 bg-black/40 transition-opacity duration-300"
		onclick={() => (isSlidedownOpen = false)}
		aria-label="Close product selector"
	></button>
{/if}

<!-- Sticky Product Header with Slidedown -->
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
				{currentProduct.name}
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
									<span class="font-heading text-sm font-semibold text-gray-900 dark:text-white">{product.name}</span>
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
			<div class="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
				<!-- Balance Row -->
				<div class="mb-3 flex items-center justify-between">
					<div class="flex items-baseline gap-1">
						<span class="font-heading text-3xl font-bold text-gray-900 dark:text-white">€</span>
						<Amount
							amount={currentProduct.balance}
							size="lg"
							showSign={false}
							class="font-heading !text-gray-900 dark:!text-white"
						/>
					</div>
					<div class="flex items-center gap-2 text-sm text-gray-500">
						{#if currentProduct.type === 'savings' && currentProduct.interestRate}
							<span class="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-600 dark:bg-green-900/30 dark:text-green-400">
								{currentProduct.interestRate}% rente
							</span>
						{:else if currentProduct.type === 'investment' && currentProduct.performance}
							<span class="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-600 dark:bg-green-900/30 dark:text-green-400">
								{currentProduct.performance}
							</span>
						{/if}
					</div>
				</div>

				<!-- Action Buttons -->
				<ProductActionButtons 
					productType={currentProduct.type} 
					variant="square"
				/>
			</div>
		</div>
	{/if}
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
			kijkVooruitLink="/mobile/kijk-vooruit?from=/mobile/transactions?product={currentProductIndex}"
			formatRecurringSubtitle={(interval, days) => interval && days !== undefined ? formatRecurringSubtitle(interval, days) : ''}
		/>
	{/if}
	<div class="h-8"></div>
</div>
