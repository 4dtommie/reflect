<script context="module" lang="ts">
	// Module-level cache to track animation times across instances
	const animationCache: Record<string, number> = {};
</script>

<script lang="ts">
	import { ChevronRight } from 'lucide-svelte';
	import Amount from '$lib/components/mobile/Amount.svelte';

	interface Props {
		title: string;
		saved: number;
		target: number;
		icon: any; // visual icon component
		color?: string; // hex or tailwind class for bar
	}

	let { title, saved, target, icon: Icon, color = 'bg-blue-500' }: Props = $props();

	const percentage = Math.min(Math.round((saved / target) * 100), 100);
	let visible = $state(false);
	let shouldAnimate = $state(true);

	$effect(() => {
		const lastAnimated = animationCache[title];
		const now = Date.now();

		if (lastAnimated && now - lastAnimated < 60000) {
			// Recently animated, show immediately without animation
			shouldAnimate = false;
			visible = true;
		} else {
			// Not animated recently, animate
			shouldAnimate = true;
			setTimeout(() => {
				visible = true;
				animationCache[title] = Date.now();
			}, 100);
		}
	});
</script>

<div
	class="block w-full px-4 py-3 transition-all active:scale-[0.99] active:bg-gray-50 dark:active:bg-gray-800"
>
	<!-- Header -->
	<div class="mb-3 flex items-center justify-between">
		<div class="flex items-center gap-3">
			<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-sand-100 dark:bg-gray-800">
				<Icon class="h-5 w-5 text-gray-700 dark:text-gray-300" strokeWidth={1.5} />
			</div>
			<span class="font-heading font-medium text-gray-900 dark:text-white">{title}</span>
		</div>
		<ChevronRight class="h-4 w-4 text-gray-400" />
	</div>

	<!-- Progress Bar -->
	<div class="mb-2 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
		<div
			class="h-full rounded-full transition-all ease-out {shouldAnimate
				? 'duration-1000'
				: 'duration-0'} {color}"
			style="width: {visible ? percentage : 0}%"
		></div>
	</div>

	<!-- Amounts -->
	<div class="flex items-baseline justify-between text-sm">
		<div class="flex items-baseline gap-1">
			<Amount
				amount={saved}
				size="sm"
				class="font-heading font-bold !text-gray-900 dark:!text-white"
				showSign={false}
				showSymbol={true}
			/>
			<span class="text-gray-500 dark:text-gray-400">gespaard</span>
		</div>
		<Amount
			amount={target}
			size="sm"
			class="!text-gray-400 dark:!text-gray-500"
			showSign={false}
			showSymbol={true}
		/>
	</div>
</div>
