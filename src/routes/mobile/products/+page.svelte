<script lang="ts">
	import { page } from '$app/stores';
	import MobileHeader from '$lib/components/mobile/MobileHeader.svelte';
	import MobileLink from '$lib/components/mobile/MobileLink.svelte';
	import Card from '$lib/components/mobile/Card.svelte';
	import ProductCardMenu from '$lib/components/mobile/ProductCardMenu.svelte';
	import Amount from '$lib/components/mobile/Amount.svelte';
	import { productsStore, getCustomProductName, saveCustomProductName, type Product } from '$lib/mock/products';
	import { mobileThemeName } from '$lib/stores/mobileTheme';
	import {
		QrCode,
		LogOut,
		CreditCard,
		PiggyBank,
		TrendingUp,
		ChevronRight,
		ShoppingCart,
		ArrowUp,
		ArrowDown,
		Check,
		X
	} from 'lucide-svelte';

	// Simple theme check
	const isOriginal = $derived($mobileThemeName === 'nn-original');

	// Products from store
	const products = $derived($productsStore.filter((p) => p.enabled !== false));

	// Editing state
	let editingProductId = $state<number | null>(null);
	let editingName = $state('');
	let editInputRef: HTMLInputElement | undefined = $state();
	let openMenuProductId = $state<number | null>(null);

	// Get display name for product (custom or original)
	function getDisplayName(product: Product): string {
		const customName = getCustomProductName(product.id);
		return customName ?? product.name;
	}

	// Get subtitle for product card - not used anymore
	function getSubtitle(product: Product): string | null {
		return null;
	}

	// Start editing a product name
	function startEditing(product: Product) {
		editingProductId = product.id;
		editingName = getDisplayName(product);
		setTimeout(() => editInputRef?.focus(), 10);
	}

	// Save the edited name
	function saveEdit(e?: MouseEvent) {
		e?.preventDefault();
		e?.stopPropagation();
		if (editingProductId !== null) {
			const trimmed = editingName.trim();
			const product = products.find(p => p.id === editingProductId);
			if (product) {
				if (trimmed === product.name || !trimmed) {
					saveCustomProductName(editingProductId, null);
				} else {
					saveCustomProductName(editingProductId, trimmed);
				}
			}
		}
		cancelEdit();
	}

	// Cancel editing
	function cancelEdit(e?: MouseEvent) {
		e?.preventDefault();
		e?.stopPropagation();
		editingProductId = null;
		editingName = '';
	}

	// Handle keyboard events in edit field
	function handleEditKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			saveEdit();
		} else if (e.key === 'Escape') {
			cancelEdit();
		}
	}

	// Quick actions for the menu
	const quickActions = [
		{ label: 'Overmaken', icon: ArrowUp, onclick: () => {} },
		{ label: 'Betaalverzoek', icon: ArrowDown, onclick: () => {} }
	];

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
		{@const isEditing = editingProductId === product.id}
		{@const displayName = getDisplayName(product)}
		{@const subtitle = getSubtitle(product)}
		
		{#if isOriginal}
			<!-- Original theme: simple icon, small amount on right, no more button -->
			<MobileLink
				href="/mobile/product-details?accountIndex={getCarouselIndex(product.id)}"
				class="block"
			>
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
								{displayName}
							</div>
							{#if product.iban}
								<div class="truncate text-sm text-gray-500 dark:text-gray-400">
									{product.iban}
								</div>
							{/if}
						</div>

						<!-- Amount + Chevron (flat, same line) -->
						<div class="flex shrink-0 items-center gap-1">
							<Amount amount={product.balance} size="sm" showSign={false} showSymbol={true} class="text-gray-900 dark:text-white" />
							<ChevronRight class="h-5 w-5 text-gray-400" strokeWidth={2} />
						</div>
					</div>
				</Card>
			</MobileLink>
		{:else}
			<!-- Redesign/Rebrand theme: more button, huge amount, mini chart -->
			<Card
				padding="p-0"
				class="dark:active:bg-gray-1100 relative overflow-visible rounded-2xl transition-all {openMenuProductId === product.id ? 'z-50' : ''}"
			>
				<!-- More button in top right (hidden during edit) -->
				{#if !isEditing}
					<div class="absolute right-2 top-2 z-20">
						<ProductCardMenu
							productId={product.id}
							{quickActions}
							onEditName={() => startEditing(product)}
							onRearrange={() => {}}
							onOpenChange={(open) => openMenuProductId = open ? product.id : null}
						/>
					</div>
				{/if}

				{#if isEditing}
					<!-- Edit mode -->
					<div class="flex items-center gap-3 p-4">
						<!-- Edit field with input and buttons inline -->
						<input
							bind:this={editInputRef}
							bind:value={editingName}
							type="text"
							class="min-w-0 flex-1 rounded-xl border-2 border-mediumOrange-500 bg-white px-3 py-2 text-base text-gray-900 focus:outline-none dark:bg-gray-800 dark:text-white"
							style="user-select: text !important; -webkit-user-select: text !important; -webkit-touch-callout: default !important;"
							placeholder={product.name}
							onkeydown={handleEditKeydown}
						/>
						<button
							type="button"
							onclick={saveEdit}
							class="flex h-10 w-10 items-center justify-center rounded-xl bg-mediumOrange-500 text-white transition-colors hover:bg-mediumOrange-600"
						>
							<Check class="h-5 w-5" strokeWidth={2} />
						</button>
						<button
							type="button"
							onclick={cancelEdit}
							class="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-200 text-gray-600 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300"
						>
							<X class="h-5 w-5" strokeWidth={2} />
						</button>
					</div>
				{:else}
					<MobileLink
						href="/mobile/product-details?accountIndex={getCarouselIndex(product.id)}"
						class="flex items-start gap-3 p-4 pr-12 active:scale-[0.99] active:bg-gray-50"
					>
						<!-- Icon with background square -->
						<div
							class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-sand-100 dark:bg-gray-800"
						>
							<Icon class="h-6 w-6 text-gray-600 dark:text-gray-300" strokeWidth={1.5} />
						</div>

						<!-- Product Info: Name + subtitle + Huge Amount (stacked) -->
						<div class="min-w-0 flex-1">
							<div class="truncate text-base font-normal text-gray-900 dark:text-white">
								{displayName}
							</div>
							{#if subtitle}
								<div class="text-xs text-gray-500 dark:text-gray-400">
									{subtitle}
							</div>
						{/if}
							<div class="mt-1">
								<Amount amount={product.balance} size="lg" showSign={false} showSymbol={true} class="text-gray-900 dark:text-white" />
							</div>
						</div>

						<!-- Mini sparkline chart -->
						{#if product.balanceHistory && product.balanceHistory.length > 1}
							{@const data = product.balanceHistory}
							{@const min = Math.min(...data)}
							{@const max = Math.max(...data)}
							{@const range = max - min || 1}
							{@const points = data.map((v, idx) => `${2 + (idx / (data.length - 1)) * 66},${2 + 28 - ((v - min) / range) * 28}`).join(' L ')}
							<div class="flex shrink-0 items-center self-center">
								<svg width="70" height="32" viewBox="0 0 70 32" fill="none" class="opacity-80">
									<path d="M {points}" stroke="rgb(34, 197, 94)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
								</svg>
							</div>
						{/if}
					</MobileLink>
				{/if}
			</Card>
		{/if}
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
