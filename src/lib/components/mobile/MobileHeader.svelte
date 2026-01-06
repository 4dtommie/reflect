<script lang="ts">
	import { mobileScrollY } from '$lib/stores/mobileScroll';

	interface Props {
		class?: string;
		children?: import('svelte').Snippet;
	}

	let { class: className = '', children }: Props = $props();

	const shadowOpacity = $derived(Math.min($mobileScrollY / 50, 1) * 0.1); // Max 0.1 opacity
</script>

<header
	class="sticky top-0 z-20 w-full bg-sand-50/85 pt-[54px] backdrop-blur-md transition-shadow {className}"
	style="box-shadow: 0 12px 32px -4px rgba(0, 0, 0, {shadowOpacity});"
>
	{@render children?.()}
</header>
