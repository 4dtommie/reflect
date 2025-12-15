<script lang="ts">
	import type { Snippet } from 'svelte';
	import { ArrowRight } from 'lucide-svelte';

	let {
		title,
		icon,
		size = 'medium',
		variant = 'default',
		enableHover = true,
		enableScale = true,
		bgColor,
		actionLabel,
		actionHref,
		class: className,
		bodyClass,
		children
	}: {
		title?: string;
		icon?: Snippet;
		size?: 'auto' | 'extra-small' | 'small' | 'medium' | 'large' | 'wide' | 'full';
		variant?: 'default' | 'placeholder';
		enableHover?: boolean;
		enableScale?: boolean;
		bgColor?: string;
		actionLabel?: string;
		actionHref?: string;
		class?: string;
		bodyClass?: string;
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
			default: `${defaultBg} border border-base-content/20 shadow-[0_1px_2px_0_rgba(0,0,0,0.05),-4px_6px_15px_-3px_rgba(105,125,155,0.05),4px_6px_15px_-3px_rgba(145,120,175,0.05)]`,
			placeholder: `${defaultBg} border border-base-200 border-dashed opacity-60 hover:opacity-100 hover:border-base-300 hover:shadow-sm`
		};

		if (enableHover) {
			return {
				default:
					base.default +
					' hover:shadow-[0_1px_2px_0_rgba(0,0,0,0.05),-6px_12px_40px_-3px_rgba(105,125,155,0.25),6px_12px_40px_-3px_rgba(145,120,175,0.25)]',
				placeholder: base.placeholder
			};
		}

		return base;
	});
</script>

<div
	class="card flex break-inside-avoid flex-col rounded-3xl transition-all duration-300 {enableHover &&
	enableScale
		? 'hover:scale-[1.01]'
		: ''} {sizeClasses[size]} {variantClasses[variant]} {className}"
>
	<div
		class="card-body flex h-full flex-1 flex-col {variant === 'placeholder'
			? 'justify-center'
			: ''} {bodyClass}"
	>
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
