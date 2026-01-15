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
	}

	interface Props {
		/** Array of action buttons */
		actions: ActionButton[];
		/** Additional classes */
		class?: string;
	}

	let { actions, class: className = '' }: Props = $props();

	// Simple theme check
	const isOriginal = $derived($mobileThemeName === 'nn-original');

	// Compute button classes based on theme and action type
	function getButtonClasses(action: ActionButton): string {
		const classes = ['flex items-center justify-center gap-2 transition-all active:scale-95'];

		if (isOriginal) {
			// NN Original: pill buttons, md size
			classes.push('rounded-full');
			classes.push('h-9 px-4');
		} else {
			// Improved: square buttons, sm size
			classes.push('rounded-xl');
			classes.push('h-10 px-4');
		}

		// Primary vs secondary vs tertiary styling
		if (action.primary) {
			classes.push('bg-mediumOrange-600 text-white shadow-sm');
		} else if (action.tertiary) {
			classes.push('bg-white dark:bg-gray-1100 shadow-sm');
			classes.push(isOriginal ? 'w-9 !px-0' : 'w-10 !px-0');
		} else {
			classes.push('bg-white dark:bg-gray-1100 shadow-sm');
		}

		return classes.join(' ');
	}

	function getIconClasses(action: ActionButton): string {
		return action.primary ? 'h-4 w-4 text-white' : 'h-4 w-4 text-mediumOrange-600';
	}

	function getLabelClasses(action: ActionButton): string {
		if (action.primary) {
			return 'font-heading text-sm font-semibold text-white';
		} else if (action.tertiary) {
			return 'font-heading text-sm font-semibold text-gray-500';
		}
		return 'font-heading text-sm font-semibold text-gray-1000 dark:text-gray-200';
	}
</script>

<div class="flex gap-2 {className}">
	{#each actions as action}
		<button
			type="button"
			onclick={action.onclick}
			class="{getButtonClasses(action)} {action.tertiary ? '' : 'flex-1'}"
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
