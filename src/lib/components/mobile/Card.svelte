<script lang="ts">
	import { mobileTheme } from '$lib/stores/mobileTheme';

	interface Props {
		children?: import('svelte').Snippet;
		class?: string;
		title?: string;
		padding?: string;
	}

	let { children, class: className = '', title, padding = 'p-4' }: Props = $props();

	// Get theme config
	const theme = $derived($mobileTheme);
	
	// Apply stronger shadow for NN Original theme
	const shadowClass = $derived(theme.name === 'nn-original' ? 'shadow-md' : 'shadow-sm');
	// Apply 4px border radius for NN Original theme
	const radiusClass = $derived(theme.name === 'nn-original' ? 'rounded-[4px]' : 'rounded-xl');
	// Add overflow hidden for NN Original to ensure rounded corners clip properly
	const overflowClass = $derived(theme.name === 'nn-original' ? 'overflow-hidden' : '');
</script>

<div class="dark:bg-gray-1200 card bg-white {shadowClass} {radiusClass} {overflowClass} {padding} {className}">
	{#if title}<h2 class="mb-2 card-title text-lg font-bold">{title}</h2>{/if}
	{@render children?.()}
</div>
