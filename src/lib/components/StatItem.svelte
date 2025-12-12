<script lang="ts">
	let {
		label,
		value,
		color = '',
		size = 'md'
	}: { label: string; value: string | number; color?: string; size?: 'sm' | 'md' } = $props();

	const labelClass = size === 'sm' ? 'text-xs' : 'text-sm';
	const valueClass = size === 'sm' ? 'text-2xl' : 'text-4xl';
</script>

<div>
	<p class="{labelClass} text-base-content/70">{label}</p>
	<p class="{valueClass} font-bold {color}">{value}</p>
</div>
