<script lang="ts">
	interface Props {
		children?: import('svelte').Snippet;
		class?: string;
		title?: string;
		padding?: string;
	}

	let { children, class: className = '', title, padding = 'p-4' }: Props = $props();
</script>

<div class="card bg-white shadow-sm {padding} {className}">
	{#if title}<h2 class="mb-2 card-title text-lg font-bold">{title}</h2>{/if}
	{@render children?.()}
</div>
