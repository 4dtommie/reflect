<script lang="ts">
	import type { Component } from 'svelte';

	interface Props {
		/** Lucide icon component */
		icon: Component<any>;
		/** Size preset */
		size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
		/** Stroke width */
		strokeWidth?: number;
		/** Additional classes */
		class?: string;
	}

	let {
		icon: Icon,
		size = 'md',
		strokeWidth = 1.5,
		class: className = ''
	}: Props = $props();

	const sizeClasses = {
		xs: 'h-4 w-4',
		sm: 'h-5 w-5',
		md: 'h-6 w-6',
		lg: 'h-8 w-8',
		xl: 'h-10 w-10'
	};
</script>

<Icon class="{sizeClasses[size]} {className}" {strokeWidth} />
