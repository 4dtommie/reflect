<script lang="ts">
	import { ArrowRight } from 'lucide-svelte';

	interface Props {
		label: string;
		href?: string;
		onclick?: () => void;
		class?: string;
	}

	let { label, href, onclick, class: className = '' }: Props = $props();
</script>

{#if href}
	<a {href} class="flex items-center font-heading text-base font-medium text-gray-900 {className}">
		{label}
		<ArrowRight class="ml-1 h-5 w-5 text-mediumOrange-600" strokeWidth={2} />
	</a>
{:else}
	<button
		{onclick}
		class="flex items-center font-heading text-base font-medium text-gray-900 {className}"
	>
		{label}
		<ArrowRight class="ml-1 h-5 w-5 text-mediumOrange-600" strokeWidth={2} />
	</button>
{/if}
