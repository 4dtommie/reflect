<script lang="ts">
	import { onMount } from 'svelte';

	let scrollContainer: HTMLElement;
	let activeScrollTarget: HTMLElement | null = null;
	let isDown = false;
	let startX: number;
	let startY: number;
	let scrollLeft: number;
	let scrollTop: number;

	// Custom cursor follower
	let cursorX = 0;
	let cursorY = 0;
	let isClicking = false;

	function findScrollableParent(element: HTMLElement | null): HTMLElement | null {
		while (element) {
			const style = getComputedStyle(element);
			const overflowX = style.overflowX;
			const overflowY = style.overflowY;

			// Check for horizontal scrollable
			if (
				(overflowX === 'auto' || overflowX === 'scroll') &&
				element.scrollWidth > element.clientWidth
			) {
				return element;
			}
			// Check for vertical scrollable
			if (
				(overflowY === 'auto' || overflowY === 'scroll') &&
				element.scrollHeight > element.clientHeight
			) {
				return element;
			}
			element = element.parentElement;
		}
		return null;
	}

	function handleMouseMove(e: MouseEvent) {
		cursorX = e.clientX;
		cursorY = e.clientY;

		if (!isDown || !activeScrollTarget) return;
		e.preventDefault();

		const walkX = e.pageX - startX;
		const walkY = e.pageY - startY;

		// Apply scroll to the active target
		activeScrollTarget.scrollLeft = scrollLeft - walkX;
		activeScrollTarget.scrollTop = scrollTop - walkY;
	}

	function handleMouseDown(e: MouseEvent) {
		isClicking = true;

		// Only enable drag within the mobile viewport
		if (!scrollContainer.contains(e.target as Node)) return;

		// Find the scrollable element (could be carousel or main content)
		activeScrollTarget = findScrollableParent(e.target as HTMLElement) || scrollContainer;

		isDown = true;
		startX = e.pageX;
		startY = e.pageY;
		scrollLeft = activeScrollTarget.scrollLeft;
		scrollTop = activeScrollTarget.scrollTop;
	}

	function handleMouseUp() {
		isDown = false;
		isClicking = false;
		activeScrollTarget = null;
	}

	function handleMouseLeave() {
		isDown = false;
		isClicking = false;
		activeScrollTarget = null;
	}

	onMount(() => {
		// Find the scrollable content container
		scrollContainer = document.querySelector('.mobile-content') as HTMLElement;

		window.addEventListener('mousemove', handleMouseMove);
		window.addEventListener('mousedown', handleMouseDown);
		window.addEventListener('mouseup', handleMouseUp);

		return () => {
			window.removeEventListener('mousemove', handleMouseMove);
			window.removeEventListener('mousedown', handleMouseDown);
			window.removeEventListener('mouseup', handleMouseUp);
		};
	});
</script>

<!-- Custom Touch Cursor -->
<div
	class="pointer-events-none fixed z-[9999] h-8 w-8 rounded-full border-2 {isClicking
		? 'scale-[0.85] border-mediumOrange-500 bg-mediumOrange-500/60'
		: 'border-mediumOrange-500/50 bg-mediumOrange-500/20'}"
	style="left: {cursorX}px; top: {cursorY}px; transform: translate(-50%, -50%);"
></div>

<style>
	/* Hide cursor globally within the mobile viewport */
	:global(.mobile-viewport),
	:global(.mobile-viewport *) {
		cursor: none !important;
	}
</style>
