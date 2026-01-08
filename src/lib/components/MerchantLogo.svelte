<script lang="ts">
	import { getMerchantLogoUrl } from '$lib/utils/merchantLogos';
	import * as LucideIcons from 'lucide-svelte';

	interface Props {
		merchantName: string;
		categoryIcon?: string | null;
		categoryColor?: string | null;
		size?: 'xs' | 'sm' | 'md' | 'lg';
	}

	let { merchantName, categoryIcon = null, categoryColor = null, size = 'md' }: Props = $props();

	// Size configurations
	const sizeConfig = {
		xs: { container: 'w-6 h-6', icon: 12, text: 'text-[8px]' },
		sm: { container: 'w-8 h-8', icon: 14, text: 'text-[10px]' },
		md: { container: 'w-10 h-10', icon: 18, text: 'text-xs' },
		lg: { container: 'w-12 h-12', icon: 24, text: 'text-sm' }
	};

	const logoUrl = $derived.by(() => {
		const url = getMerchantLogoUrl(merchantName, 128);

		return url;
	});
	const config = $derived(sizeConfig[size]);

	// Track if logo fails to load
	let logoError = $state(false);

	// Get the category icon component
	const CategoryIcon = $derived.by(() => {
		if (!categoryIcon) return LucideIcons.ShoppingCart;
		const icon = (LucideIcons as any)[categoryIcon];
		return icon || LucideIcons.ShoppingCart;
	});

	// Generate a consistent background color from category color or merchant name
	const backgroundColor = $derived.by(() => {
		if (categoryColor) return categoryColor;
		// Generate color from merchant name hash
		let hash = 0;
		for (let i = 0; i < merchantName.length; i++) {
			hash = merchantName.charCodeAt(i) + ((hash << 5) - hash);
		}
		const hue = hash % 360;
		return `hsl(${hue}, 45%, 65%)`;
	});

	// Get initials for fallback (first letter or first two letters of two words)
	const initials = $derived.by(() => {
		const words = merchantName.trim().split(/\s+/);
		if (words.length >= 2) {
			return (words[0][0] + words[1][0]).toUpperCase();
		}
		return merchantName.substring(0, 2).toUpperCase();
	});

	function handleLogoError() {
		logoError = true;
	}

	// Reset error state when merchant changes
	$effect(() => {
		merchantName; // Track dependency
		logoError = false;
	});
</script>

<div
	class="flex flex-shrink-0 items-center justify-center overflow-hidden rounded {config.container}"
	style="background-color: {backgroundColor}20"
>
	{#if logoUrl && !logoError}
		<img
			src={logoUrl}
			alt="{merchantName} logo"
			class="h-full w-full object-cover"
			onerror={handleLogoError}
			loading="lazy"
		/>
	{:else if categoryIcon}
		{@const Icon = CategoryIcon}
		<Icon size={config.icon} style="color: {backgroundColor}" />
	{:else}
		<span class="font-semibold {config.text}" style="color: {backgroundColor}">
			{initials}
		</span>
	{/if}
</div>
