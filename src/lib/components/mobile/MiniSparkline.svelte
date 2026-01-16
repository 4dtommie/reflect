<script lang="ts">
	interface Props {
		/** Data points for the sparkline (balance history) */
		data?: number[];
		/** Width of the SVG */
		width?: number;
		/** Height of the SVG */
		height?: number;
		/** Line color */
		color?: string;
		/** Additional classes */
		class?: string;
	}

	let {
		data = [],
		width = 60,
		height = 24,
		color = 'currentColor',
		class: className = ''
	}: Props = $props();

	// Generate path from data points
	const pathD = $derived.by(() => {
		if (!data || data.length < 2) return '';

		const min = Math.min(...data);
		const max = Math.max(...data);
		const range = max - min || 1;

		const padding = 2;
		const chartWidth = width - padding * 2;
		const chartHeight = height - padding * 2;

		const points = data.map((value, index) => {
			const x = padding + (index / (data.length - 1)) * chartWidth;
			const y = padding + chartHeight - ((value - min) / range) * chartHeight;
			return { x, y };
		});

		// Create smooth curve using quadratic bezier
		let d = `M ${points[0].x} ${points[0].y}`;
		for (let i = 1; i < points.length; i++) {
			const prev = points[i - 1];
			const curr = points[i];
			const cpx = (prev.x + curr.x) / 2;
			d += ` Q ${cpx} ${prev.y} ${cpx} ${(prev.y + curr.y) / 2}`;
			if (i === points.length - 1) {
				d += ` T ${curr.x} ${curr.y}`;
			}
		}

		return d;
	});

	// Simpler path using line segments with slight smoothing
	const simplePath = $derived.by(() => {
		if (!data || data.length < 2) return '';

		const min = Math.min(...data);
		const max = Math.max(...data);
		const range = max - min || 1;

		const padding = 2;
		const chartWidth = width - padding * 2;
		const chartHeight = height - padding * 2;

		const points = data.map((value, index) => {
			const x = padding + (index / (data.length - 1)) * chartWidth;
			const y = padding + chartHeight - ((value - min) / range) * chartHeight;
			return `${x},${y}`;
		});

		return `M ${points.join(' L ')}`;
	});
</script>

<svg
	{width}
	{height}
	viewBox="0 0 {width} {height}"
	class="inline-block {className}"
	fill="none"
>
	<path d={simplePath} stroke={color} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
</svg>
