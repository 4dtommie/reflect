<script lang="ts">
	import { onMount } from 'svelte';
	import { Chart, registerables } from 'chart.js';
	import chartColors from '$lib/config/chartColors';

	Chart.register(...registerables);

	let {
		title,
		subtitle,
		monthlySpending = [],
		predictionData,
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
		predictionData?: {
			income: number;
			recurring: number;
			variable: number;
		};
		class?: string;
		compact?: boolean;
	} = $props();

	let chartCanvas: HTMLCanvasElement;
	let chartInstance: Chart | null = null;
	let dataRef: {
		chartData: typeof chartData;
		monthlySpending: typeof monthlySpending;
		currentMonthIndex: number;
	} | null = null;

	// Get current month key (YYYY-MM format)
	const currentMonthKey = $derived.by(() => {
		const now = new Date();
		return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
	});

	// Find if current month exists in the data
	const currentMonthIndex = $derived.by(() => {
		if (!monthlySpending || monthlySpending.length === 0) return -1;
		return monthlySpending.findIndex(({ month }) => month === currentMonthKey);
	});

	// Create diagonal stripe pattern for prediction areas
	const createStripePattern = (
		ctx: CanvasRenderingContext2D,
		baseColor: string
	): CanvasPattern | string => {
		const patternCanvas = document.createElement('canvas');
		patternCanvas.width = 10;
		patternCanvas.height = 10;
		const pctx = patternCanvas.getContext('2d');
		if (!pctx) return baseColor;

		// Fill with base color
		pctx.fillStyle = baseColor;
		pctx.fillRect(0, 0, 10, 10);

		// Add diagonal stripes
		pctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
		pctx.lineWidth = 2;
		pctx.beginPath();
		pctx.moveTo(0, 10);
		pctx.lineTo(10, 0);
		pctx.stroke();
		pctx.beginPath();
		pctx.moveTo(-5, 5);
		pctx.lineTo(5, -5);
		pctx.stroke();
		pctx.beginPath();
		pctx.moveTo(5, 15);
		pctx.lineTo(15, 5);
		pctx.stroke();

		const pattern = ctx.createPattern(patternCanvas, 'repeat');
		return pattern || baseColor;
	};

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
		// Replace current month with prediction data if available
		const recurringValues = monthlySpending.map(({ recurring }, i) => {
			if (i === currentMonthIndex && predictionData) {
				return predictionData.recurring;
			}
			return recurring || 0;
		});
		const variableValues = monthlySpending.map(({ variable }, i) => {
			if (i === currentMonthIndex && predictionData) {
				return predictionData.variable;
			}
			return variable || 0;
		});
		const savingsValues = monthlySpending.map(({ savings }) => savings || 0);
		const remainingValues = monthlySpending.map(({ remaining }) => remaining || 0);

		// Calculate cumulative values for proper stacked area chart visualization:
		// Each layer's data point represents the cumulative height from the base
		// Bottom: recurring (base)
		// Second: variable stacked on recurring
		// Third: remaining (income - expenses) stacked on variable + recurring

		const stackedVariable = recurringValues.map((recurring, i) => recurring + variableValues[i]);

		// Income line - use prediction data for current month
		const incomeLineValues = monthlySpending.map(({ recurringIncome }, i) => {
			if (i === currentMonthIndex && predictionData) {
				return predictionData.income;
			}
			return recurringIncome || 0;
		});

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
		dataRef = { chartData, monthlySpending, currentMonthIndex };

		// Custom plugin to draw diagonal stripes over prediction area
		const predictionStripePlugin = {
			id: 'predictionStripes',
			afterDatasetsDraw(chart: Chart) {
				if (currentMonthIndex < 0 || !chart.data.labels) return;

				const ctx = chart.ctx;
				const xAxis = chart.scales.x;
				const yAxis = chart.scales.y;

				// Get x positions for current month and previous month
				const currentX = xAxis.getPixelForValue(currentMonthIndex);
				const prevX =
					currentMonthIndex > 0 ? xAxis.getPixelForValue(currentMonthIndex - 1) : currentX - 50;

				// Draw diagonal stripes from prevX to right edge
				const stripeWidth = chart.width - prevX;
				const stripeHeight = yAxis.bottom - yAxis.top;

				if (stripeWidth <= 0) return;

				ctx.save();

				// Clip to the chart area from previous data point to edge
				ctx.beginPath();
				ctx.rect(prevX, yAxis.top, stripeWidth, stripeHeight);
				ctx.clip();

				// Draw diagonal white stripes
				ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
				ctx.lineWidth = 2;

				const spacing = 8;
				const totalDiagonals = Math.ceil((stripeWidth + stripeHeight) / spacing) * 2;

				for (let i = 0; i < totalDiagonals; i++) {
					const offset = i * spacing;
					ctx.beginPath();
					ctx.moveTo(prevX + offset, yAxis.bottom);
					ctx.lineTo(prevX + offset - stripeHeight, yAxis.top);
					ctx.stroke();
				}

				ctx.restore();
			}
		};

		chartInstance = new Chart(chartCanvas, {
			type: 'line',
			plugins: [predictionStripePlugin],
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
						order: 0,
						segment: {
							borderDash: (ctx: any) => (ctx.p1DataIndex === currentMonthIndex ? [5, 5] : undefined)
						}
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
						order: 1,
						segment: {
							borderDash: (ctx: any) => (ctx.p1DataIndex === currentMonthIndex ? [5, 5] : undefined)
						}
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
						order: 2,
						segment: {
							borderDash: (ctx: any) => (ctx.p1DataIndex === currentMonthIndex ? [5, 5] : undefined)
						}
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
						hidden: false,
						segment: {
							borderDash: (ctx: any) =>
								ctx.p1DataIndex === currentMonthIndex ? [6, 4] : undefined,
							borderColor: (ctx: any) =>
								ctx.p1DataIndex === currentMonthIndex ? 'rgba(34, 197, 94, 0.7)' : undefined
						}
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
								const monthName = date.toLocaleDateString('nl-NL', {
									month: 'long',
									year: 'numeric'
								});
								// Add "(projected)" suffix for current month
								return index === dataRef.currentMonthIndex ? `${monthName} (projected)` : monthName;
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
