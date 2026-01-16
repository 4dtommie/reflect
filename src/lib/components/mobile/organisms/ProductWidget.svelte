<script lang="ts">
	import type { Component } from 'svelte';
	import { mobileThemeName } from '$lib/stores/mobileTheme';
	import { CreditCard, PiggyBank, TrendingUp, ChevronRight } from 'lucide-svelte';
	import Card from '../Card.svelte';
	import Amount from '../Amount.svelte';
	import MobileLink from '../MobileLink.svelte';
	import HorizontalCarousel from '../HorizontalCarousel.svelte';
	import ActionButtonGroup from './ActionButtonGroup.svelte';
	import WidgetHeader from '../WidgetHeader.svelte';

	// Use a permissive type for icons to support Lucide components
	type IconComponent = Component<any> | (new (...args: any[]) => any) | ((...args: any[]) => any);

	export interface Product {
		id: string | number;
		name: string;
		balance: number;
		type: 'checking' | 'savings' | 'investment';
		enabled?: boolean;
	}

	export interface ActionButton {
		label: string;
		icon?: IconComponent;
		onclick?: () => void;
		primary?: boolean;
		tertiary?: boolean;
	}

	interface Props {
		/** Title for the widget */
		title?: string;
		/** Array of products/accounts */
		products: Product[];
		/** Currently selected product index */
		selectedIndex?: number;
		/** Called when selection changes */
		onSelect?: (index: number) => void;
		/** Action buttons to display */
		actions?: ActionButton[];
		/** Base href for product links (adds ?accountIndex=X) */
		linkBase?: string;
		/** Current layout param to preserve in links */
		layoutParam?: string;
		/** Additional classes */
		class?: string;
	}

	let {
		title = undefined,
		products,
		selectedIndex = $bindable(0),
		onSelect,
		actions = [],
		linkBase,
		layoutParam,
		class: className = ''
	}: Props = $props();

	// Theme check
	const isOriginal = $derived($mobileThemeName === 'nn-original');
	const isRebrand = $derived($mobileThemeName === 'rebrand');

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

	// Build link with params
	function buildLink(index: number): string {
		if (!linkBase) return '#';
		const params = new URLSearchParams();
		params.set('accountIndex', index.toString());
		if (layoutParam && layoutParam !== 'default') {
			params.set('layout', layoutParam);
		}
		return `${linkBase}?${params.toString()}`;
	}

	function handleSelect(index: number) {
		selectedIndex = index;
		onSelect?.(index);
	}
</script>

<section class={className}>
	{#if title}
		<WidgetHeader {title} class="mb-3" />
	{/if}

	{#if isOriginal}
		<!-- NN Original: classic variant with single account card + IBAN + gray action bar -->
		{@const product = products[selectedIndex] || products[0]}
		{@const ProductIcon = product ? getProductIcon(product.type) : CreditCard}
		<Card padding="p-0">
			<!-- Account info section -->
			{#if product}
				{#if linkBase}
					<MobileLink
						href={buildLink(selectedIndex)}
						class="flex items-center gap-3 px-4 py-4 active:bg-gray-50 dark:active:bg-gray-800"
					>
						<div class="relative flex h-11 w-11 shrink-0 items-center justify-center">
							<ProductIcon class="h-7 w-7 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
							<div class="absolute -right-0.5 -bottom-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-mediumOrange-500 text-[9px] font-bold text-white ring-[1.5px] ring-white dark:ring-gray-900">
								N
							</div>
						</div>
						<div class="flex min-w-0 flex-1 flex-col gap-0.5">
						<div class="text-base font-normal text-gray-1000 dark:text-white">
							{product.name}
						</div>
						<div class="text-[14px] font-normal text-gray-800 dark:text-gray-400">
							NL31 NNBA 1000 0006 45
						</div>
					</div>
					<Amount
						amount={product.balance}
						size="sm"
						class="text-base !font-bold !text-gray-1000 dark:!text-white"
							showSign={false}
							showSymbol={true}
						/>
					</MobileLink>
				{:else}
					<div class="flex items-center gap-3 px-4 py-4">
						<div class="relative flex h-11 w-11 shrink-0 items-center justify-center">
							<ProductIcon class="h-7 w-7 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
							<div class="absolute -right-0.5 -bottom-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-mediumOrange-500 text-[9px] font-bold text-white ring-[1.5px] ring-white dark:ring-gray-900">
								N
							</div>
						</div>
						<div class="flex min-w-0 flex-1 flex-col gap-0.5">
							<div class="text-base font-normal text-gray-1000 dark:text-white">
								{product.name}
							</div>
							<div class="text-[14px] font-normal text-gray-800 dark:text-gray-400">
								NL31 NNBA 1000 0006 45
							</div>
						</div>
						<Amount
							amount={product.balance}
							size="sm"
							class="text-base !font-bold !text-gray-1000 dark:!text-white"
							showSign={false}
							showSymbol={true}
						/>
					</div>
				{/if}
			{/if}

			<!-- Classic action bar with white background and dividers -->
			{#if actions.length > 0}
				<div class="flex items-stretch border-t border-gray-100 px-2 dark:border-gray-800 dark:bg-gray-900 rounded-b-[4px]">
					{#each actions as action, i}
						{#if !action.tertiary}
							{#if i > 0}
								<div class="flex items-center py-3">
								<div class="h-full w-px bg-gray-100 dark:bg-gray-700"></div>
								</div>
							{/if}
							<button
								type="button"
								onclick={action.onclick}
								class="flex flex-1 flex-col items-center justify-center gap-1 py-3 transition-colors active:bg-gray-100 dark:active:bg-gray-800"
							>
								{#if action.icon}
									{@const ActionIcon = action.icon}
									<ActionIcon class="h-6 w-6 text-mediumOrange-500" strokeWidth={1.5} />
								{/if}
								<span class="text-[14px] text-gray-1000 dark:text-white" style="font-weight: 500;">{action.label}</span>
							</button>
						{/if}
					{/each}
				</div>
			{/if}
		</Card>
	{:else}
		<!-- Improved/Rebrand: integrated variant with products list + actions inside -->
		<Card padding="p-0">
			<!-- Products List (tighter spacing + horizontal dividers) -->
			<div class="flex flex-col divide-y divide-gray-100">
				{#each products as product, i}
					{@const ProductIcon = getProductIcon(product.type)}
					{#if linkBase}
						<MobileLink
							href={buildLink(i)}
							class="flex items-center justify-between px-4 py-3 transition-all active:scale-[0.99] active:bg-gray-50 dark:active:bg-gray-800"
						>
							<div class="flex items-center gap-3">
								<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sand-100 dark:bg-gray-800">
									<ProductIcon
										class="h-5 w-5 text-gray-600 dark:text-gray-400"
										strokeWidth={1.5}
									/>
								</div>
								<span class="truncate text-base font-normal text-gray-1000 dark:text-white">
									{product.name}
								</span>
							</div>
							<div class="flex shrink-0 items-center gap-1">
								<Amount
									amount={product.balance}
									size="md"
									class="font-heading font-semibold !text-gray-1000 dark:!text-gray-200"
									showSign={false}
									showSymbol={true}
								/>
								<ChevronRight class="h-3.5 w-3.5 text-gray-400" strokeWidth={2} />
							</div>
						</MobileLink>
					{:else}
						<button
							type="button"
							onclick={() => handleSelect(i)}
							class="flex items-center justify-between px-4 py-3 transition-all active:scale-[0.99] {selectedIndex === i ? 'bg-black/5 dark:bg-white/10' : ''}"
						>
							<div class="flex items-center gap-3 text-left">
								<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sand-100 dark:bg-gray-800">
									<ProductIcon
										class="h-5 w-5 text-gray-600 dark:text-gray-400"
										strokeWidth={1.5}
									/>
								</div>
								<span class="truncate text-base font-normal text-gray-1000 dark:text-white">
									{product.name}
								</span>
							</div>
							<Amount
								amount={product.balance}
								size="md"
								class="font-heading font-semibold !text-gray-1000 dark:!text-gray-200"
								showSign={false}
								showSymbol={true}
							/>
						</button>
					{/if}
				{/each}
			</div>

			<!-- Integrated Actions -->
			{#if actions.length > 0}
				{#if isOriginal}
					<div class="border-t border-gray-100 p-4 dark:border-gray-800">
						<ActionButtonGroup {actions} />
					</div>
				{/if}
			{/if}
		</Card>

		<!-- For improved/redesign: render actions outside the card so they appear separated -->
		{#if actions.length > 0 && !isOriginal}
			<!-- Improved: actions rendered horizontally, each button fills equal width -->
			<!-- Extra padding at bottom of card area for spacing, then buttons with top margin -->
			{@const actionsWithIndex = actions.map((a, i) => ({ ...a, _homeIndex: i }))}
			<div class="mt-4 pb-2">
				<ActionButtonGroup actions={actionsWithIndex} class="w-full" variant="home" />
			</div>
		{/if}
	{/if}
</section>
