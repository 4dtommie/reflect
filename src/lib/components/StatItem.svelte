<script lang="ts">
	let {
		label,
		value,
		color = ''
	}: { label: string; value: string | number; color?: string } = $props();
</script>

<div>
	<p class="text-sm text-base-content/70">{label}</p>
	<p class="text-4xl font-bold {color}">{value}</p>
</div>
