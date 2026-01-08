<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		/** Show position indicator dots */
		showIndicators?: boolean;
		/** Number of items (needed for indicators) */
		itemCount?: number;
		/** Card width in pixels */
		cardWidth?: number;
		/** Gap between cards in pixels */
		gap?: number;
		/** Class for outer container */
		class?: string;
		/** Children slot */
		children: Snippet;
	}

	let {
		showIndicators = false,
		itemCount = 0,
		cardWidth = 280,
		gap = 12,
		class: className = '',
		children
	}: Props = $props();

	let scrollContainer: HTMLElement;
	let currentIndex = $state(0);

	function handleScroll() {
		if (!scrollContainer) return;
		// Calculate which card is most visible based on scroll position
		const scrollLeft = scrollContainer.scrollLeft;
		const itemWidth = cardWidth + gap;
		currentIndex = Math.round(scrollLeft / itemWidth);
	}

	function scrollToIndex(index: number) {
		if (!scrollContainer) return;
		const itemWidth = cardWidth + gap;
		scrollContainer.scrollTo({
			left: index * itemWidth,
			behavior: 'smooth'
		});
	}
</script>

<div class="carousel-wrapper {className}">
	<!-- Scrollable area -->
	<div
		class="carousel-scroll"
		bind:this={scrollContainer}
		onscroll={handleScroll}
		style="--card-width: {cardWidth}px; --gap: {gap}px;"
	>
		{@render children()}
		<!-- End spacer for last card to scroll fully -->
		<div class="end-spacer"></div>
	</div>

	<!-- Position indicators -->
	{#if showIndicators && itemCount > 1}
		<div class="flex justify-center gap-2 pt-3 pb-3">
			{#each Array(itemCount) as _, i}
				<button
					class="indicator-dot {currentIndex === i ? 'active' : ''}"
					onclick={() => scrollToIndex(i)}
					aria-label="Go to slide {i + 1}"
				></button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.carousel-wrapper {
		width: 100%;
	}

	.carousel-scroll {
		display: flex;
		align-items: stretch; /* Equal height cards */
		gap: var(--gap);
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		scroll-snap-type: x proximity;
		scrollbar-width: none;
		-ms-overflow-style: none;
		/* Padding for shadows + left/right margins */
		padding: 0.5rem 1rem 1rem 1rem;
		margin: -0.5rem 0 -1rem 0;
		scroll-padding-left: 1rem;
	}

	.carousel-scroll::-webkit-scrollbar {
		display: none;
	}

	.carousel-scroll > :global(*:not(.end-spacer)) {
		scroll-snap-align: start;
		flex-shrink: 0;
		width: var(--card-width);
		/* Ensure card contents stretch to fill height */
		display: flex;
		flex-direction: column;
	}

	.end-spacer {
		width: 1rem;
		flex-shrink: 0;
	}

	.indicator-dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 9999px;
		background-color: #c6b7ac; /* sand-400 */
		transition: all 0.2s ease;
	}

	.indicator-dot.active {
		width: 1.5rem;
		background-color: #816958; /* sand-800 */
	}

	/* Disable snapping while dragging for 1:1 movement */
	:global(.carousel-scroll.is-dragging) {
		scroll-snap-type: none !important;
		scroll-behavior: auto !important;
	}
</style>
