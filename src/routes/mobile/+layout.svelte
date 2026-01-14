<script lang="ts">
	import { page } from '$app/stores';
	import { afterNavigate } from '$app/navigation';
	import { fly } from 'svelte/transition';
	import './mobile.css';
	import TouchSimulator from '$lib/components/mobile/TouchSimulator.svelte';
	import BottomNav from '$lib/components/mobile/BottomNav.svelte';
	import { mobileScrollY } from '$lib/stores/mobileScroll';
	import { mobileNavDirection } from '$lib/stores/mobileNavDirection';
	import { shouldAnimateNavigation } from '$lib/stores/mobileNavAnimation';
	import { mobileThemeName } from '$lib/stores/mobileTheme';
	import { getThemeConfig, type ThemeName } from '$lib/theme/themeConfig';
	import { Battery, Signal, Wifi } from 'lucide-svelte';
	import { tick } from 'svelte';

	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	const currentPath = $derived($page.url.pathname);

	let isAtBottom = $state(true);
	let contentEl: HTMLElement | undefined = $state();

	function checkScroll() {
		if (!contentEl) return;
		const { scrollTop, scrollHeight, clientHeight } = contentEl;
		// Use a 2px epsilon to handle fractional pixels
		isAtBottom = scrollTop + clientHeight >= scrollHeight - 2;
	}

	function handleScroll() {
		if (!contentEl) return;
		$mobileScrollY = contentEl.scrollTop;
		checkScroll();
	}

	// Get device type from URL
	const device = $derived(
		($page.url.searchParams.get('device') as 'iphone' | 'pixel' | null) ?? 'iphone'
	);

	// Read animation values directly from stores (set by MobileLink before navigation)
	const shouldAnimate = $derived($shouldAnimateNavigation);
	const direction = $derived($mobileNavDirection);
	const flyX = $derived(direction === 'back' ? -100 : 100);

	// Reset animation flag after navigation completes
	afterNavigate(async () => {
		// Reset scroll position store immediately on navigation
		$mobileScrollY = 0;
		
		// Small delay to ensure transition has started
		setTimeout(() => {
			shouldAnimateNavigation.set(false);
		}, 50);

		// Re-check scroll after DOM updates
		await tick();
		checkScroll();
	});

	// Sync light/dark theme from URL
	$effect(() => {
		const theme = $page.url.searchParams.get('theme');
		if (theme === 'nn-night') {
			document.documentElement.setAttribute('data-theme', 'nn-night');
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.setAttribute('data-theme', 'nn-theme');
			document.documentElement.classList.remove('dark');
		}
	});

	// Sync design theme from URL to store
	$effect(() => {
		const designTheme = $page.url.searchParams.get('designTheme') as ThemeName | null;
		if (designTheme === 'nn-original' || designTheme === 'improved') {
			mobileThemeName.set(designTheme);
			// Also set the DaisyUI theme for components
			const config = getThemeConfig(designTheme);
			document.documentElement.setAttribute('data-daisyui-theme', config.daisyTheme);
		}
	});

	// Re-check scroll when children change
	$effect(() => {
		children;
		tick().then(checkScroll);
	});
</script>

<TouchSimulator />
<div class="mobile-viewport">
	<div class="mobile-status-bar {device}">
		{#if device === 'iphone'}
			<div class="flex flex-1 justify-start pl-4 font-bold tracking-wide">9:41</div>
			<div class="flex items-center gap-1.5 pr-2">
				<Signal class="h-4 w-4 fill-current" strokeWidth={0} />
				<Wifi class="h-4 w-4" strokeWidth={2.5} />
				<Battery class="h-5 w-5 fill-black dark:fill-white" strokeWidth={1} />
			</div>
		{:else}
			<div class="flex flex-1 justify-start pl-4 font-bold tracking-wide">9:30</div>
			<div class="flex items-center gap-1.5 pr-2 dark:text-white">
				<Wifi class="h-4 w-4" strokeWidth={2.5} />
				<Signal class="h-4 w-4 fill-current" strokeWidth={0} />
				<Battery class="h-5 w-5 rotate-90 fill-current" strokeWidth={0} />
			</div>
		{/if}
	</div>

	<div class="mobile-content" onscroll={handleScroll} bind:this={contentEl}>
		{#key currentPath}
			<div
				class="page-container dark:bg-gray-1300 bg-sand-50"
				in:fly|global={{ x: shouldAnimate ? flyX : 0, duration: shouldAnimate ? 200 : 0 }}
			>
				{@render children()}
			</div>
		{/key}
	</div>

	<div class="bottom-nav-wrapper">
		<BottomNav {isAtBottom} />
	</div>

	<!-- iOS Home Indicator - stays at bottom center in both orientations -->
	<div class="home-indicator-fixed">
		<div class="home-indicator-bar"></div>
	</div>
</div>

<style>
	:global(html),
	:global(body) {
		background: #faf9f8 !important;
		padding: 0 !important;
		margin: 0 !important;
		max-width: none !important;
		overflow: hidden !important;
		width: 100% !important;
		height: 100% !important;
	}

	:global(html.dark),
	:global(html.dark body) {
		background: #0a0a0a !important;
	}

	.page-container {
		min-height: 100%;
	}
</style>
