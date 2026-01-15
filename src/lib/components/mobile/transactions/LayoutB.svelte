<script lang="ts">
	import MobileLink from '$lib/components/mobile/MobileLink.svelte';
	import {
		ArrowLeft,
		Search,
		PiggyBank,
		CreditCard,
		TrendingUp,
		Users,
		User
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
		<div class="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
			<!-- Icon and Type Row -->
			<div class="mb-2 flex items-center justify-between">
				<div class="flex items-center gap-2">
					{#if currentProduct.type === 'savings'}
						<PiggyBank class="h-6 w-6 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
					{:else if currentProduct.type === 'investment'}
						<TrendingUp class="h-6 w-6 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
					{:else}
						<CreditCard class="h-6 w-6 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
					{/if}
					<span class="text-sm text-gray-800 dark:text-gray-400">{currentProduct.iban}</span>
				</div>
				<div class="flex items-center gap-1">
					{#if currentProduct.holders === 1}
						<User class="h-4 w-4 text-gray-500" strokeWidth={1.5} />
					{:else}
						<Users class="h-4 w-4 text-gray-500" strokeWidth={1.5} />
					{/if}
				</div>
			</div>

			<!-- Balance -->
			<div class="mb-3 flex items-baseline gap-1">
				<span class="font-heading text-3xl font-bold text-gray-900 dark:text-white">€</span>
				<Amount
					amount={currentProduct.balance}
					size="lg"
					showSign={false}
					class="font-heading !text-gray-900 dark:!text-white"
				/>
			</div>

			<!-- Extra Info -->
			{#if currentProduct.type === 'savings' && currentProduct.interestRate}
				<div class="mb-3 text-sm text-gray-800 dark:text-gray-400">
					<span class="font-semibold text-green-600">{currentProduct.interestRate}%</span> rente per jaar
				</div>
			{:else if currentProduct.type === 'investment' && currentProduct.performance}
				<div class="mb-3 text-sm text-gray-800 dark:text-gray-400">
					Rendement dit jaar: <span class="font-semibold text-green-600">{currentProduct.performance}</span>
				</div>
			{/if}

			<!-- Action Buttons -->
			<ProductActionButtons 
				productType={currentProduct.type} 
				variant="square"
			/>
		</div>
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
			kijkVooruitLink="/mobile/kijk-vooruit?from=/mobile/transactions?product={currentProductIndex}"
			formatRecurringSubtitle={(interval, days) => interval && days !== undefined ? formatRecurringSubtitle(interval, days) : ''}
		/>
	{/if}
	<div class="h-8"></div>
</div>
