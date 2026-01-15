<script lang="ts">
	import { page } from '$app/stores';
	import MobileHeader from '$lib/components/mobile/MobileHeader.svelte';
	import MobileLink from '$lib/components/mobile/MobileLink.svelte';
	import Card from '$lib/components/mobile/Card.svelte';
	import Amount from '$lib/components/mobile/Amount.svelte';
	import { productsStore, type Product } from '$lib/mock/products';
	import { mobileThemeName } from '$lib/stores/mobileTheme';
	import {
		QrCode,
		LogOut,
		CreditCard,
		PiggyBank,
		TrendingUp,
		ChevronRight,
		ShoppingCart
	} from 'lucide-svelte';

	// Simple theme check
	const isOriginal = $derived($mobileThemeName === 'nn-original');

	// Products from store
	const products = $derived($productsStore.filter((p) => p.enabled !== false));

	// Get icon for product type
	function getProductIcon(type: Product['type']) {
		switch (type) {
			case 'savings':
				return PiggyBank;
			case 'investment':
				return TrendingUp;
			default:
				return CreditCard;
		}
	}

	// Get product type label
	function getProductTypeLabel(type: Product['type']) {
		switch (type) {
			case 'savings':
				return 'Spaarrekening';
			case 'investment':
				return 'Beleggingsrekening';
			default:
				return 'Betaalrekening';
		}
	}

	// Get carousel index for product
	function getCarouselIndex(productId: number) {
		return products.findIndex((p) => p.id === productId);
	}
</script>

<svelte:head>
	<title>Producten - Reflect Mobile</title>
</svelte:head>

<MobileHeader class="flex items-center justify-between bg-sand-50 px-4 pb-3 dark:bg-gray-1300">
	<button
		class="dark:hover:bg-gray-1200 flex h-10 w-10 items-center justify-center rounded-lg hover:bg-sand-100"
	>
		<QrCode class="h-6 w-6 text-black dark:text-white" strokeWidth={1.5} />
	</button>
	<h1 class="font-heading text-lg font-bold text-black dark:text-white">Producten</h1>
	<button
		class="dark:hover:bg-gray-1200 flex h-10 w-10 items-center justify-center rounded-lg hover:bg-sand-100"
	>
		<LogOut class="h-6 w-6 text-black dark:text-white" strokeWidth={1.5} />
	</button>
</MobileHeader>

<div class="space-y-4 px-4 pt-4 pb-4 font-nn">
	<!-- Product Cards -->
	{#each products as product, i}
		{@const Icon = getProductIcon(product.type)}
		<MobileLink
			href="/mobile/product-details?accountIndex={getCarouselIndex(product.id)}"
			class="block"
		>
			{#if isOriginal}
				<!-- Original theme: card with border/shadow, icon only (no square), flat amount -->
				<Card
					padding="p-4"
					class="dark:active:bg-gray-1100 transition-all active:scale-[0.99] active:bg-gray-50"
				>
					<div class="flex items-center gap-4">
						<!-- Icon only, no square background -->
						<Icon class="h-6 w-6 flex-shrink-0 text-gray-600 dark:text-gray-300" strokeWidth={1.5} />

						<!-- Product Info -->
						<div class="min-w-0 flex-1">
							<div class="truncate text-base font-medium text-gray-900 dark:text-white">
								{product.name}
							</div>
							{#if product.iban}
								<div class="truncate text-sm text-gray-500 dark:text-gray-400">
									{product.iban}
								</div>
							{/if}
						</div>

						<!-- Amount + Chevron (flat, same line) -->
						<div class="flex shrink-0 items-center gap-1">
							<span class="text-base font-bold text-gray-900 dark:text-white">
								€ {product.balance.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
							</span>
							<ChevronRight class="h-5 w-5 text-gray-400" strokeWidth={2} />
						</div>
					</div>
				</Card>
			{:else}
				<!-- Redesign theme: full card with icon square, rente shown -->
				<Card
					padding="p-4"
					class="dark:active:bg-gray-1100 rounded-2xl transition-all active:scale-[0.99] active:bg-gray-50"
				>
					<div class="flex items-center gap-4">
						<!-- Icon with background square -->
						<div
							class="flex h-12 w-12 items-center justify-center rounded-xl bg-sand-100 dark:bg-gray-800"
						>
							<Icon class="h-6 w-6 text-gray-600 dark:text-gray-300" strokeWidth={1.5} />
						</div>

						<!-- Product Info -->
						<div class="min-w-0 flex-1">
							<div class="truncate text-base font-medium text-gray-900 dark:text-white">
								{product.name}
							</div>
							{#if product.iban}
								<div class="truncate text-sm text-gray-500 dark:text-gray-400">
									{product.iban}
								</div>
							{/if}
						</div>

						<!-- Amount + Chevron -->
						<div class="flex shrink-0 items-center gap-1">
							<div class="text-right">
								<div class="flex items-baseline gap-1">
									<span class="text-sm font-medium text-gray-600 dark:text-gray-400">€</span>
									<Amount
										amount={product.balance}
										size="md"
										showSign={false}
										class="font-heading !text-gray-900 dark:!text-white"
									/>
								</div>
								{#if product.interestRate}
									<div class="text-xs text-green-600 dark:text-green-400">
										{product.interestRate}% rente
									</div>
								{/if}
								{#if product.performance}
									<div class="text-xs text-green-600 dark:text-green-400">
										{product.performance}
									</div>
								{/if}
							</div>
							<ChevronRight class="h-5 w-5 text-gray-400" strokeWidth={2} />
						</div>
					</div>
				</Card>
			{/if}
		</MobileLink>
	{/each}

	<!-- Product Store Link -->
	<div class="pb-20 pt-12 text-center">
		<MobileLink
			href="/mobile/products/store"
			class="inline-flex items-center gap-2 font-medium text-mediumOrange-500 transition-all active:opacity-70"
		>
			<ShoppingCart class="h-5 w-5" strokeWidth={1.5} />
			<span>Ontdek meer NN producten</span>
		</MobileLink>
	</div>
</div>
