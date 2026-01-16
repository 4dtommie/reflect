<script lang="ts">
	import { mobileThemeName } from '$lib/stores/mobileTheme';

	interface Props {
		children?: import('svelte').Snippet;
		class?: string;
		title?: string;
		padding?: string;
		/** Use glassy effect (only applies to rebrand theme) */
		glassy?: boolean;
	}

	let { children, class: className = '', title, padding = 'p-4', glassy = true }: Props = $props();

	// Theme checks
	const isOriginal = $derived($mobileThemeName === 'nn-original');
	const isRebrand = $derived($mobileThemeName === 'rebrand');
	
	// Check if overflow-visible is explicitly set in className
	const overflowClass = $derived(className.includes('overflow-visible') ? '' : 'overflow-hidden');
</script>

{#if isOriginal}
	<!-- NN Original: stronger shadow, 4px radius -->
	<div class="dark:bg-gray-1200 card bg-white shadow-md rounded-[4px] {overflowClass} {padding} {className}">
		{#if title}<h2 class="mb-2 card-title text-lg font-bold">{title}</h2>{/if}
		{@render children?.()}
	</div>
{:else if isRebrand}
	<!-- Rebrand: glassy effect with transparency, glossy border, noise texture -->
	<div class="card-glassy relative rounded-xl {overflowClass} {padding} {className}" class:glassy-enabled={glassy}>
		<!-- Noise texture overlay -->
		{#if glassy}
			<div class="noise-overlay"></div>
		{/if}
		{#if title}<h2 class="relative z-10 mb-2 card-title text-lg font-bold">{title}</h2>{/if}
		<div class="relative z-10">
			{@render children?.()}
		</div>
	</div>
{:else}
	<!-- Improved/Redesign: clean white cards with subtle shadow -->
	<div class="dark:bg-gray-1200 card bg-white shadow-sm rounded-xl {overflowClass} {padding} {className}">
		{#if title}<h2 class="mb-2 card-title text-lg font-bold">{title}</h2>{/if}
		{@render children?.()}
	</div>
{/if}

<!-- Styles are centralized in mobile.css -->
