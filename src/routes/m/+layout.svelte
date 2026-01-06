<script lang="ts">
	import { page } from '$app/stores';
	import './mobile.css';
	import TouchSimulator from '$lib/components/mobile/TouchSimulator.svelte';
	import { mobileScrollY } from '$lib/stores/mobileScroll';

	let { children } = $props();

	// Check if loaded in embed mode (for iframe)
	const isEmbed = $derived($page.url.searchParams.get('embed') === 'true');

	function handleScroll(e: Event) {
		const target = e.currentTarget as HTMLElement;
		$mobileScrollY = target.scrollTop;
	}
</script>

{#if isEmbed}
	<div class="mobile-viewport embed-mode">
		<div class="mobile-status-bar">
			<span>9:41</span>
		</div>

		<div class="mobile-content flex min-h-screen flex-col bg-sand-50" onscroll={handleScroll}>
			{@render children()}
		</div>
	</div>
{:else}
	<!-- Standalone mode: with nice wrapper -->
	<div class="mobile-page">
		<TouchSimulator />
		<div class="mobile-viewport cursor-none" data-theme="nn-theme">
			<div class="mobile-status-bar">
				<span>9:41</span>
			</div>
			<div
				class="mobile-content scrollbar-hide cursor-none bg-sand-50 select-none"
				onscroll={handleScroll}
			>
				{@render children()}
			</div>
		</div>
	</div>
{/if}

<style>
	/* Override root layout styles for /m */
	:global(html),
	:global(body) {
		background: #1e293b;
		padding: 0;
		margin: 0;
		max-width: none;
	}

	.mobile-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
		padding: 2rem;
	}

	/* Standalone styling - border and shadow for /m page only */
	.mobile-page :global(.mobile-viewport) {
		border-radius: 40px;
		box-shadow:
			0 25px 50px -12px rgba(0, 0, 0, 0.5),
			0 0 0 1px rgba(255, 255, 255, 0.1);
	}

	/* Hide scrollbar for Chrome, Safari and Opera */
	:global(.scrollbar-hide::-webkit-scrollbar) {
		display: none;
	}

	/* Hide scrollbar for IE, Edge and Firefox */
	:global(.scrollbar-hide) {
		-ms-overflow-style: none; /* IE and Edge */
		scrollbar-width: none; /* Firefox */
	}
</style>
