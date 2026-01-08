<script lang="ts">
	import { page } from '$app/stores';
	import { beforeNavigate } from '$app/navigation';
	import { fly } from 'svelte/transition';
	import './mobile.css';
	import TouchSimulator from '$lib/components/mobile/TouchSimulator.svelte';
	import BottomNav from '$lib/components/mobile/BottomNav.svelte';
	import { mobileScrollY } from '$lib/stores/mobileScroll';
	import { mobileNavDirection } from '$lib/stores/mobileNavDirection';
	import { Battery, Signal, Wifi } from 'lucide-svelte';

	import type { LayoutData } from './$types';

	import { onMount } from 'svelte';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	const currentPath = $derived($page.url.pathname);
	function handleScroll(e: Event) {
		const target = e.currentTarget as HTMLElement;
		$mobileScrollY = target.scrollTop;
	}

	const mobileDepthMap: Record<string, number> = {
		'/mobile': 0,
		'/mobile/transactions': 1
	};

	function getDepth(path: string): number {
		return mobileDepthMap[path] ?? path.split('/').filter(Boolean).length;
	}

	// beforeNavigate fires BEFORE the navigation completes
	beforeNavigate((navigation) => {
		const from = navigation.from?.url.pathname || '/mobile';
		const to = navigation.to?.url.pathname || '/mobile';

		// Only handle mobile routes
		if (!to.startsWith('/mobile')) return;

		const fromDepth = getDepth(from);
		const toDepth = getDepth(to);

		const direction = toDepth < fromDepth ? 'back' : 'forward';
		mobileNavDirection.set(direction);
	});

	// Read from store reactively
	const direction = $derived($mobileNavDirection);

	// Get device type from URL
	const device = $derived(
		($page.url.searchParams.get('device') as 'iphone' | 'pixel' | null) ?? 'iphone'
	);
</script>

<TouchSimulator />
<div class="mobile-viewport">
	<div class="mobile-status-bar {device}">
		{#if device === 'iphone'}
			<!-- iPhone: Time Left (or Center for Notch), Icons Right -->
			<!-- Actually iPhone with Dynamic Island is usually: Time Left, Island Center, Icons Right -->
			<div class="flex flex-1 justify-start pl-4 font-bold tracking-wide">9:41</div>
			<div class="flex items-center gap-1.5 pr-2">
				<Signal class="h-4 w-4 fill-current" strokeWidth={0} />
				<Wifi class="h-4 w-4" strokeWidth={2.5} />
				<Battery class="h-5 w-5 fill-black" strokeWidth={1} />
				<!-- iPhone battery usually has filled body -->
			</div>
		{:else}
			<!-- Pixel: Time Left, Icons Right -->
			<div class="flex flex-1 justify-start pl-4 font-bold tracking-wide">9:30</div>
			<div class="flex items-center gap-1.5 pr-2">
				<Wifi class="h-4 w-4" strokeWidth={2.5} />
				<Signal class="h-4 w-4 fill-current" strokeWidth={0} />
				<Battery class="h-5 w-5 rotate-90 fill-current" strokeWidth={0} />
				<!-- Android battery often filled vertical block or solid -->
			</div>
		{/if}
	</div>

	<div class="mobile-content" onscroll={handleScroll}>
		{#key currentPath}
			{#if direction === 'back'}
				<!-- BACK: Slide in from left -->
				<div class="page-container" in:fly|global={{ x: -100, duration: 200 }}>
					{@render children()}
				</div>
			{:else}
				<!-- FORWARD: Slide in from right -->
				<div class="page-container" in:fly|global={{ x: 100, duration: 200 }}>
					{@render children()}
				</div>
			{/if}
		{/key}
	</div>

	<!-- Persistent Bottom Nav -->
	<div class="absolute right-0 bottom-0 left-0 z-50">
		<BottomNav />
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

	.page-container {
		min-height: 100%;
		background-color: #faf9f8;
	}
</style>
