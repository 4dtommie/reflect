<script lang="ts">
	import type { Component } from 'svelte';
	import { mobileThemeName } from '$lib/stores/mobileTheme';

	// Use a permissive type for icons to support Lucide components
	type IconComponent = Component<any> | (new (...args: any[]) => any) | ((...args: any[]) => any);

	export interface ActionButton {
		/** Button label */
		label: string;
		/** Lucide icon component */
		icon?: IconComponent;
		/** Click handler */
		onclick?: () => void;
		/** Is this the primary action */
		primary?: boolean;
		/** Is this a tertiary/more action (usually icon only on small screens) */
		tertiary?: boolean;
		/** Render full width (helper for stacked home buttons) */
		fullWidth?: boolean;
		/** Internal helper used by ProductWidget to indicate index in home stack */
		_homeIndex?: number;
	}

	interface Props {
		/** Array of action buttons */
		actions: ActionButton[];
		/** Additional classes */
		class?: string;
		/** Variant for special layouts */
		variant?: 'default' | 'home' | 'carousel' | 'pdp';
	}

	let { actions, class: className = '', variant = 'default' }: Props = $props();

	// Theme checks
	const isOriginal = $derived($mobileThemeName === 'nn-original');
	const isRebrand = $derived($mobileThemeName === 'rebrand');

	// Check if using home/carousel/pdp variant for special button styling
	const useHomeVariant = $derived(variant === 'home' || variant === 'carousel' || variant === 'pdp');

	// Compute button classes based on theme and action type
	function getButtonClasses(action: ActionButton, index: number): string {
		const classes = ['flex items-center justify-center gap-2 transition-all active:scale-95'];

		if (isOriginal) {
			// NN Original: pill buttons, md size
			classes.push('rounded-full');
			classes.push('h-9 px-4');
		} else {
			// Improved: fully rounded buttons, slightly larger
			classes.push('rounded-full');
			classes.push('h-10 px-4');
		}

		// Primary vs secondary vs tertiary styling
		// Support home variant with special styling: first button white, others sand
		const homeIndex = (action as any)._homeIndex ?? (useHomeVariant ? index : undefined);
		
		if (!isOriginal && useHomeVariant && typeof homeIndex === 'number') {
			// Home/carousel/pdp variant: first button sand-50, others white
			if (action.tertiary) {
				// Hamburger button: smaller, white
				classes.push('bg-white shadow-sm');
				classes.push('!w-9 !px-0 !flex-none');
			} else if (homeIndex === 0) {
				classes.push('bg-sand-100 text-gray-900 shadow-sm flex-1');
			} else {
				classes.push('bg-white text-gray-900 shadow-sm flex-1');
			}
		} else if (action.primary) {
			// CTA: original uses orange, improved uses darker sand-200 background
			classes.push(isOriginal ? 'bg-mediumOrange-600 text-white shadow-sm' : 'bg-sand-200 shadow-sm');
		} else if (action.tertiary) {
			// Tertiary (hamburger): lighter sand on improved, white on original
			classes.push(isOriginal ? 'bg-white dark:bg-gray-1100 shadow-sm' : 'bg-sand-100 shadow-sm');
			classes.push(isOriginal ? 'w-9 !px-0' : 'w-10 !px-0');
		} else {
			// Secondary: light sand on improved, white on original
			classes.push(isOriginal ? 'bg-white dark:bg-gray-1100 shadow-sm' : 'bg-sand-100 shadow-sm');
		}

		return classes.join(' ');
	}

	function getIconClasses(action: ActionButton): string {
		if (action.primary) return isOriginal ? 'h-4 w-4 text-white' : 'h-4 w-4 text-mediumOrange-600';
		if (isOriginal) return 'h-4 w-4 text-mediumOrange-600';
		// improved secondary/tertiary icons: orange for all
		return 'h-4 w-4 text-mediumOrange-600';
	}

	function getLabelClasses(action: ActionButton): string {
		if (action.primary) {
			return isOriginal ? 'text-sm font-semibold text-white' : 'text-base font-normal text-gray-1000';
		} else if (action.tertiary) {
			return isOriginal ? 'text-sm font-semibold text-gray-500' : 'text-base font-normal text-gray-1000';
		}
		return isOriginal ? 'text-sm font-semibold text-gray-1000 dark:text-gray-200' : 'text-base font-normal text-gray-1000';
	}
</script>

<div class="flex gap-2 {className}">
	{#each actions as action, i}
		<button
			type="button"
			onclick={action.onclick}
			class="{getButtonClasses(action, i)} {isOriginal && !action.tertiary ? 'flex-1' : ''} {action.fullWidth ? 'w-full' : ''} {isRebrand ? 'glassy-button' : ''}"
		>
			{#if action.icon}
				{@const IconComponent = action.icon}
				<IconComponent class={getIconClasses(action)} strokeWidth={2.2} />
			{/if}
			{#if !action.tertiary || !action.icon}
				<span class={getLabelClasses(action)}>{action.label}</span>
			{/if}
		</button>
	{/each}
</div>

<style>
	.glassy-button {
		position: relative;
		background: rgba(255, 255, 255, 0.92) !important;
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		border: 1px solid rgba(255, 255, 255, 1);
		box-shadow: 
			0 2px 8px rgba(0, 0, 0, 0.06),
			0 1px 2px rgba(0, 0, 0, 0.04),
			inset 0 1px 0 rgba(255, 255, 255, 1),
			inset 0 -1px 0 rgba(0, 0, 0, 0.02);
	}

	.glassy-button::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 50%;
		background: linear-gradient(
			180deg,
			rgba(255, 255, 255, 0.8) 0%,
			rgba(255, 255, 255, 0) 100%
		);
		border-radius: 9999px 9999px 0 0;
		pointer-events: none;
	}
</style>