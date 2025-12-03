<script lang="ts">
	let {
		title,
		subtitle,
		class: className = ''
	}: {
		title: string;
		subtitle?: string;
		class?: string;
	} = $props();
</script>

<div class="card rounded-3xl bg-base-100 shadow-xl transition-all duration-300 hover:shadow-2xl {className}">
	<div class="card-body justify-center px-8 py-6">
		<h1 class="mb-2 text-6xl font-bold lg:text-7xl">{title}</h1>
		{#if subtitle}
			<p class="text-2xl opacity-70">{subtitle}</p>
		{/if}
	</div>
</div>
