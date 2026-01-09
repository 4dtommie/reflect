<script lang="ts">
	import Amount from '$lib/components/mobile/Amount.svelte';
	import {
		CreditCard,
		Briefcase,
		FileText,
		DollarSign,
		ShoppingBag,
		Utensils,
		Car,
		Palette,
		Home,
		Coffee,
		Sandwich,
		Wine,
		Fuel,
		Train,
		Wrench,
		Shirt,
		Smartphone,
		Zap,
		Wifi,
		Heart,
		Film,
		Dumbbell,
		BookOpen,
		GraduationCap,
		Ticket,
		Plane,
		Shield,
		Wallet,
		HeartHandshake,
		Sparkles,
		Bike,
		ChevronRight,
		type Icon
	} from 'lucide-svelte';

	import MerchantLogo from '$lib/components/MerchantLogo.svelte';

	interface Props {
		merchant: string;
		subtitle: string;
		amount: number;
		isDebit: boolean;
		categoryIcon: string | null;
		compact?: boolean; // If true, subtitle is smaller (text-xs) vs text-sm
		fontHeading?: boolean; // If true, amount uses heading font
		useLogo?: boolean; // If true, attempts to show merchant logo
		showSubtitle?: boolean; // If false, hides the subtitle
		showChevron?: boolean; // If true, shows a chevron at the end
		class?: string;
	}

	let {
		merchant,
		subtitle,
		amount,
		isDebit,
		categoryIcon,
		compact = false,
		fontHeading = false,
		useLogo = false,
		showSubtitle = true,
		showChevron = false,
		class: className = ''
	}: Props = $props();

	// Icon mapping (keep existing map)
	const iconMap: Record<string, typeof Icon> = {
		Briefcase,
		FileText,
		DollarSign,
		ShoppingCart: ShoppingBag,
		Utensils,
		Car,
		ShoppingBag,
		Palette,
		Home,
		Coffee,
		Sandwich,
		Wine,
		Fuel,
		Train,
		Wrench,
		Taxi: Car,
		Shirt,
		Smartphone,
		Zap,
		Wifi,
		Heart,
		Film,
		Dumbbell,
		BookOpen,
		GraduationCap,
		Ticket,
		Plane,
		Shield,
		Wallet,
		HeartHandshake,
		Sparkles,
		CreditCard,
		Bike
	};

	function getCategoryIcon(iconName: string | null) {
		if (!iconName) return CreditCard;
		return iconMap[iconName] || CreditCard;
	}
</script>

<div class="flex items-center {className}">
	<div class="flex min-w-0 flex-1 items-center gap-3">
		{#if useLogo}
			<MerchantLogo merchantName={merchant} {categoryIcon} size="xs" />
		{:else}
			<svelte:component
				this={getCategoryIcon(categoryIcon)}
				class="h-6 w-6 flex-shrink-0 text-gray-900 dark:text-white"
				strokeWidth={1.0}
			/>
		{/if}
		<div class="flex min-w-0 flex-col pr-4">
			<div
				class="truncate font-normal text-gray-900 dark:text-white {compact
					? 'text-sm'
					: 'text-base'}"
			>
				{merchant}
			</div>
			{#if showSubtitle}
				<div class="truncate text-sm font-normal text-gray-600 dark:text-gray-400">
					{subtitle}
				</div>
			{/if}
		</div>
	</div>
	<div
		class="ml-auto flex shrink-0 items-center {isDebit === false
			? 'rounded-[10px] bg-green-100 px-2 py-1 dark:bg-green-900/30'
			: ''}"
	>
		<Amount
			{amount}
			size={compact ? 'sm' : 'md'}
			flat={compact}
			class={fontHeading
				? 'font-heading'
				: '' + (isDebit === false ? ' !text-green-800 dark:!text-green-400' : '')}
		/>
		{#if showChevron}
			<ChevronRight class="ml-1 h-3.5 w-3.5 text-gray-400" strokeWidth={2} />
		{/if}
	</div>
</div>
