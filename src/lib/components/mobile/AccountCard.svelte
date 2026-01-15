<script lang="ts">
	import { CreditCard, PiggyBank, ArrowUpRight, ArrowDownLeft, Menu } from 'lucide-svelte';
	import Amount from '$lib/components/mobile/Amount.svelte';

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

	// Determine border radius based on variant
	const borderRadiusClass = $derived(
		variant === 'original' || variant === 'carousel-buttons' ? 'rounded-lg' : 'rounded-xl'
	);
</script>

<div
	class="dark:bg-gray-1200 {borderRadiusClass} border border-sand-200 dark:border-gray-800 {compact ? 'bg-transparent' : variant === 'original' || variant === 'redesign-huge' || variant === 'carousel-buttons' ? 'bg-white shadow-sm' : 'bg-white px-3 py-2.5 shadow-sm'} {compact ? 'px-3 py-1.5' : ''} {className}"
	style="border-width:1px"
>
	{#if variant === 'original'}
		<!-- Original theme: matches homepage betaalsaldo card with buttons inside -->
		<div class="flex items-center gap-3 px-4 py-4">
			<div class="relative flex h-11 w-11 shrink-0 items-center justify-center">
				{#if type === 'savings'}
					<PiggyBank class="h-7 w-7 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
				{:else}
					<CreditCard class="h-7 w-7 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
				{/if}
				<div class="absolute -right-0.5 -bottom-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-mediumOrange-500 text-[9px] font-bold text-white ring-[1.5px] ring-white dark:ring-gray-900">
					N
				</div>
			</div>
			<div class="flex min-w-0 flex-1 flex-col gap-0.5">
				<div class="text-base font-normal text-gray-1000 dark:text-white">
					{name}
				</div>
				<div class="text-[14px] font-normal text-gray-800 dark:text-gray-400">
					NL31 NNBA 1000 0006 45
				</div>
			</div>
			<Amount
				amount={balance}
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
	{:else if variant === 'carousel-buttons'}
		<!-- Carousel variant with buttons inside, no IBAN (for LayoutA) -->
		<div class="flex items-center gap-3 px-4 py-3">
			<div class="relative flex h-10 w-10 shrink-0 items-center justify-center">
				{#if type === 'savings'}
					<PiggyBank class="h-6 w-6 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
				{:else}
					<CreditCard class="h-6 w-6 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
				{/if}
				{#if isJoint}
					<div class="absolute -right-0.5 -bottom-0.5 flex h-[16px] w-[16px] items-center justify-center rounded-full bg-mediumOrange-500 text-[8px] font-bold text-white ring-[1.5px] ring-white dark:ring-gray-900">
						N
					</div>
				{/if}
			</div>
			<div class="flex min-w-0 flex-1 flex-col">
				<div class="text-sm font-semibold text-gray-1000 dark:text-white">
					{name}
				</div>
			</div>
			<Amount
				amount={balance}
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
				class="flex flex-1 flex-col items-center justify-center gap-1 py-2.5 !bg-white transition-colors active:bg-gray-100 dark:active:bg-gray-800 rounded-bl-md"
			>
				<ArrowUpRight class="h-5 w-5 text-mediumOrange-500" strokeWidth={1.5} />
				<span class="text-[13px] text-gray-1000 dark:text-white" style="font-weight: 500;">Overmaken</span>
			</button>
			<div class="flex items-center py-2.5">
				<div class="h-full w-px bg-gray-100 dark:bg-gray-700"></div>
			</div>
			<button
				type="button"
				class="flex flex-1 flex-col items-center justify-center gap-1 py-2.5 !bg-white transition-colors active:bg-gray-100 dark:active:bg-gray-800"
			>
				<ArrowDownLeft class="h-5 w-5 text-mediumOrange-500" strokeWidth={1.5} />
				<span class="text-[13px] text-gray-1000 dark:text-white" style="font-weight: 500;">Betaalverzoek</span>
			</button>
			<div class="flex items-center py-2.5">
				<div class="h-full w-px bg-gray-100 dark:bg-gray-700"></div>
			</div>
			<button
				type="button"
				class="flex flex-1 flex-col items-center justify-center gap-1 py-2.5 !bg-white transition-colors active:bg-gray-100 dark:active:bg-gray-800 rounded-br-md"
			>
				<Menu class="h-5 w-5 text-mediumOrange-500" strokeWidth={1.5} />
				<span class="text-[13px] text-gray-1000 dark:text-white" style="font-weight: 500;">Meer</span>
			</button>
		</div>
	{:else if variant === 'redesign-huge'}
		<!-- Redesign theme: huge amount display, no buttons in card -->
		<div class="px-4 py-4">
			<div class="mb-1 flex items-center gap-2">
				{#if type === 'savings'}
					<PiggyBank class="h-5 w-5 text-gray-500 dark:text-gray-400" strokeWidth={1.5} />
				{:else}
					<CreditCard class="h-5 w-5 text-gray-500 dark:text-gray-400" strokeWidth={1.5} />
				{/if}
				<span class="text-sm text-gray-600 dark:text-gray-400">{name}</span>
			</div>
			<div class="flex items-baseline gap-1">
				<span class="font-heading text-4xl font-bold text-gray-900 dark:text-white">€</span>
				<Amount amount={balance} size="huge" showSign={false} class="font-heading !text-gray-900 dark:!text-white" />
			</div>
			<div class="mt-1 text-sm text-gray-500 dark:text-gray-400">
				NL31 NNBA 1000 0006 45
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
