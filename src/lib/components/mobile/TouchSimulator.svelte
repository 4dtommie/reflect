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

	// Velocity tracking
	let lastY = 0;
	let lastTime = 0;
	let velocityY = 0;
	let animationFrame: number;

	function handleMouseMove(e: MouseEvent) {
		cursorX = e.clientX;
		cursorY = e.clientY;

		if (!isDown || !activeScrollTarget) return;
		e.preventDefault();

		const now = Date.now();
		const dt = now - lastTime;
		const walkX = e.pageX - startX;
		const walkY = e.pageY - startY;

		// Calculate velocity (pixels per ms)
		if (dt > 0) {
			velocityY = (e.pageY - lastY) / dt;
		}
		lastY = e.pageY;
		lastTime = now;

		// Apply scroll to the active target
		activeScrollTarget.scrollLeft = scrollLeft - walkX;
		activeScrollTarget.scrollTop = scrollTop - walkY;
	}

	function handleMouseDown(e: MouseEvent) {
		isClicking = true;
		e.preventDefault(); // Stop native selection/drag

		// Stop any ongoing inertia
		if (animationFrame) cancelAnimationFrame(animationFrame);

		// Only enable drag within the mobile viewport
		if (!scrollContainer.contains(e.target as Node)) return;

		// Find the scrollable element (could be carousel or main content)
		activeScrollTarget = findScrollableParent(e.target as HTMLElement) || scrollContainer;
		activeScrollTarget.classList.add('is-dragging');

		isDown = true;
		startX = e.pageX;
		startY = e.pageY;
		lastY = e.pageY;
		lastTime = Date.now();
		velocityY = 0;
		scrollLeft = activeScrollTarget.scrollLeft;
		scrollTop = activeScrollTarget.scrollTop;
	}

	function handleMouseUp() {
		isDown = false;
		isClicking = false;

		if (activeScrollTarget) {
			activeScrollTarget.classList.remove('is-dragging');

			// Check if we should apply inertia or let snap take over
			const style = getComputedStyle(activeScrollTarget);
			const hasSnap = style.scrollSnapType !== 'none' && style.scrollSnapType !== '';

			if (!hasSnap && Math.abs(velocityY) > 0.1) {
				applyInertia();
			} else {
				activeScrollTarget = null;
			}
		}
	}

	function applyInertia() {
		if (!activeScrollTarget) return;

		// Deceleration factor (friction)
		const friction = 0.95;

		velocityY *= friction;
		activeScrollTarget.scrollTop -= velocityY * 16; // * 16 for approx frame time scaling
		activeScrollTarget.scrollLeft -= velocityY * 16 * 0.5; // Also apply to X if applicable (assumes diagonal drag support)

		if (Math.abs(velocityY) > 0.05) {
			animationFrame = requestAnimationFrame(applyInertia);
		} else {
			activeScrollTarget = null;
		}
	}

	function handleMouseLeave() {
		isDown = false;
		isClicking = false;
		// Maintain inertia even if mouse leaves if we were dragging
		if (activeScrollTarget && Math.abs(velocityY) > 0.1) {
			handleMouseUp();
		} else {
			activeScrollTarget = null;
		}
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
			if (animationFrame) cancelAnimationFrame(animationFrame);
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
