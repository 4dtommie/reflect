<script lang="ts">
	interface Props {
		/** Size of spinner */
		size?: 'xs' | 'sm' | 'md' | 'lg';
		/** Additional classes */
		class?: string;
	}

	let { size = 'md', class: className = '' }: Props = $props();

	const sizeClasses = {
		xs: 'h-4 w-4',
		sm: 'h-5 w-5',
		md: 'h-6 w-6',
		lg: 'h-8 w-8'
	};
</script>

<span class="loading loading-spinner {sizeClasses[size]} text-mediumOrange-500 {className}"></span>
