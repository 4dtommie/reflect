<script lang="ts">
	import { LayoutGrid } from 'lucide-svelte';

	interface Props {
		title?: string;
		size?: '1x1' | '2x1' | '1x2' | '2x2';
		icon?: import('svelte').Component;
	}

	let { title = 'Widget', size = '1x1', icon: Icon = LayoutGrid }: Props = $props();

	const sizeClass = `widget-${size}`;
</script>

<div class="widget-card {sizeClass}">
	<div class="mb-2 text-base-content/40">
		<Icon size={32} />
	</div>
	<span class="text-sm font-medium text-base-content/60">{title}</span>
</div>
