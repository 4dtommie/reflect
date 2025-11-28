<script lang="ts">
	import DashboardWidget from './DashboardWidget.svelte';
	import { Sparkles } from 'lucide-svelte';
	import type { ComponentType } from 'svelte';

	let {
		title,
		description,
		size = 'medium',
		icon: Icon = Sparkles
	}: {
		title: string;
		description: string;
		size?: 'small' | 'medium' | 'large' | 'wide' | 'full';
		icon?: ComponentType;
	} = $props();
</script>

<DashboardWidget {size} variant="placeholder">
	<div class="flex w-full flex-col items-center justify-center text-center opacity-50">
		<Icon size={48} class="mb-4" />
		<h3 class="text-lg font-semibold">{title}</h3>
		<p class="text-sm">{description}</p>
	</div>
</DashboardWidget>
