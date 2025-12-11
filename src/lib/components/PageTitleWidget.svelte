<script lang="ts">
	import { onMount } from 'svelte';
	import { Chart, registerables } from 'chart.js';
	import chartColors from '$lib/config/chartColors';

	Chart.register(...registerables);

	let {
		title,
		subtitle,
		monthlySpending = [],
		class: className = '',
		compact = false
	}: {
		title: string;
		subtitle?: string;
		monthlySpending?: {
			month: string;
			recurring: number;
			variable: number;
			remaining: number;
			savings: number;
			income: number;
			recurringIncome?: number;
		}[];
		class?: string;
		compact?: boolean;
	} = $props();

	let chartCanvas: HTMLCanvasElement;
	let chartInstance: Chart | null = null;
	let dataRef: { chartData: typeof chartData; monthlySpending: typeof monthlySpending } | null =
		null;

	// Process monthly spending data for chart
	const chartData = $derived.by(() => {
		if (!monthlySpending || monthlySpending.length === 0) return null;

		// Get month labels (first letter of month name)
		const monthLabels = monthlySpending.map(({ month }) => {
			const [year, monthNum] = month.split('-');
			const date = new Date(parseInt(year), parseInt(monthNum) - 1);
			return date.toLocaleDateString('nl-NL', { month: 'short' })[0].toUpperCase();
		});

		// Extract recurring, variable, savings, and remaining values
		const recurringValues = monthlySpending.map(({ recurring }) => recurring || 0);
		const variableValues = monthlySpending.map(({ variable }) => variable || 0);
		const savingsValues = monthlySpending.map(({ savings }) => savings || 0);
		const remainingValues = monthlySpending.map(({ remaining }) => remaining || 0);

		// Calculate cumulative values for proper stacked area chart visualization:
		// Each layer's data point represents the cumulative height from the base
		// Bottom: recurring (base)
		// Second: variable stacked on recurring
		// Third: remaining (income - expenses) stacked on variable + recurring

		const stackedVariable = recurringValues.map((recurring, i) => recurring + variableValues[i]);

		// Income line - real monthly income values
		const incomeLineValues = monthlySpending.map(({ recurringIncome }) => recurringIncome || 0);

		// Remaining is effectively the income line (since it fills up to income)
		// We use income values as the top of the "remaining" stack
		const stackedRemaining = incomeLineValues;

		return {
			labels: monthLabels,
			recurring: recurringValues,
			variable: stackedVariable,
			remaining: stackedRemaining,
			income: incomeLineValues,
			// Keep raw individual values for tooltips
			rawRecurring: recurringValues,
			rawVariable: variableValues,
			// Calculate raw remaining as Income - (Recurring + Variable)
			rawRemaining: incomeLineValues.map((income, i) =>
				Math.max(0, income - recurringValues[i] - variableValues[i])
			),
			rawIncome: incomeLineValues
		};
	});

	// Solid fill color for free-to-spend gap (same as remaining/free color)
	const gapFillColor = chartColors.areaFill.remaining;

	onMount(() => {
		if (!chartCanvas || !chartData) return;

		// Store reference to data for tooltip callbacks
		dataRef = { chartData, monthlySpending };

		chartInstance = new Chart(chartCanvas, {
			type: 'line',
			data: {
				labels: chartData.labels,
				datasets: [
					{
						label: 'Recurring expenses',
						data: chartData.recurring,
						borderColor: chartColors.border.recurring,
						backgroundColor: chartColors.areaFill.recurring,
						fill: true,
						tension: 0.4,
						pointRadius: 0,
						pointHoverRadius: 4,
						order: 0
					},
					{
						label: 'Variable expenses',
						data: chartData.variable,
						borderColor: chartColors.border.variable,
						backgroundColor: chartColors.areaFill.variable, // Light purple from config
						fill: '-1',
						tension: 0.4,
						pointRadius: 0,
						pointHoverRadius: 4,
						order: 1
					},
					{
						label: 'Free to Spend',
						data: chartData.remaining,
						borderColor: 'transparent',
						backgroundColor: gapFillColor,
						fill: {
							target: '-1',
							above: gapFillColor, // Solid light blue
							below: 'rgba(239, 68, 68, 0.5)' // Over budget red
						},
						tension: 0.4,
						pointRadius: 0,
						pointHoverRadius: 4,
						order: 2
					},
					{
						label: 'Income',
						data: chartData.income,
						borderColor: '#22c55e', // Success Green
						backgroundColor: 'transparent',
						borderWidth: 3,
						fill: false,
						tension: 0.4,
						pointRadius: 0,
						pointHoverRadius: 4,
						order: 3, // Topmost
						hidden: false
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
						enabled: true,
						mode: 'index',
						intersect: false,
						position: 'average',
						xAlign: 'right',
						yAlign: 'center',
						caretPadding: 20,
						backgroundColor: 'rgba(0, 0, 0, 0.85)',
						padding: { left: 12, right: 16, top: 10, bottom: 10 },
						titleFont: {
							size: 12,
							weight: 'bold'
						},
						bodyFont: {
							size: 11,
							family: 'monospace'
						},
						bodySpacing: 4,
						itemSort: (a: any, b: any) => b.datasetIndex - a.datasetIndex, // Reverse order: Income, Free, Variable, Recurring
						callbacks: {
							title: (tooltipItems) => {
								if (!dataRef?.chartData || !dataRef?.monthlySpending) return '';
								const index = tooltipItems[0].dataIndex;
								const [year, monthNum] = dataRef.monthlySpending[index].month.split('-');
								const date = new Date(parseInt(year), parseInt(monthNum) - 1);
								return date.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
							},
							label: (context) => {
								if (!dataRef?.chartData) return '';
								const index = context.dataIndex;
								const datasetIndex = context.datasetIndex;
								let label = context.dataset.label || '';
								let value = 0;

								if (datasetIndex === 0) {
									// Recurring
									value = dataRef.chartData.rawRecurring[index];
								} else if (datasetIndex === 1) {
									// Variable
									value = dataRef.chartData.rawVariable[index];
								} else if (datasetIndex === 2) {
									// Free to Spend Gap
									// Show the calculated raw remaining or implied gap?
									// Raw remaining was calculated as Income - Expenses
									value = dataRef.chartData.rawRemaining[index];
									if (
										value === 0 &&
										dataRef.chartData.rawRecurring[index] + dataRef.chartData.rawVariable[index] >
											dataRef.chartData.rawIncome[index]
									) {
										// Technically "Over Budget" by X
										label = 'Over Budget';
										value =
											dataRef.chartData.rawRecurring[index] +
											dataRef.chartData.rawVariable[index] -
											dataRef.chartData.rawIncome[index];
									}
								} else if (datasetIndex === 3) {
									// Income
									value = dataRef.chartData.rawIncome[index];
								}

								const formatted = new Intl.NumberFormat('nl-NL', {
									style: 'currency',
									currency: 'EUR',
									minimumFractionDigits: 0,
									maximumFractionDigits: 0
								}).format(value);

								// Pad label for table-like alignment
								const paddedLabel = label.padEnd(20, ' ');
								return `${paddedLabel} ${formatted.padStart(10, ' ')}`;
							}
						}
					}
				},
				scales: {
					x: {
						display: false
					},
					y: {
						display: false,
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

			// Recurring
			chartInstance.data.datasets[0].data = chartData.recurring;

			// Variable
			chartInstance.data.datasets[1].data = chartData.variable;

			// Free Gap / Over Budget
			chartInstance.data.datasets[2].data = chartData.remaining;
			chartInstance.data.datasets[2].backgroundColor = gapFillColor;
			if (typeof chartInstance.data.datasets[2].fill === 'object') {
				(chartInstance.data.datasets[2].fill as any).above = gapFillColor;
			}

			// Income Line
			if (chartInstance.data.datasets[3]) {
				chartInstance.data.datasets[3].data = chartData.income;
				chartInstance.data.datasets[3].hidden = false;
			}

			// Update data reference for tooltips
			if (dataRef) {
				dataRef.chartData = chartData;
				dataRef.monthlySpending = monthlySpending;
			}
			chartInstance.update('none');
		}
	});
</script>

<div
	class="card rounded-3xl bg-base-100 shadow-xl transition-all duration-300 hover:shadow-2xl {className}"
>
	<div class="card-body justify-center px-8 py-6">
		<h1
			class="-mb-2 pb-2 leading-tight font-bold {compact
				? 'text-3xl lg:text-4xl'
				: 'text-6xl lg:text-7xl'}"
		>
			{title}
		</h1>
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
