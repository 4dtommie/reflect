<script lang="ts">
	import type { Snippet } from 'svelte';
	import { mobileTheme } from '$lib/stores/mobileTheme';
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

	// Get theme config
	const theme = $derived($mobileTheme);
	const listGroupConfig = $derived(theme.listGroup);
	const listItemConfig = $derived(theme.listItem);

	// Compute divider classes based on theme
	const dividerClasses = $derived.by(() => {
		if (listItemConfig.variant === 'block') {
			// No dividers in block mode - items have their own separation
			return '';
		}
		if (listItemConfig.showDividers) {
			return 'divide-y divide-gray-100 dark:divide-gray-800';
		}
		return '';
	});
</script>

<section class={className}>
	{#if title || action}
		<WidgetHeader title={title ?? ''} {badge} class="mb-3">
			{#if action}
				<WidgetAction label={action.label} href={action.href} onclick={action.onclick} />
			{/if}
		</WidgetHeader>
	{/if}

	{#if listGroupConfig.variant === 'card'}
		<Card {padding} class={contentClass}>
			<div class={dividerClasses}>
				{@render children()}
			</div>
		</Card>
	{:else}
		<!-- Flat variant - no card wrapper -->
		<div class="{listItemConfig.variant === 'flat' ? dividerClasses : ''} {contentClass}">
			{@render children()}
		</div>
	{/if}
</section>
