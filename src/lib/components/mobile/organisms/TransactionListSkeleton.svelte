<script lang="ts">
	import Card from '$lib/components/mobile/Card.svelte';
	import WidgetHeader from '$lib/components/mobile/WidgetHeader.svelte';
	import { mobileThemeName } from '$lib/stores/mobileTheme';

	interface Props {
		title?: string;
		itemCount?: number;
		showAction?: boolean;
		class?: string;
	}

	let { 
		title = 'Verwacht', 
		itemCount = 2, 
		showAction = true,
		class: className = '' 
	}: Props = $props();

	// Simple theme check
	const isOriginal = $derived($mobileThemeName === 'nn-original');
	// Theme-aware dividers (original shows no dividers, improved shows dividers)
	const dividerClasses = $derived(isOriginal ? '' : 'divide-y divide-gray-100 dark:divide-gray-800');
</script>

<div class="animate-pulse {className}">
	<WidgetHeader {title} class="mb-3">
		{#if showAction}
			<div class="h-4 w-20 rounded bg-gray-200 dark:bg-gray-800"></div>
		{/if}
	</WidgetHeader>
	<Card padding="p-0" class="mb-6">
		<div class={dividerClasses}>
			{#each Array(itemCount) as _}
				<div class="flex items-center gap-3 p-4">
					<div class="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-800"></div>
					<div class="flex-1 space-y-2">
						<div class="h-4 w-32 rounded bg-gray-200 dark:bg-gray-800"></div>
						<div class="h-3 w-20 rounded bg-gray-200 dark:bg-gray-800"></div>
					</div>
					<div class="h-4 w-16 rounded bg-gray-200 dark:bg-gray-800"></div>
				</div>
			{/each}
		</div>
	</Card>
</div>
