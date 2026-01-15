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
		// Mobile design variant: 'original' shows date + time subline, 'redesign' shows category/subtitle
		designVariant?: 'original' | 'redesign';
		// Optional extra data used for original variant
		date?: string;
		description?: string;
		// Badge text for expected items (e.g., "3 dagen")
		expectedBadge?: string;
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
		class: className = '',
		designVariant = 'redesign',
		date = undefined,
		description = undefined,
		expectedBadge = undefined
	}: Props = $props();

	// Icon mapping - shared across design system
	export const categoryIconMap: Record<string, typeof Icon> = {
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

	export function getCategoryIcon(iconName: string | null) {
		if (!iconName) return CreditCard;
		return categoryIconMap[iconName] || CreditCard;
	}

	// Extract time (HH:MM) from text (description or subtitle). Fallback to date.
	function extractTimeFromText(desc?: string, d?: string) {
		if (desc) {
			const match = desc.match(/(\b[0-2]?\d:[0-5]\d\b)/);
			if (match) return match[1];
		}
		if (d) {
			const dt = new Date(d);
			if (!isNaN(dt.getTime())) return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		}
		return '';
	}
</script>

<!--
	TransactionItem - displays a single transaction row
	This is a presentation component - wrap in ListItem or MobileLink for interactivity
-->
<div class="flex items-center {className}">
	<div class="flex min-w-0 flex-1 items-center gap-3">
		{#if useLogo}
			<MerchantLogo merchantName={merchant} {categoryIcon} size="xs" />
		{:else}
			{@const IconComponent = getCategoryIcon(categoryIcon)}
			<IconComponent
				class="h-6 w-6 flex-shrink-0 text-gray-1000 dark:text-white"
				strokeWidth={1.0}
			/>
		{/if}
		<div class="flex min-w-0 flex-col pr-4">
			<div
				class="flex items-center gap-2 {compact
					? 'text-sm'
					: 'text-base'}"
			>
				<span class="truncate font-normal text-gray-1000 dark:text-white">{merchant}</span>
				{#if expectedBadge}
					<span class="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">{expectedBadge}</span>
				{/if}
			</div>
			{#if showSubtitle}
				{#if designVariant === 'original'}
					<div class="truncate text-xs font-normal text-gray-800 dark:text-gray-400">
						{date ? new Date(date).toLocaleDateString() : ''}
						{#if extractTimeFromText(description, date)}
							<span class="mx-1">·</span>
							<span>{extractTimeFromText(description, date)}</span>
						{/if}
					</div>
				{:else}
					<div class="truncate text-sm font-normal text-gray-800 dark:text-gray-400">
						{subtitle}
					</div>
				{/if}
			{/if}
		</div>
	</div>
	<div class="ml-auto flex shrink-0 items-center gap-1 text-right">
		<div
			class={isDebit === false
				? 'rounded-[10px] bg-green-100 px-2 py-1 dark:bg-green-900/30'
				: ''}
		>
			<Amount
				{amount}
				size={compact ? 'sm' : 'md'}
				flat={compact}
				class={fontHeading
					? 'font-heading'
					: '' + (isDebit === false ? ' !text-green-800 dark:!text-green-400' : '')}
			/>
		</div>
		{#if showChevron}
			<ChevronRight class="h-3.5 w-3.5 text-gray-400" strokeWidth={2} />
		{/if}
	</div>
</div>
