<script lang="ts">
	import type { ComponentType } from 'svelte';

	let {
		title,
		value,
		icon,
		color = ''
	}: {
		title: string;
		value: string | number;
		icon?: ComponentType;
		color?: string;
	} = $props();
</script>

<div class="flex items-center justify-between">
	<div>
		<div class="text-sm opacity-60">{title}</div>
		<div class="text-3xl font-bold {color}">{value}</div>
	</div>
	{#if icon}
		{@const Icon = icon}
		<Icon size={40} class="opacity-30" />
	{/if}
</div>
