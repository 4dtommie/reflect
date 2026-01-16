<script lang="ts">
	import { page } from '$app/stores';
	import { afterNavigate } from '$app/navigation';
	import { fly } from 'svelte/transition';
	import './mobile.css';
	import TouchSimulator from '$lib/components/mobile/TouchSimulator.svelte';
	import BottomNav from '$lib/components/mobile/BottomNav.svelte';
	import BlobBackground from '$lib/components/mobile/BlobBackground.svelte';
	import ScrollDebugger from '$lib/components/dev/ScrollDebugger.svelte';
	import { mobileScrollY } from '$lib/stores/mobileScroll';
	import { mobileNavDirection } from '$lib/stores/mobileNavDirection';
	import { shouldAnimateNavigation } from '$lib/stores/mobileNavAnimation';
	import { mobileThemeName, type ThemeName } from '$lib/stores/mobileTheme';
	import { mobileStatusBarColor, hideGlobalStatusBar } from '$lib/stores/mobileStatusBarColor';
	import { Battery, Signal, Wifi } from 'lucide-svelte';
	import { tick } from 'svelte';

	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	const currentPath = $derived($page.url.pathname);

	// Theme checks (needed early for status bar bg)
	const isOriginal = $derived($mobileThemeName === 'nn-original');
	const isRebrand = $derived($mobileThemeName === 'rebrand');

	// Determine header background color based on route or store override
	// Homepage and product-details use sand-50 (lighter) for original theme
	// Other pages use sand-100 (darker) for original theme
	// Rebrand theme uses transparent for all pages
	const isHomepage = $derived(currentPath === '/mobile' || currentPath === '/mobile/');
	const isProductDetails = $derived(currentPath.startsWith('/mobile/product-details'));
	const defaultStatusBarBg = $derived.by(() => {
		if (isRebrand) return 'transparent';
		// Use sand-50 for homepage and product-details in original theme
		return (isHomepage || (isOriginal && isProductDetails))
			? 'rgba(250, 249, 248, 0.85)' // sand-50
			: 'rgba(243, 239, 237, 0.85)'; // sand-100
	});
	// Use store override if set, otherwise use default
	const statusBarBg = $derived($mobileStatusBarColor || defaultStatusBarBg);

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
		// Only reset the scroll store for forward navigations. For back navigations
		// we want to preserve the value (saved earlier) so the destination page
		// can restore the scroll position from `scrollPositions`.
		if ($mobileNavDirection !== 'back') {
			$mobileScrollY = 0;
		}

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
		if (designTheme === 'nn-original' || designTheme === 'improved' || designTheme === 'rebrand') {
			mobileThemeName.set(designTheme);
			// Set DaisyUI theme based on design theme (rebrand uses same base as improved)
			const daisyTheme = designTheme === 'nn-original' ? 'nn-theme' : 'nn-improved';
			document.documentElement.setAttribute('data-daisyui-theme', daisyTheme);
		}
	});

	// Re-check scroll when children change
	$effect(() => {
		children;
		tick().then(checkScroll);
	});

	// Enable dev scroll debugger when query param is present
	const showScrollDebugger = $derived($page.url.searchParams.get('devScrollDebug') === 'true');
</script>

<TouchSimulator />
<div class="mobile-viewport" class:rebrand-viewport={isRebrand}>
	<!-- Animated rotating blobs background (rebrand theme only, all pages) -->
	<BlobBackground />

	{#if !$hideGlobalStatusBar}
	<div class="mobile-status-bar {device}" style="background: {statusBarBg};">
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
	{/if}

	<div class="mobile-content" onscroll={handleScroll} bind:this={contentEl}>
		{#key currentPath}
			<div
				class="page-container dark:bg-gray-1300 {isRebrand ? 'bg-transparent' : 'bg-sand-50'}"
				style="position: relative; z-index: 1;"
				in:fly|global={{ x: shouldAnimate ? flyX : 0, duration: shouldAnimate ? 200 : 0 }}
			>
				{@render children()}
			</div>
		{/key}
	</div>

	{#if showScrollDebugger}
		<ScrollDebugger />
	{/if}

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

	/* Make viewport transparent for rebrand theme so blobs show through */
	.rebrand-viewport {
		background-color: transparent !important;
	}

	.rebrand-viewport .mobile-content {
		background-color: transparent !important;
	}
</style>
