<script lang="ts">
	import { page } from '$app/stores';
	import { fly } from 'svelte/transition';
	import './mobile.css';
	import TouchSimulator from '$lib/components/mobile/TouchSimulator.svelte';
	import { mobileScrollY } from '$lib/stores/mobileScroll';

	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	const currentPath = $derived($page.url.pathname);

	function handleScroll(e: Event) {
		const target = e.currentTarget as HTMLElement;
		$mobileScrollY = target.scrollTop;
	}
</script>

<TouchSimulator />
<div class="mobile-viewport">
	<div class="mobile-status-bar">
		<span>9:41</span>
	</div>

	<div class="mobile-content" onscroll={handleScroll}>
		{#key currentPath}
			<div class="page-container" in:fly|global={{ x: 100, duration: 200 }}>
				{@render children()}
			</div>
		{/key}
	</div>
</div>

<style>
	:global(html),
	:global(body) {
		background: #faf9f8;
		padding: 0;
		margin: 0;
		max-width: none;
		overflow: hidden;
		width: 100%;
		height: 100%;
	}

	.page-container {
		min-height: 100%;
		background-color: #faf9f8;
	}
</style>
