<script lang="ts">
	import { onMount } from 'svelte';
	import { Chart, registerables } from 'chart.js';

	Chart.register(...registerables);

	let {
		title,
		subtitle,
		monthlySpending = [],
		class: className = ''
	}: {
		title: string;
		subtitle?: string;
		monthlySpending?: { month: string; recurring: number; variable: number; remaining: number }[];
		class?: string;
	} = $props();

	let chartCanvas: HTMLCanvasElement;
	let chartInstance: Chart | null = null;

	// Process monthly spending data for chart
	const chartData = $derived.by(() => {
		if (!monthlySpending || monthlySpending.length === 0) return null;

		// Get month labels (first letter of month name)
		const monthLabels = monthlySpending.map(({ month }) => {
			const [year, monthNum] = month.split('-');
			const date = new Date(parseInt(year), parseInt(monthNum) - 1);
			return date.toLocaleDateString('nl-NL', { month: 'short' })[0].toUpperCase();
		});

		// Extract recurring, variable, and remaining values
		const recurringValues = monthlySpending.map(({ recurring }) => recurring);
		const variableValues = monthlySpending.map(({ variable }) => variable);
		const remainingValues = monthlySpending.map(({ remaining }) => remaining);
		
		// Calculate stacked values for proper layering:
		// Bottom: recurring
		// Middle: variable (stacked on recurring)
		// Top: remaining (stacked on variable + recurring)
		const stackedVariable = recurringValues.map((recurring, i) => recurring + variableValues[i]);
		const stackedRemaining = stackedVariable.map((variableStack, i) => variableStack + remainingValues[i]);

		return {
			labels: monthLabels,
			recurring: recurringValues,
			variable: stackedVariable,
			remaining: stackedRemaining
		};
	});

	onMount(() => {
		if (!chartCanvas || !chartData) return;

		// Dark purple: rgb(139, 92, 246) - #8B5CF6 (recurring)
		// Light purple: rgb(196, 181, 253) - #C4B5FD (variable)
		// Light blue: rgb(14, 165, 233) - #0EA5E9 (remaining, matching sky-600)
		
		chartInstance = new Chart(chartCanvas, {
			type: 'line',
			data: {
				labels: chartData.labels,
				datasets: [
					{
						label: 'Recurring expenses',
						data: chartData.recurring,
						borderColor: 'rgb(139, 92, 246)',
						backgroundColor: 'rgba(139, 92, 246, 0.6)',
						fill: true,
						tension: 0.4,
						pointRadius: 0,
						pointHoverRadius: 4,
						order: 1
					},
					{
						label: 'Variable expenses',
						data: chartData.variable,
						borderColor: 'rgb(196, 181, 253)',
						backgroundColor: 'rgba(196, 181, 253, 0.5)',
						fill: '-1',
						tension: 0.4,
						pointRadius: 0,
						pointHoverRadius: 4,
						order: 2
					},
					{
						label: 'Remaining expenses',
						data: chartData.remaining,
						borderColor: 'rgb(14, 165, 233)',
						backgroundColor: 'rgba(14, 165, 233, 0.4)',
						fill: '-1',
						tension: 0.4,
						pointRadius: 0,
						pointHoverRadius: 4,
						order: 3
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: {
					mode: 'index',
					intersect: false
				},
				plugins: {
					legend: {
						display: false
					},
					tooltip: {
						enabled: false
					}
				},
				scales: {
					x: {
						display: false,
						stacked: true
					},
					y: {
						display: false,
						stacked: true,
						beginAtZero: true
					}
				},
				elements: {
					line: {
						borderWidth: 0
					}
				}
			}
		});

		return () => {
			if (chartInstance) {
				chartInstance.destroy();
				chartInstance = null;
			}
		};
	});

	// Update chart when data changes
	$effect(() => {
		if (chartInstance && chartData) {
			chartInstance.data.labels = chartData.labels;
			chartInstance.data.datasets[0].data = chartData.recurring;
			chartInstance.data.datasets[1].data = chartData.variable;
			chartInstance.data.datasets[2].data = chartData.remaining;
			chartInstance.update('none');
		}
	});
</script>

<div class="card rounded-3xl bg-base-100 shadow-xl transition-all duration-300 hover:shadow-2xl {className}">
	<div class="card-body justify-center px-8 py-6">
		<h1 class="mb-2 text-6xl font-bold lg:text-7xl">{title}</h1>
		{#if subtitle}
			<p class="mb-4 text-2xl opacity-70">{subtitle}</p>
		{/if}
		
		{#if chartData}
			<!-- Stacked Area Chart -->
			<div class="relative h-32 w-full">
				<canvas bind:this={chartCanvas}></canvas>
				
				<!-- Month labels -->
				<div class="absolute bottom-0 flex w-full justify-between px-2 text-[10px] opacity-50">
					{#each chartData.labels as label}
						<span>{label}</span>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>
