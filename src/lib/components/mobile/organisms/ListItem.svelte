<script lang="ts">
	import type { Snippet } from 'svelte';
	import { ChevronRight } from 'lucide-svelte';
	import { mobileThemeName } from '$lib/stores/mobileTheme';
	import MobileLink from '../MobileLink.svelte';

	interface Props {
		/** Optional click handler */
		onclick?: () => void;
		/** Optional link href (renders as MobileLink) */
		href?: string;
		/** Whether to show chevron at end */
		showChevron?: boolean;
		/** Whether item is currently active/selected */
		active?: boolean;
		/** Disable touch feedback */
		disabled?: boolean;
		/** Left slot (icon, avatar, etc.) */
		left?: Snippet;
		/** Main content slot */
		content?: Snippet;
		/** Right slot (amount, badge, etc.) */
		right?: Snippet;
		/** Children slot (alternative to content) */
		children?: Snippet;
		/** Additional classes */
		class?: string;
		/** Padding override */
		padding?: string;
	}

	let {
		onclick,
		href,
		showChevron = false,
		active = false,
		disabled = false,
		left,
		content,
		right,
		children,
		class: className = '',
		padding = 'px-4 py-3'
	}: Props = $props();

	// Theme checks
	const isOriginal = $derived($mobileThemeName === 'nn-original');
	const isRebrand = $derived($mobileThemeName === 'rebrand');

	// Compute classes based on theme
	const baseClasses = $derived.by(() => {
		const classes = [padding];

		if (isRebrand) {
			// Rebrand: transparent background for glassy card effect
			classes.push('bg-transparent');
		} else if (!isOriginal) {
			// Improved: block variant with individual card styling
			classes.push('bg-white dark:bg-gray-1200 rounded-xl mb-2 last:mb-0 shadow-sm');
		} else {
			// NN Original: flat variant - handled by parent dividers
			classes.push('bg-white dark:bg-gray-1200');
		}

		if (!disabled) {
			classes.push('transition-all active:scale-[0.99]');
			classes.push('active:bg-gray-50 dark:active:bg-gray-1100');
		}

		if (active) {
			classes.push('bg-black/5 dark:bg-white/10');
		}

		return classes.join(' ');
	});

	// Determine wrapper element type
	const isLink = $derived(!!href);
	const isButton = $derived(!!onclick && !href);
</script>

{#if isLink}
	<MobileLink href={href ?? ''} class="block {baseClasses} {className}">
		<div class="flex items-center">
			{#if left}
				<div class="flex shrink-0 items-center gap-3">
					{@render left()}
				</div>
			{/if}
			<div class="flex min-w-0 flex-1 flex-col {left ? 'ml-3' : ''} {right || showChevron ? 'mr-3' : ''}">
				{#if content}
					{@render content()}
				{:else if children}
					{@render children()}
				{/if}
			</div>
			{#if right || showChevron}
				<div class="flex shrink-0 items-center gap-1">
					{#if right}
						{@render right()}
					{/if}
					{#if showChevron}
						<ChevronRight class="h-3.5 w-3.5 text-gray-400" strokeWidth={2} />
					{/if}
				</div>
			{/if}
		</div>
	</MobileLink>
{:else if isButton}
	<button type="button" {onclick} class="w-full text-left {baseClasses} {className}" {disabled}>
		<div class="flex items-center">
			{#if left}
				<div class="flex shrink-0 items-center gap-3">
					{@render left()}
				</div>
			{/if}
			<div class="flex min-w-0 flex-1 flex-col {left ? 'ml-3' : ''} {right || showChevron ? 'mr-3' : ''}">
				{#if content}
					{@render content()}
				{:else if children}
					{@render children()}
				{/if}
			</div>
			{#if right || showChevron}
				<div class="flex shrink-0 items-center gap-1">
					{#if right}
						{@render right()}
					{/if}
					{#if showChevron}
						<ChevronRight class="h-3.5 w-3.5 text-gray-400" strokeWidth={2} />
					{/if}
				</div>
			{/if}
		</div>
	</button>
{:else}
	<div class="{baseClasses} {className}">
		<div class="flex items-center">
			{#if left}
				<div class="flex shrink-0 items-center gap-3">
					{@render left()}
				</div>
			{/if}
			<div class="flex min-w-0 flex-1 flex-col {left ? 'ml-3' : ''} {right || showChevron ? 'mr-3' : ''}">
				{#if content}
					{@render content()}
				{:else if children}
					{@render children()}
				{/if}
			</div>
			{#if right || showChevron}
				<div class="flex shrink-0 items-center gap-1">
					{#if right}
						{@render right()}
					{/if}
					{#if showChevron}
						<ChevronRight class="h-3.5 w-3.5 text-gray-400" strokeWidth={2} />
					{/if}
				</div>
			{/if}
		</div>
	</div>
{/if}
