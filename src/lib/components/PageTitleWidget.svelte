<script lang="ts">
	let {
		title,
		subtitle
	}: {
		title: string;
		subtitle?: string;
	} = $props();
</script>

<div class="card rounded-3xl bg-base-100 shadow-xl transition-all duration-300 hover:shadow-2xl">
	<div class="card-body">
		<h1 class="text-4xl font-bold">{title}</h1>
		{#if subtitle}
			<p class="text-base-content/70">{subtitle}</p>
		{/if}
	</div>
</div>
