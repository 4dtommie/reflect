<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { shouldAnimateNavigation } from '$lib/stores/mobileNavAnimation';
	import { mobileNavDirection } from '$lib/stores/mobileNavDirection';

	interface Props {
		href: string;
		animate?: boolean;
		class?: string;
		children: import('svelte').Snippet;
	}

	let { href, animate = true, class: className = '', children }: Props = $props();

	const mobileDepthMap: Record<string, number> = {
		'/mobile': 0,
		'/mobile/transactions': 1
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

		goto(href);
	}
</script>

<a {href} onclick={handleClick} class={className}>
	{@render children()}
</a>
