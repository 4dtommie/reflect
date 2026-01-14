<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		/** Badge text or number (optional if using children) */
		value?: string | number;
		/** Visual variant */
		variant?: 'default' | 'primary' | 'success' | 'warning' | 'info' | 'neutral';
		/** Size */
		size?: 'xs' | 'sm' | 'md';
		/** Additional classes */
		class?: string;
		/** Children snippet for content */
		children?: Snippet;
	}

	let {
		value,
		variant = 'default',
		size = 'sm',
		class: className = '',
		children
	}: Props = $props();

	const variantClasses = {
		default: 'bg-gray-200 text-gray-1000 dark:bg-gray-800 dark:text-gray-300',
		primary: 'bg-mediumOrange-100 text-mediumOrange-700 dark:bg-mediumOrange-900/30 dark:text-mediumOrange-400',
		success: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
		warning: 'bg-lightOrange-100 text-lightOrange-700 dark:bg-lightOrange-900/30 dark:text-lightOrange-400',
		info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
		neutral: 'bg-gray-200/60 text-gray-1000 dark:bg-gray-700 dark:text-gray-300'
	};

	const sizeClasses = {
		xs: 'px-1 py-0.5 text-xs',
		sm: 'px-2 py-0.5 text-sm',
		md: 'px-2 py-1 text-sm'
	};
</script>

<span
	class="inline-flex items-center justify-center rounded-md font-bold {variantClasses[variant]} {sizeClasses[size]} {className}"
>
	{#if children}
		{@render children()}
	{:else if value !== undefined}
		{value}
	{/if}
</span>
