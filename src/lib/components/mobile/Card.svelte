<script lang="ts">
	import { mobileThemeName } from '$lib/stores/mobileTheme';

	interface Props {
		children?: import('svelte').Snippet;
		class?: string;
		title?: string;
		padding?: string;
	}

	let { children, class: className = '', title, padding = 'p-4' }: Props = $props();

	// Simple theme check
	const isOriginal = $derived($mobileThemeName === 'nn-original');
</script>

{#if isOriginal}
	<!-- NN Original: stronger shadow, 4px radius, overflow hidden -->
	<div class="dark:bg-gray-1200 card bg-white shadow-md rounded-[4px] overflow-hidden {padding} {className}">
		{#if title}<h2 class="mb-2 card-title text-lg font-bold">{title}</h2>{/if}
		{@render children?.()}
	</div>
{:else}
	<!-- Improved: lighter shadow, 12px radius -->
	<div class="dark:bg-gray-1200 card bg-white shadow-sm rounded-xl {padding} {className}">
		{#if title}<h2 class="mb-2 card-title text-lg font-bold">{title}</h2>{/if}
		{@render children?.()}
	</div>
{/if}
