<script lang="ts">
	import { ArrowUp, ArrowDown, Menu } from 'lucide-svelte';

	type ProductType = 'checking' | 'savings' | 'investment';

	interface Props {
		productType: ProductType;
		variant?: 'pill' | 'square';
		showMoreButton?: boolean;
		class?: string;
		onPrimaryAction?: () => void;
		onSecondaryAction?: () => void;
		onMoreAction?: () => void;
	}

	let {
		productType,
		variant = 'pill',
		showMoreButton = true,
		class: className = '',
		onPrimaryAction,
		onSecondaryAction,
		onMoreAction
	}: Props = $props();

	// Get labels based on product type
	const labels = $derived.by(() => {
		switch (productType) {
			case 'savings':
				return { primary: 'Opnemen', secondary: 'Storten' };
			case 'investment':
				return { primary: 'Verkopen', secondary: 'Bijkopen' };
			default:
				return { primary: 'Betalen', secondary: 'Verzoek' };
		}
	});

	// Button styles based on variant
	const buttonClasses = $derived.by(() => {
		const base = 'flex h-10 flex-1 items-center justify-center gap-2 px-4 transition-all active:scale-95';
		
		if (variant === 'pill') {
			return {
				primary: `${base} rounded-full bg-mediumOrange-600 text-white shadow-sm`,
				secondary: `${base} rounded-full bg-white shadow-sm`,
				more: 'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white shadow-sm transition-all active:scale-95'
			};
		}
		
		// Square variant (used in product cards)
		return {
			primary: `${base} rounded-full bg-sand-100 dark:bg-gray-800 active:bg-sand-200 dark:active:bg-gray-700`,
			secondary: `${base} rounded-full bg-sand-100 dark:bg-gray-800 active:bg-sand-200 dark:active:bg-gray-700`,
			more: 'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-sand-100 dark:bg-gray-800 transition-all active:scale-95 active:bg-sand-200 dark:active:bg-gray-700'
		};
	});
</script>

<div class="flex gap-2 {className}">
	<!-- Primary action -->
	<button
		class={buttonClasses.primary}
		onclick={onPrimaryAction}
		aria-label={labels.primary}
	>
		<ArrowUp 
			class="h-4 w-4 {variant === 'pill' ? 'text-white' : 'text-mediumOrange-600'}" 
			strokeWidth={2.5} 
		/>
		<span class="font-heading text-sm font-semibold {variant === 'pill' ? '' : 'text-gray-1000 dark:text-gray-200'}">
			{labels.primary}
		</span>
	</button>

	<!-- Secondary action -->
	<button
		class={buttonClasses.secondary}
		onclick={onSecondaryAction}
		aria-label={labels.secondary}
	>
		<ArrowDown 
			class="h-4 w-4 text-mediumOrange-600" 
			strokeWidth={2.5} 
		/>
		<span class="font-heading text-sm font-semibold text-gray-1000 dark:text-gray-200">
			{labels.secondary}
		</span>
	</button>

	<!-- More button -->
	{#if showMoreButton}
		<button
			class={buttonClasses.more}
			onclick={onMoreAction}
			aria-label="More actions"
		>
			<Menu class="h-4 w-4 {variant === 'pill' ? 'text-gray-500' : 'text-mediumOrange-600'}" strokeWidth={2.5} />
			{#if variant === 'pill'}
				<span class="font-heading text-sm font-semibold text-gray-500">Meer</span>
			{/if}
		</button>
	{/if}
</div>
