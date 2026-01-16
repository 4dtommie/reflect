<script lang="ts">
	import { CreditCard, PiggyBank, ArrowUpRight, ArrowDownLeft, ArrowUp, ArrowDown, Menu } from 'lucide-svelte';
	import Amount from '$lib/components/mobile/Amount.svelte';
	import { mobileThemeName } from '$lib/stores/mobileTheme';

	interface Props {
		name: string;
		balance: number;
		class?: string;
		type?: 'checking' | 'savings' | 'investment';
		isJoint?: boolean;
		compact?: boolean;
		amountSize?: 'sm' | 'md' | 'lg' | 'huge';
		/** Variant to match homepage card layout */
		variant?: 'default' | 'homepage' | 'original' | 'redesign-huge' | 'carousel-buttons';
		showButtons?: boolean;
	}

	let {
		name,
		balance,
		class: className = '',
		type = 'checking',
		compact = false,
		showButtons = false,
		isJoint = false,
		amountSize = undefined,
		variant = 'default'
	}: Props = $props();

	// Theme check
	const isRebrand = $derived($mobileThemeName === 'rebrand');

	// Determine border radius based on variant
	const borderRadiusClass = $derived(
		variant === 'original' || variant === 'carousel-buttons' ? 'rounded-lg' : 'rounded-xl'
	);

	// Background class - glassy for rebrand, white for others
	const bgClass = $derived.by(() => {
		if (compact) return 'bg-transparent';
		if (isRebrand) return 'card-glassy';
		return 'bg-white shadow-sm';
	});
</script>

<div
	class="relative dark:bg-gray-1200 {borderRadiusClass} border border-sand-200 dark:border-gray-800 {bgClass} {compact ? 'px-3 py-1.5' : ''} {className}"
	style="border-width:1px"
>
	{#if variant === 'original'}
		<!-- Original theme: matches homepage betaalsaldo card with buttons inside -->
		<div class="px-4 pt-4 pb-3">
			<!-- Account name at top with card icon in top right -->
			<div class="flex items-start justify-between mb-1">
				<span class="text-base font-normal text-gray-1000 dark:text-white">
					{name}
				</span>
				<div class="flex h-8 w-8 shrink-0 items-center justify-center">
					{#if type === 'savings'}
						<PiggyBank class="h-6 w-6 text-gray-500 dark:text-gray-400" strokeWidth={1.5} />
					{:else}
						<CreditCard class="h-6 w-6 text-gray-500 dark:text-gray-400" strokeWidth={1.5} />
					{/if}
				</div>
			</div>
			<!-- Huge amount below -->
			<div class="flex items-baseline gap-1">
				<span class="font-heading text-4xl font-bold text-gray-900 dark:text-white">€</span>
				<Amount amount={balance} size="huge" showSign={false} class="font-heading !text-gray-900 dark:!text-white" />
			</div>
			<div class="mt-1 text-sm text-gray-500 dark:text-gray-400">
				NL31 NNBA 1000 0006 45
			</div>
		</div>

		<!-- Action buttons bar with vertical dividers -->
		<div class="flex items-stretch border-t border-gray-100 px-2 dark:border-gray-800 {isRebrand ? 'bg-transparent' : 'bg-white'} rounded-b-md">
			<button
				type="button"
				class="flex flex-1 flex-col items-center justify-center gap-1 py-3 {isRebrand ? 'bg-transparent active:bg-white/20' : 'bg-white active:bg-gray-100 dark:active:bg-gray-800'} transition-colors rounded-bl-md"
			>
				<ArrowUpRight class="h-6 w-6 text-mediumOrange-500" strokeWidth={1.5} />
				<span class="text-[14px] text-gray-1000 dark:text-white" style="font-weight: 500;">Overmaken</span>
			</button>
			<div class="flex items-center py-3">
				<div class="h-full w-px bg-gray-100 dark:bg-gray-700"></div>
			</div>
			<button
				type="button"
				class="flex flex-1 flex-col items-center justify-center gap-1 py-3 {isRebrand ? 'bg-transparent active:bg-white/20' : 'bg-white active:bg-gray-100 dark:active:bg-gray-800'} transition-colors"
			>
				<ArrowDownLeft class="h-6 w-6 text-mediumOrange-500" strokeWidth={1.5} />
				<span class="text-[14px] text-gray-1000 dark:text-white" style="font-weight: 500;">Betaalverzoek</span>
			</button>
			<div class="flex items-center py-3">
				<div class="h-full w-px bg-gray-100 dark:bg-gray-700"></div>
			</div>
			<button
				type="button"
				class="flex flex-1 flex-col items-center justify-center gap-1 py-3 {isRebrand ? 'bg-transparent active:bg-white/20' : 'bg-white active:bg-gray-100 dark:active:bg-gray-800'} transition-colors rounded-br-md"
			>
				<Menu class="h-6 w-6 text-mediumOrange-500" strokeWidth={1.5} />
				<span class="text-[14px] text-gray-1000 dark:text-white" style="font-weight: 500;">Meer</span>
			</button>
		</div>
	{:else if variant === 'carousel-buttons'}
		<!-- Carousel variant with buttons inside, no IBAN (for LayoutA) -->
		<!-- Carousel: icon moved to top-right, remove joint badge here -->
		{#if variant === 'carousel-buttons'}
			<div class="absolute top-3 right-3 flex h-9 w-9 items-center justify-center">
				{#if type === 'savings'}
					<PiggyBank class="h-6 w-6 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
				{:else}
					<CreditCard class="h-6 w-6 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
				{/if}
			</div>
			<div class="flex items-center gap-3 px-4 py-3">
				<div class="flex min-w-0 flex-1 flex-col">
					<div class="text-sm font-normal text-gray-1000 dark:text-white">
						{name}
					</div>
					<div class="mt-0.5">
						<Amount
							amount={balance}
							size="huge"
							class="font-heading font-bold !text-gray-1000 dark:!text-white"
							showSign={false}
							showSymbol={true}
						/>
					</div>
				</div>
			</div>
		{/if}

		<!-- Action buttons bar with vertical dividers -->
		<div class="flex items-stretch border-t border-gray-100 px-2 dark:border-gray-800 {isRebrand ? 'bg-transparent' : 'bg-white'} rounded-b-md">
			<button
				type="button"
				class="flex flex-1 flex-col items-center justify-center gap-1 py-2.5 {isRebrand ? 'bg-transparent active:bg-white/20' : 'bg-white active:bg-gray-100 dark:active:bg-gray-800'} transition-colors rounded-bl-md"
			>
					<ArrowUp class="h-5 w-5 text-mediumOrange-500" strokeWidth={1.5} />
					<span class="text-[13px] text-gray-1000 dark:text-white" style="font-weight: 500;">Betalen</span>
			</button>
			<div class="flex items-center py-2.5">
				<div class="h-full w-px bg-gray-100 dark:bg-gray-700"></div>
			</div>
			<button
				type="button"
				class="flex flex-1 flex-col items-center justify-center gap-1 py-2.5 {isRebrand ? 'bg-transparent active:bg-white/20' : 'bg-white active:bg-gray-100 dark:active:bg-gray-800'} transition-colors"
			>
				<ArrowDown class="h-5 w-5 text-mediumOrange-500" strokeWidth={1.5} />
				<span class="text-[13px] text-gray-1000 dark:text-white" style="font-weight: 500;">Verzoek</span>
			</button>
			<div class="flex items-center py-2.5">
				<div class="h-full w-px bg-gray-100 dark:bg-gray-700"></div>
			</div>
			<button
				type="button"
				class="flex flex-1 flex-col items-center justify-center gap-1 py-2.5 {isRebrand ? 'bg-transparent active:bg-white/20' : 'bg-white active:bg-gray-100 dark:active:bg-gray-800'} transition-colors rounded-br-md"
			>
				<Menu class="h-5 w-5 text-mediumOrange-500" strokeWidth={1.5} />
				<span class="text-[13px] text-gray-1000 dark:text-white" style="font-weight: 500;">Meer</span>
			</button>
		</div>
	{:else if variant === 'redesign-huge'}
		<!-- Redesign theme: huge amount display, no buttons in card -->
		<div class="px-4 pt-4 pb-3">
			<!-- Account name at top with card icon in top right -->
			<div class="flex items-start justify-between mb-0.5">
				<span class="text-base font-normal text-gray-1000 dark:text-white">
					{name}
				</span>
				<div class="flex h-8 w-8 shrink-0 items-center justify-center">
					{#if type === 'savings'}
						<PiggyBank class="h-6 w-6 text-gray-500 dark:text-gray-400" strokeWidth={1.5} />
					{:else}
						<CreditCard class="h-6 w-6 text-gray-500 dark:text-gray-400" strokeWidth={1.5} />
					{/if}
				</div>
			</div>
			<!-- Huge amount below -->
			<div class="flex items-baseline gap-0.5">
				<Amount amount={balance} size="huge" showSign={false} showSymbol={true} class="font-heading !text-gray-900 dark:!text-white" />
			</div>
		</div>
	{:else if variant === 'homepage'}
		<div class="flex items-center gap-3 px-3 py-3">
			<div class="relative flex h-9 w-9 shrink-0 items-center justify-center">
				{#if type === 'savings'}
					<PiggyBank class="h-6 w-6 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
				{:else}
					<CreditCard class="h-6 w-6 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
				{/if}
				{#if isJoint}
					<div class="absolute -right-0.5 -bottom-0.5 flex h-[16px] w-[16px] items-center justify-center rounded-full bg-mediumOrange-500 text-[9px] font-bold text-white ring-[1.5px] ring-white dark:ring-gray-900">N</div>
				{/if}
			</div>

			<div class="flex min-w-0 flex-1 flex-col gap-0.5">
				<div class="text-sm font-semibold text-gray-900 dark:text-white">{name}</div>
				<div class="text-sm font-normal text-gray-700 dark:text-gray-400 leading-5">NL31 NNBA 1000 0006 45</div>
			</div>

			<div class="flex-shrink-0 pl-2">
				<Amount amount={balance} size={amountSize ? amountSize : (compact ? 'sm' : 'lg')} showSign={false} showSymbol={true} class="!font-heading !text-gray-900 dark:!text-white" />
			</div>
		</div>
	{:else}
		<div class="mb-0 flex min-h-8 items-center justify-between px-3">
			<span class="font-heading {compact ? 'text-xs' : 'text-sm'} font-medium text-gray-800 dark:text-gray-400">{name}</span>
			{#if isJoint}
				<span class="rounded-full bg-sand-100 px-2 py-0.5 text-xs font-semibold text-gray-1000">Gezamenlijk</span>
			{/if}
		</div>

		<div class="{compact ? 'mt-0.5 mb-1' : '-mt-1 mb-2'} flex items-baseline gap-1.5 px-3">
			<span class="font-heading font-bold text-gray-1000 dark:text-white" style="font-size: {compact ? '14px' : '30px'}">€</span>
			<Amount amount={balance} size={amountSize ? amountSize : (compact ? 'sm' : 'lg')} showSign={false} class="font-heading !text-gray-1000 dark:!text-white" />
		</div>
	{/if}
</div>

<style>
	.card-glassy {
		background: rgba(255, 255, 255, 0.75);
		backdrop-filter: blur(20px) saturate(1.8);
		-webkit-backdrop-filter: blur(20px) saturate(1.8);
		border: 1px solid rgba(255, 255, 255, 0.6);
		box-shadow: 0 2px 16px rgba(0, 0, 0, 0.04);
	}

	:global(.dark) .card-glassy {
		background: rgba(30, 30, 30, 0.5);
		border: 1px solid rgba(255, 255, 255, 0.08);
	}
</style>