<script lang="ts">
	import type { Snippet } from 'svelte';
	import { mobileThemeName } from '$lib/stores/mobileTheme';
	import Card from '../Card.svelte';
	import WidgetHeader from '../WidgetHeader.svelte';
	import WidgetAction from '../WidgetAction.svelte';

	interface Props {
		/** Section title */
		title?: string;
		/** Badge value for header */
		badge?: string | number;
		/** Action link/button */
		action?: {
			label: string;
			href?: string;
			onclick?: () => void;
		};
		/** Children slot (ListItem components) */
		children: Snippet;
		/** Additional classes for outer wrapper */
		class?: string;
		/** Additional classes for content wrapper */
		contentClass?: string;
		/** Override card padding (only used in card variant) */
		padding?: string;
		/** Show empty state if no children */
		emptyText?: string;
	}

	let {
		title,
		badge,
		action,
		children,
		class: className = '',
		contentClass = '',
		padding = 'p-0',
		emptyText
	}: Props = $props();

	// Simple theme check
	const isOriginal = $derived($mobileThemeName === 'nn-original');
</script>

<section class={className}>
	{#if title || action}
		<WidgetHeader title={title ?? ''} {badge} class="mb-3">
			{#if action}
				<WidgetAction label={action.label} href={action.href} onclick={action.onclick} />
			{/if}
		</WidgetHeader>
	{/if}

	{#if isOriginal}
		<!-- NN Original: card wrapper, no dividers -->
		<Card {padding} class={contentClass}>
			<div>
				{@render children()}
			</div>
		</Card>
	{:else}
		<!-- Improved: card wrapper with dividers -->
		<Card {padding} class={contentClass}>
			<div class="divide-y divide-white dark:divide-gray-800">
				{@render children()}
			</div>
		</Card>
	{/if}
</section>
