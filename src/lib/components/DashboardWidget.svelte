<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		icon,
		size = 'medium',
		variant = 'default',
		children
	}: {
		title?: string;
		icon?: Snippet;
		size?: 'small' | 'medium' | 'large' | 'wide' | 'full';
		variant?: 'default' | 'placeholder';
		children: Snippet;
	} = $props();

	const sizeClasses = {
		small: 'min-h-[200px]',
		medium: 'min-h-[300px]',
		large: 'min-h-[300px] h-full',
		wide: 'md:col-span-2 min-h-[200px]',
		full: 'col-span-full min-h-[200px]'
	};

	const variantClasses = {
		default: 'bg-base-100 shadow-xl hover:shadow-2xl',
		placeholder:
			'bg-transparent shadow-none border-2 border-dashed border-base-content/20 hover:border-base-content/40'
	};
</script>

<div
	class="card break-inside-avoid rounded-3xl transition-all duration-300 hover:scale-[1.01] {sizeClasses[
		size
	]} {variantClasses[variant]}"
>
	<div class="card-body flex h-full flex-col justify-center">
		{#if title || icon}
			<div class="mb-2 flex items-center gap-2">
				{#if icon}
					{@render icon()}
				{/if}
				{#if title}
					<h2 class="card-title">{title}</h2>
				{/if}
			</div>
		{/if}
		{@render children()}
	</div>
</div>
