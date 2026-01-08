<script lang="ts">
	interface Props {
		title: string;
		class?: string;
		children?: any; // For action buttons
	}

	let { title, class: className = '', children }: Props = $props();
</script>

<div class="mb-3 flex items-center justify-between {className}">
	<h2 class="font-heading text-base font-bold text-gray-900">{title}</h2>
	{#if children}
		{@render children()}
	{/if}
</div>
