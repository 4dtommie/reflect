<script lang="ts">
	import { onMount } from 'svelte';
	import Chart from 'chart.js/auto';
	import 'chartjs-adapter-date-fns';
	import { nl } from 'date-fns/locale';

	export let data: { date: string; balance: number; type: 'history' | 'projection' }[] = [];
	export let previousSalaryDate: string | null = null;
	export let nextSalaryDate: string | null = null;
	export let currentBalance: number = 0;

	let chartCanvas: HTMLCanvasElement;
	let chart: Chart;

	function formatDateLabel(dateStr: string | null): string {
		if (!dateStr) return '';
		const d = new Date(dateStr);
		return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
	}

	onMount(() => {
		const ctx = chartCanvas.getContext('2d');
		if (!ctx) return;

		const historyData = data
			.filter((d) => d.type === 'history')
			.map((d) => ({ x: new Date(d.date), y: d.balance }));
		const lastHistory = historyData[historyData.length - 1];
		const projectionData = data
			.filter((d) => d.type === 'projection')
			.map((d) => ({ x: new Date(d.date), y: d.balance }));

		if (lastHistory) {
			projectionData.unshift(lastHistory);
		}

		// Create custom tick values for x-axis
		const prevDate = previousSalaryDate ? new Date(previousSalaryDate) : null;
		const nextDate = nextSalaryDate ? new Date(nextSalaryDate) : null;

		chart = new Chart(ctx, {
			type: 'line',
			data: {
				datasets: [
					{
						label: 'Historie',
						data: historyData,
						borderColor: '#f97316',
						borderWidth: 3,
						pointRadius: 0,
						tension: 0.3,
						fill: false
					},
					{
						label: 'Verwacht',
						data: projectionData,
						borderColor: '#f97316',
						borderWidth: 3,
						borderDash: [5, 5],
						pointRadius: 0,
						tension: 0.3,
						fill: false
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						display: false
					},
					tooltip: {
						mode: 'nearest',
						intersect: false,
						backgroundColor: 'rgba(26, 26, 26, 0.95)',
						titleColor: '#fff',
						bodyColor: '#fff',
						titleFont: { size: 14, weight: 'bold' },
						bodyFont: { size: 18, weight: 'bold' },
						padding: 16,
						cornerRadius: 12,
						displayColors: false,
						filter: (tooltipItem) =>
							tooltipItem.datasetIndex === 0 || tooltipItem.datasetIndex === 1,
						callbacks: {
							title: (items) => {
								if (items.length > 0) {
									const date = new Date(items[0].parsed.x);
									return date.toLocaleDateString('nl-NL', {
										weekday: 'short',
										day: 'numeric',
										month: 'long'
									});
								}
								return '';
							},
							label: (item) => {
								// Only show one label, not both datasets
								if (item.datasetIndex === 0 || (item.datasetIndex === 1 && item.dataIndex > 0)) {
									return `€ ${Math.round(item.parsed.y).toLocaleString('nl-NL')}`;
								}
								return '';
							}
						}
					}
				},
				scales: {
					x: {
						type: 'time',
						time: {
							unit: 'day'
						},
						grid: {
							display: false
						},
						afterBuildTicks: function (axis) {
							// Replace auto ticks with our custom positions
							const ticks = [];
							if (prevDate) {
								ticks.push({ value: prevDate.getTime() });
							}
							// Add a middle tick
							if (prevDate && nextDate) {
								const mid = prevDate.getTime() + (nextDate.getTime() - prevDate.getTime()) / 2;
								ticks.push({ value: mid });
							}
							if (nextDate) {
								ticks.push({ value: nextDate.getTime() });
							}
							axis.ticks = ticks;
						},
						ticks: {
							maxRotation: 0,
							autoSkip: false,
							color: '#9ca3af',
							callback: function (value, index, ticks) {
								if (index === 0 && prevDate) {
									return formatDateLabel(previousSalaryDate);
								}
								if (index === ticks.length - 1 && nextDate) {
									return formatDateLabel(nextSalaryDate);
								}
								if (index === 1) {
									return 'Huidige periode';
								}
								return '';
							}
						}
					},
					y: {
						grid: {
							color: 'rgba(156, 163, 175, 0.1)'
						},
						ticks: {
							color: '#9ca3af',
							callback: function (value) {
								// Only show the current balance tick
								if (Math.abs(Number(value) - currentBalance) < 50) {
									return '€' + currentBalance;
								}
								return '';
							}
						}
					}
				}
			}
		});

		return () => {
			if (chart) chart.destroy();
		};
	});
</script>

<div class="h-full w-full">
	<canvas bind:this={chartCanvas}></canvas>
</div>
