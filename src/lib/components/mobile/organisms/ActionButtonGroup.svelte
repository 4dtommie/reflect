<script lang="ts">
	import type { Component } from 'svelte';
	import { mobileTheme } from '$lib/stores/mobileTheme';

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

	// Get theme config
	const theme = $derived($mobileTheme);
	const buttonConfig = $derived(theme.actionButtons);

	// Compute button classes based on theme
	const getButtonClasses = $derived.by(() => {
		return (action: ActionButton) => {
			const classes = ['flex items-center justify-center gap-2 transition-all active:scale-95'];

			// Shape
			if (buttonConfig.shape === 'pill') {
				classes.push('rounded-full');
			} else {
				classes.push('rounded-xl');
			}

			// Size
			if (buttonConfig.size === 'sm') {
				classes.push('h-10 px-4');
			} else {
				classes.push('h-9 px-4');
			}

			// Primary vs secondary vs tertiary styling
			if (action.primary) {
				classes.push('bg-mediumOrange-600 text-white shadow-sm');
			} else if (action.tertiary) {
				classes.push('bg-white dark:bg-gray-1100 shadow-sm');
				if (buttonConfig.size === 'sm') {
					classes.push('w-10 !px-0'); // Square for tertiary
				} else {
					classes.push('w-9 !px-0');
				}
			} else {
				classes.push('bg-white dark:bg-gray-1100 shadow-sm');
			}

			return classes.join(' ');
		};
	});

	const getIconClasses = $derived.by(() => {
		return (action: ActionButton) => {
			const classes = ['h-4 w-4'];

			if (action.primary) {
				classes.push('text-white');
			} else {
				classes.push('text-mediumOrange-600');
			}

			return classes.join(' ');
		};
	});

	const getLabelClasses = $derived.by(() => {
		return (action: ActionButton) => {
			const classes = ['font-heading text-sm font-semibold'];

			if (action.primary) {
				classes.push('text-white');
			} else if (action.tertiary) {
				classes.push('text-gray-500');
			} else {
				classes.push('text-gray-1000 dark:text-gray-200');
			}

			return classes.join(' ');
		};
	});
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
