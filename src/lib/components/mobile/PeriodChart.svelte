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
			.map((d) => ({ x: new Date(d.date).getTime(), y: d.balance }));
		const lastHistory = historyData[historyData.length - 1];
		const projectionData = data
			.filter((d) => d.type === 'projection')
			.map((d) => ({ x: new Date(d.date).getTime(), y: d.balance }));

		if (lastHistory) {
			projectionData.unshift(lastHistory);
		}

		// Create custom tick values for x-axis
		const prevDate = previousSalaryDate ? new Date(previousSalaryDate) : null;
		const nextDate = nextSalaryDate ? new Date(nextSalaryDate) : null;

		chart = new Chart(ctx as any, {
			type: 'line',
			data: {
				datasets: [
					{
						label: 'Historie',
						data: historyData,
						borderColor: '#5b21b6',
						borderWidth: 2,
						pointRadius: 0,
						tension: 0.3,
						fill: {
							target: 'origin'
						},
						backgroundColor: (ctxArg) => {
							const chartCtx = ctxArg.chart.ctx;
							const gradient = chartCtx.createLinearGradient(0, 0, 0, ctx.canvas.height);
							gradient.addColorStop(0, 'rgba(91,33,182,0.22)');
							gradient.addColorStop(1, 'rgba(91,33,182,0.06)');
							return gradient;
						}
					},
					{
						label: 'Verwacht',
						data: projectionData,
						borderColor: '#5b21b6',
						borderWidth: 2,
						borderDash: [6, 6],
						pointRadius: 0,
						tension: 0.3,
						fill: {
							target: 'origin'
						},
						backgroundColor: (ctxArg) => {
							const chartCtx = ctxArg.chart.ctx;
							const gradient = chartCtx.createLinearGradient(0, 0, 0, ctx.canvas.height);
							gradient.addColorStop(0, 'rgba(91,33,182,0.08)');
							gradient.addColorStop(1, 'rgba(91,33,182,0.00)');
							return gradient;
						}
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
									const px = items[0].parsed.x as number | string | Date | null | undefined;
									if (!px) return '';
									const date = new Date(px as number);
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
									const val = Number(item.parsed.y ?? 0);
									return `€ ${Math.round(val).toLocaleString('nl-NL')}`;
								}
								return '';
							}
						}
					}
				},
				// enable hover markers
				interaction: {
					mode: 'nearest',
					axis: 'x',
					intersect: false
				},
				elements: {
					point: {
						radius: 0,
						hoverRadius: 5
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
							// Replace auto ticks with our custom positions: previous salary, today, next salary
							const ticks = [];
							const today = new Date();
							const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
							if (prevDate) {
								ticks.push({ value: prevDate.getTime() });
							}
							// Ensure 'Vandaag' is inside the range; otherwise still include it
							ticks.push({ value: todayStart });
							if (nextDate) {
								ticks.push({ value: nextDate.getTime() });
							}
							axis.ticks = ticks;
						},
						ticks: {
							maxRotation: 0,
							autoSkip: false,
							color: '#6b7280',
							callback: function (value, index, ticks) {
								if (index === 0 && prevDate) {
									return formatDateLabel(previousSalaryDate);
								}
								if (index === ticks.length - 1 && nextDate) {
									return formatDateLabel(nextSalaryDate);
								}
								// Middle tick should be today
								if (ticks.length >= 3 && index === 1) {
									return 'Vandaag';
								}
								return '';
							}
						}
					},
					y: {
					grid: {
						color: 'rgba(107,117,128,0.08)'
					},
					ticks: {
						color: '#6b7280',
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
			,animation: {
				// disable built-in dataset animations; we'll reveal with custom plugin
				duration: 0
			}
			}
		});

		// plugin to draw a thin 'today' guide line
			const todayPlugin = {
			id: 'todayGuide',
			afterDraw(chart: any) {
				const { ctx, scales } = chart as any;
				if (!scales || !scales.x) return;
				const xScale = scales.x;
				const today = new Date();
				today.setHours(0,0,0,0);
				const x = xScale.getPixelForValue(today.getTime());
				if (isFinite(x)) {
					ctx.save();
					ctx.beginPath();
					ctx.moveTo(x, chart.chartArea.top);
					ctx.lineTo(x, chart.chartArea.bottom);
					ctx.lineWidth = 1;
					ctx.strokeStyle = 'rgba(91,33,182,0.12)';
					ctx.setLineDash([2,2]);
					ctx.stroke();
					ctx.restore();
				}
			}
		};

			chart.config.plugins = chart.config.plugins || [];
			chart.config.plugins.push(todayPlugin);
		chart.update('none');

		// Add reveal plugin which clips the drawing horizontally to animate line reveal
		const revealPlugin = {
			id: 'revealLine',
			beforeInit(chart: any) {
				(chart as any)._reveal = { progress: 0, start: null as number | null, raf: null as number | null };
			},
			beforeDraw(chart: any) {
				const progress = (chart as any)._reveal?.progress ?? 1;
				const ca = chart.chartArea;
				if (!ca) return;
				const ctx = chart.ctx;
				ctx.save();
				ctx.beginPath();
				ctx.rect(ca.left, ca.top, ca.width * progress, ca.bottom - ca.top);
				ctx.clip();
			},
			afterDraw(chart: any) {
				// restore after draw so axes and overlays aren't clipped
				(chart as any).ctx.restore();
			},
			afterInit(chart: any, args: any, options: any) {
				const duration = 900;
				function step(ts: number) {
					if (!(chart as any)._reveal.start) (chart as any)._reveal.start = ts;
					const t = Math.min(1, (ts - (chart as any)._reveal.start) / duration);
					(chart as any)._reveal.progress = t;
					chart.update('none');
					if (t < 1) (chart as any)._reveal.raf = requestAnimationFrame(step);
				}
				(chart as any)._reveal.raf = requestAnimationFrame(step);
			},
			beforeDestroy(chart: any) {
				if ((chart as any)._reveal?.raf) cancelAnimationFrame((chart as any)._reveal.raf);
			}
			};

		// Register plugin locally on this chart instance
		chart.config.plugins = chart.config.plugins || [];
		chart.config.plugins.push(revealPlugin);

		// kick off a single update to register plugin and start animation
		chart.update('none');

		return () => {
			if (chart) chart.destroy();
		};
	});
</script>

<div class="h-full w-full">
	<canvas bind:this={chartCanvas}></canvas>
</div>
