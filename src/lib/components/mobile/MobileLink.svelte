<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { shouldAnimateNavigation } from '$lib/stores/mobileNavAnimation';
	import { mobileNavDirection } from '$lib/stores/mobileNavDirection';
	import { mobileScrollY } from '$lib/stores/mobileScroll';
import { saveScrollPosition } from '$lib/stores/scrollPositions';

	interface Props {
		href: string;
		animate?: boolean;
		class?: string;
		children: import('svelte').Snippet;
	}

	let { href, animate = true, class: className = '', children }: Props = $props();

	const mobileDepthMap: Record<string, number> = {
		'/mobile': 0,
		'/mobile/product-details': 1
	};

	function getDepth(path: string): number {
		return mobileDepthMap[path] ?? path.split('/').filter(Boolean).length;
	}

	function handleClick(e: MouseEvent) {
		e.preventDefault();

		// Set the animation flag based on the animate prop
		shouldAnimateNavigation.set(animate);

		// Determine navigation direction
		const fromPath = $page.url.pathname;
		const toPath = href.split('?')[0]; // Remove query params
		const fromDepth = getDepth(fromPath);
		const toDepth = getDepth(toPath);
		const direction = toDepth < fromDepth ? 'back' : 'forward';
		mobileNavDirection.set(direction);

		// Save current scroll position for this path so back navigation can restore it
		try {
			const currentPath = $page.url.pathname + $page.url.search;
			// Only save if there's a positive scroll value
			if ($mobileScrollY > 0) {
				saveScrollPosition(currentPath, $mobileScrollY);
			}
		} catch (err) {
			// Non-fatal - log for debugging
			console.error('failed to save scroll position', err);
		}

		// Reset scroll store BEFORE navigating so new page sees 0
		mobileScrollY.set(0);

		goto(href);
	}
</script>

<a {href} onclick={handleClick} class={className}>
	{@render children()}
</a>
