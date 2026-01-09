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
		/** Current item index */
		currentIndex?: number;
	}

	let {
		showIndicators = false,
		itemCount = 0,
		cardWidth = 280,
		gap = 12,
		class: className = '',
		children,
		currentIndex = $bindable(0)
	}: Props = $props();

	let scrollContainer: HTMLElement;

	function handleScroll() {
		if (!scrollContainer) return;
		// Calculate which card is most visible based on scroll position
		const scrollLeft = scrollContainer.scrollLeft;
		const itemWidth = cardWidth + gap;
		currentIndex = Math.round(scrollLeft / itemWidth);
	}

	function scrollToIndex(index: number) {
		if (!scrollContainer) return;

		if (index === 0) {
			scrollContainer.scrollTo({ left: 0, behavior: 'smooth' });
			return;
		}

		// For other items, center them
		const children = Array.from(scrollContainer.children).filter(
			(c) => !c.classList.contains('end-spacer')
		);

		// If last item, align to end
		if (index === children.length - 1) {
			scrollContainer.scrollTo({
				left: scrollContainer.scrollWidth - scrollContainer.clientWidth,
				behavior: 'smooth'
			});
			return;
		}

		const target = children[index] as HTMLElement;
		if (!target) return;

		const containerWidth = scrollContainer.clientWidth;
		const itemCenter = target.offsetLeft + target.offsetWidth / 2;
		const targetLeft = itemCenter - containerWidth / 2;

		scrollContainer.scrollTo({
			left: targetLeft,
			behavior: 'smooth'
		});
	}

	function handleContainerClick(event: MouseEvent) {
		if (!scrollContainer) return;

		// Find the direct child of scrollContainer that was clicked
		const target = event.target as HTMLElement;
		const children = Array.from(scrollContainer.children).filter(
			(c) => !c.classList.contains('end-spacer')
		);

		// Find which child contains the target
		const clickedCardIndex = children.findIndex(
			(child) => child.contains(target) || child === target
		);

		if (clickedCardIndex !== -1) {
			scrollToIndex(clickedCardIndex);
		}
	}

	$effect(() => {
		// Respond to external index changes, wait for layout
		setTimeout(() => {
			scrollToIndex(currentIndex);
		}, 100);
	});
</script>

<div class="carousel-wrapper {className}">
	<!-- Scrollable area -->
	<div
		class="carousel-scroll"
		bind:this={scrollContainer}
		onscroll={handleScroll}
		onclick={handleContainerClick}
		style="--card-width: {cardWidth}px; --gap: {gap}px;"
	>
		{@render children()}
		<!-- End spacer not needed for centered alignment -->
		<!-- <div class="end-spacer"></div> -->
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
		-ms-overflow-style: none;
		/* Padding: 
		   - Left: 1.25rem (slightly more than standard 1rem for visual spacing) 
		   - Right: Enough to center the last item (50% - half card width)
		*/
		padding-top: 0.5rem;
		padding-bottom: 1rem;
		padding-left: 1rem;
		padding-right: 1rem;
		margin: -0.5rem 0 -1rem 0;
		scroll-padding-left: 1rem;
		scroll-padding-right: 1rem;
	}

	.carousel-scroll::-webkit-scrollbar {
		display: none;
	}

	.carousel-scroll > :global(*:not(.end-spacer)) {
		scroll-snap-align: center;
		flex-shrink: 0;
		width: var(--card-width);
		/* Ensure card contents stretch to fill height */
		display: flex;
		flex-direction: column;
		cursor: pointer;
		transition: opacity 0.3s;
	}

	.carousel-scroll > :global(*:first-child) {
		scroll-snap-align: start;
	}

	.carousel-scroll > :global(*:last-child) {
		scroll-snap-align: end;
	}

	.carousel-scroll > :global(*:not(.end-spacer):active) {
		cursor: grabbing;
	}

	.end-spacer {
		width: 0;
		flex-shrink: 0;
	}

	.indicator-dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 9999px;
		background-color: #c6b7ac; /* sand-400 */
		transition:
			width 0.2s ease,
			background-color 0.2s ease;
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
