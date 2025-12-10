<script lang="ts">
	import type { Snippet } from 'svelte';
	import { ArrowRight } from 'lucide-svelte';

	let {
		title,
		icon,
		size = 'medium',
		variant = 'default',
		enableHover = true,
		bgColor,
		actionLabel,
		actionHref,
		children
	}: {
		title?: string;
		icon?: Snippet;
		size?: 'auto' | 'extra-small' | 'small' | 'medium' | 'large' | 'wide' | 'full';
		variant?: 'default' | 'placeholder';
		enableHover?: boolean;
		bgColor?: string;
		actionLabel?: string;
		actionHref?: string;
		children: Snippet;
	} = $props();

	const sizeClasses = {
		auto: '',
		'extra-small': 'min-h-[150px]',
		small: 'min-h-[200px]',
		medium: 'min-h-[300px]',
		large: 'min-h-[300px]',
		wide: 'md:col-span-2 min-h-[200px]',
		full: 'col-span-full min-h-[200px]'
	};

	const variantClasses = $derived.by(() => {
		const defaultBg = bgColor || 'bg-base-100';
		const placeholderBg = bgColor || 'bg-transparent';

		const base = {
			default: `${defaultBg} shadow-xl`,
			placeholder: `${placeholderBg} shadow-none border-2 border-dashed border-base-content/20`
		};

		if (enableHover) {
			return {
				default: base.default + ' hover:shadow-2xl',
				placeholder: base.placeholder + ' hover:border-base-content/40'
			};
		}

		return base;
	});
</script>

<div
	class="card break-inside-avoid rounded-3xl transition-all duration-300 {enableHover
		? 'hover:scale-[1.01]'
		: ''} {sizeClasses[size]} {variantClasses[variant]}"
>
	<div class="card-body flex flex-col">
		{#if title || icon || actionLabel}
			<div class="mb-2 flex items-center justify-between gap-2">
				<div class="flex items-center gap-2">
					{#if icon}
						{@render icon()}
					{/if}
					{#if title}
						<h2 class="card-title">{title}</h2>
					{/if}
				</div>
				{#if actionLabel && actionHref}
					<a
						href={actionHref}
						class="btn items-center justify-center gap-1 rounded-full leading-none btn-ghost btn-xs"
					>
						{actionLabel}
						<ArrowRight size={12} />
					</a>
				{/if}
			</div>
		{/if}
		{@render children()}
	</div>
</div>
