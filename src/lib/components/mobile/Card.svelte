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

<style>
	.card-glassy {
		position: relative;
		background: rgba(255, 255, 255, 0.75);
		backdrop-filter: blur(20px) saturate(1.8);
		-webkit-backdrop-filter: blur(20px) saturate(1.8);
		border: 1px solid rgba(255, 255, 255, 0.6);
		box-shadow: 0 2px 16px rgba(0, 0, 0, 0.04);
	}

	.card-glassy.glassy-enabled {
		background: rgba(255, 255, 255, 0.7);
	}

	/* SVG filter noise distortion overlay */
	.noise-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		opacity: 0.15;
		pointer-events: none;
		z-index: 2;
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3CfeDisplacementMap in='SourceGraphic' scale='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
		background-repeat: repeat;
		background-size: 150px 150px;
		mix-blend-mode: overlay;
	}

	/* Dark mode adjustments */
	:global(.dark) .card-glassy {
		background: rgba(30, 30, 30, 0.5);
		border: 1px solid rgba(255, 255, 255, 0.08);
		box-shadow: 0 2px 16px rgba(0, 0, 0, 0.2);
	}

	:global(.dark) .noise-overlay {
		opacity: 0.1;
	}
</style>
