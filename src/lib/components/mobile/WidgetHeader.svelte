<script lang="ts">
	interface Props {
		title: string;
		badge?: string | number;
		class?: string;
		children?: any; // For action buttons
	}

	let { title, badge, class: className = '', children }: Props = $props();
</script>

<div class="mb-3 flex items-center justify-between {className}">
	<div class="flex items-center gap-2">
		<h2 class="font-heading text-base font-bold text-gray-900 dark:text-white">{title}</h2>
		{#if badge}
			<span
				class="dark:bg-gray-1100 rounded-full bg-gray-200 px-1.5 py-0.5 text-sm font-bold text-gray-800 dark:text-gray-300"
				>{badge}</span
			>
		{/if}
	</div>
	{#if children}
		{@render children()}
	{/if}
</div>
