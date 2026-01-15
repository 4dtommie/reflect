<script lang="ts">
	import { mobileScrollY } from '$lib/stores/mobileScroll';

	interface Props {
		class?: string;
		children?: import('svelte').Snippet;
	}

	let { class: className = '', children }: Props = $props();

	let lastScrollY = $state(0);
	let isVisible = $state(true);
	const shadowOpacity = $derived(Math.min($mobileScrollY / 50, 1) * 0.1); // Max 0.1 opacity

	$effect(() => {
		const currentScrollY = $mobileScrollY;

		// Threshold to avoid flickering
		if (Math.abs(currentScrollY - lastScrollY) > 5) {
			if (currentScrollY > lastScrollY && currentScrollY > 100) {
				// Scrolling down and not at the very top
				isVisible = false;
			} else {
				// Scrolling up or at the top
				isVisible = true;
			}
			lastScrollY = currentScrollY;
		}
	});
</script>

<header
	class="mobile-header sticky top-0 z-20 w-full pt-[54px] backdrop-blur-md transition-transform duration-300 ease-in-out {className}"
	class:is-hidden={!isVisible}
	style="box-shadow: 0 12px 32px -4px rgba(0, 0, 0, {shadowOpacity}); transform: translateZ(0) translateY({!isVisible
		? '-100%'
		: '0'});"
>
	{@render children?.()}
</header>
