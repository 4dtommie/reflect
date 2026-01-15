<script lang="ts">
	import { Ghost } from 'lucide-svelte';

	interface Props {
		title?: string;
		description?: string;
		class?: string;
	}

	let {
		title = 'Helemaal leeg!',
		description = 'Hier is (nog) helemaal niets te zien. Spooky... 👻',
		class: className = ''
	}: Props = $props();
</script>

<div class="flex flex-col items-center justify-center py-12 text-center {className}">
	<div
		class="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-sand-100 dark:bg-gray-800"
	>
		<Ghost class="h-10 w-10 text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
	</div>
	<h3 class="mb-2 font-heading text-lg font-bold text-gray-900 dark:text-white">
		{title}
	</h3>
	<p class="max-w-[250px] text-sm leading-relaxed text-gray-800 dark:text-gray-400">
		{description}
	</p>
</div>
