<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		Chart,
		CategoryScale,
		LinearScale,
		BarElement,
		BarController,
		LineElement,
		LineController,
		PointElement,
		Title,
		Tooltip,
		Legend,
		Filler
	} from 'chart.js';
	import { browser } from '$app/environment';
	import { HelpCircle, Trash2 } from 'lucide-svelte';
	import * as Icons from 'lucide-svelte';
	import { invalidateAll } from '$app/navigation';
	import UploadCTAWidget from '$lib/components/UploadCTAWidget.svelte';
	import TransactionStatsWidget from '$lib/components/TransactionStatsWidget.svelte';
	import DashboardWidget from '$lib/components/DashboardWidget.svelte';
	import PageTitleWidget from '$lib/components/PageTitleWidget.svelte';
	import Amount from '$lib/components/Amount.svelte';

	// Register Chart.js components
	Chart.register(
		CategoryScale,
		LinearScale,
		BarElement,
		BarController,
		LineElement,
		LineController,
		PointElement,
		Title,
		Tooltip,
		Legend,
		Filler
	);

	// Register zoom plugin only in browser (SSR-safe)
	if (browser) {
		import('chartjs-plugin-zoom').then((module) => {
			const zoomPlugin = module.default;
			Chart.register(zoomPlugin);
		});
	}

	let { data }: { data: { transactions: any[]; stats: any | null } } = $props();
	let chartCanvas: HTMLCanvasElement | null = $state(null);
	let chartInstance: Chart | null = $state(null);
	let chartContainer: HTMLDivElement | null = $state(null);
	let showHint = $state(true);
	let isDragging = $state(false);
	let showDeleteConfirm = $state(false);
	let deleting = $state(false);
	let deleteError = $state<string | null>(null);

	function formatDate(date: Date | string): string {
		const d = typeof date === 'string' ? new Date(date) : date;
		const day = d.getDate();
		const month = d.toLocaleDateString('en-US', { month: 'short' }).toLowerCase();
		return `${day} ${month}`;
	}

	function formatAmount(amount: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'EUR'
		}).format(amount);
	}

	function formatAmountNoDecimals(amount: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'EUR',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(amount);
	}

	function getWeekOfMonth(date: Date | string): number {
		const d = typeof date === 'string' ? new Date(date) : date;
		const dayOfMonth = d.getDate();
		// Week 1 = days 1-7, Week 2 = days 8-14, Week 3 = days 15-21, Week 4 = days 22-28, Week 5 = days 29+
		return Math.ceil(dayOfMonth / 7);
	}

	function getMonthDayKey(date: Date | string): string {
		const d = typeof date === 'string' ? new Date(date) : date;
		return `${d.getMonth()}-${d.getDate()}`;
	}

	function getWeekKey(date: Date | string): string {
		const d = typeof date === 'string' ? new Date(date) : date;
		const weekNum = getWeekOfMonth(d);
		return `${d.getFullYear()}-${d.getMonth()}-week${weekNum}`;
	}

	function getCategoryIcon(iconName: string | null | undefined) {
		if (!iconName) return null;
		return (Icons as any)[iconName] || null;
	}

	async function deleteAllTransactions() {
		deleting = true;
		deleteError = null;

		try {
			const response = await fetch('/api/transactions', {
				method: 'DELETE'
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || data.message || 'Failed to delete transactions');
			}

			const result = await response.json();
			console.log(`✅ Deleted ${result.deletedCount} transactions`);

			// Refresh the page
			await invalidateAll();
			showDeleteConfirm = false;
		} catch (err) {
			deleteError = err instanceof Error ? err.message : 'Failed to delete transactions';
			console.error('❌ Error deleting transactions:', err);
		} finally {
			deleting = false;
		}
	}

	// Group transactions by week, then by day
	const groupedTransactions = $derived(() => {
		// First group by week
		const weekGroups: Map<string, Map<string, typeof data.transactions>> = new Map();

		for (const transaction of data.transactions) {
			const weekKey = getWeekKey(transaction.date);
			const dayKey = getMonthDayKey(transaction.date);

			if (!weekGroups.has(weekKey)) {
				weekGroups.set(weekKey, new Map());
			}

			const dayGroups = weekGroups.get(weekKey)!;
			if (!dayGroups.has(dayKey)) {
				dayGroups.set(dayKey, []);
			}

			dayGroups.get(dayKey)!.push(transaction);
		}

		// Convert to array structure: [weekKey, weekNumber, [dayKey, transactions][], totalSpending]
		const result: Array<{
			weekKey: string;
			weekNumber: number;
			days: Array<[string, typeof data.transactions]>;
			totalSpending: number;
		}> = [];

		for (const [weekKey, dayGroups] of weekGroups.entries()) {
			// Get week number from first transaction in first day
			const firstDay = Array.from(dayGroups.values())[0];
			const weekNumber = getWeekOfMonth(firstDay[0].date);

			// Calculate total spending for the week (only debit transactions)
			let totalSpending = 0;
			for (const dayTransactions of dayGroups.values()) {
				for (const transaction of dayTransactions) {
					if (transaction.is_debit) {
						totalSpending += transaction.amount;
					}
				}
			}

			// Sort days within week (newest first)
			const sortedDays = Array.from(dayGroups.entries()).sort(([keyA], [keyB]) => {
				const dateA = new Date(dayGroups.get(keyA)![0].date);
				const dateB = new Date(dayGroups.get(keyB)![0].date);
				return dateB.getTime() - dateA.getTime();
			});

			result.push({
				weekKey,
				weekNumber,
				days: sortedDays,
				totalSpending
			});
		}

		// Sort weeks (newest first)
		result.sort((a, b) => {
			const dateA = new Date(a.days[0][1][0].date);
			const dateB = new Date(b.days[0][1][0].date);
			return dateB.getTime() - dateA.getTime();
		});

		return result;
	});

	// Get monthly stats from server (all transactions) and structure by month
	const monthlyStats = $derived(() => {
		if (!data.stats) {
			return { monthlyData: [], averageMonthlySpending: 0, averageMonthlyIncome: 0 };
		}

		// Parse month totals correctly - use year and month from API
		const monthlyData = data.stats.monthlyTotals
			.map((m: any) => {
				// Use year and month directly from API response
				const year = m.year;
				const month = m.month;
				const date = new Date(year, month, 1);

				// Ensure spending and income are numbers
				const spending =
					typeof m.spending === 'number' ? m.spending : typeof m.total === 'number' ? m.total : 0;
				const income = typeof m.income === 'number' ? m.income : 0;

				return {
					monthKey: `${year}-${month}`,
					total: spending, // For backward compatibility
					spending: Number(spending),
					income: Number(income),
					date,
					year,
					month
				};
			})
			.sort((a: any, b: any) => b.date.getTime() - a.date.getTime());

		// Calculate averages
		const totalSpending = monthlyData.reduce((sum: number, m: any) => sum + (m.spending || 0), 0);
		const totalIncome = monthlyData.reduce((sum: number, m: any) => sum + (m.income || 0), 0);
		const avgSpending = monthlyData.length > 0 ? totalSpending / monthlyData.length : 0;
		const avgIncome = monthlyData.length > 0 ? totalIncome / monthlyData.length : 0;

		return {
			monthlyData,
			averageMonthlySpending: data.stats.averageMonthlySpending || avgSpending,
			averageMonthlyIncome: avgIncome
		};
	});

	// Get weekly averages from server (calculated from all transactions)
	const weeklyAverages = $derived(() => {
		if (!data.stats || !data.stats.weeklyAverages) {
			return new Map<number, number>();
		}
		// Convert object to Map
		return new Map(
			Object.entries(data.stats.weeklyAverages).map(([k, v]) => [Number(k), v as number])
		);
	});

	// Get last full month vs last year same month comparison
	const lastFullMonthComparison = $derived(() => {
		if (!data.stats || !monthlyStats().monthlyData.length) {
			return {
				month: null,
				year: null,
				monthSpending: 0,
				lastYearMonthSpending: 0,
				difference: 0,
				percentageChange: 0,
				averageMonthlySpending: monthlyStats().averageMonthlySpending || 0
			};
		}

		const now = new Date();
		const currentYear = now.getFullYear();
		const currentMonth = now.getMonth();

		// Find the last full month (not the current month if we're still in it)
		// Get all months sorted by date (newest first)
		const sortedMonths = [...monthlyStats().monthlyData].sort(
			(a: any, b: any) => b.date.getTime() - a.date.getTime()
		);

		// Find the last complete month (exclude current month if we're still in it)
		let lastFullMonth = sortedMonths.find((m: any) => {
			// If the month is before the current month, it's complete
			if (m.year < currentYear) return true;
			if (m.year === currentYear && m.month < currentMonth) return true;
			return false;
		});

		// If no month found before current, use the most recent month in data
		if (!lastFullMonth && sortedMonths.length > 0) {
			lastFullMonth = sortedMonths[0];
		}

		if (!lastFullMonth) {
			return {
				month: null,
				year: null,
				monthSpending: 0,
				lastYearMonthSpending: 0,
				difference: 0,
				percentageChange: 0,
				averageMonthlySpending: monthlyStats().averageMonthlySpending || 0
			};
		}

		const monthYear = lastFullMonth.year;
		const monthMonth = lastFullMonth.month;
		const monthSpending = lastFullMonth.spending || 0;

		// Find last year same month spending
		const lastYearMonthData = monthlyStats().monthlyData.find(
			(m: any) => m.year === monthYear - 1 && m.month === monthMonth
		);
		const lastYearMonthSpending = lastYearMonthData?.spending || 0;

		// Calculate difference and percentage change
		const difference = monthSpending - lastYearMonthSpending;
		const percentageChange =
			lastYearMonthSpending > 0 ? (difference / lastYearMonthSpending) * 100 : 0;

		return {
			month: monthMonth,
			year: monthYear,
			monthSpending,
			lastYearMonthSpending,
			difference,
			percentageChange,
			averageMonthlySpending: monthlyStats().averageMonthlySpending || 0
		};
	});

	// Group transactions by month for display
	const transactionsByMonth = $derived(() => {
		type WeekGroup = {
			weekKey: string;
			weekNumber: number;
			days: Array<[string, typeof data.transactions]>;
			totalSpending: number;
		};
		const monthMap = new Map<string, WeekGroup[]>();

		for (const weekGroup of groupedTransactions()) {
			if (weekGroup.days.length === 0) continue;

			const firstTransaction = weekGroup.days[0][1][0];
			const d =
				typeof firstTransaction.date === 'string'
					? new Date(firstTransaction.date)
					: firstTransaction.date;
			const monthKey = `${d.getFullYear()}-${d.getMonth()}`;

			if (!monthMap.has(monthKey)) {
				monthMap.set(monthKey, []);
			}
			monthMap.get(monthKey)!.push(weekGroup);
		}

		// Convert to array and get month info
		return Array.from(monthMap.entries())
			.map(([monthKey, weekGroups]) => {
				const firstTransaction = weekGroups[0].days[0][1][0];
				const d =
					typeof firstTransaction.date === 'string'
						? new Date(firstTransaction.date)
						: firstTransaction.date;
				const monthTotal = monthlyStats().monthlyData.find((m: any) => m.monthKey === monthKey);

				return {
					monthKey,
					year: d.getFullYear(),
					month: d.getMonth(),
					date: new Date(d.getFullYear(), d.getMonth(), 1),
					weekGroups,
					monthTotal: monthTotal?.total || 0
				};
			})
			.sort((a, b) => b.date.getTime() - a.date.getTime());
	});

	// Prepare real chart data from server-side monthly stats
	const chartData = $derived(() => {
		if (!monthlyStats().monthlyData.length) {
			return null;
		}

		// Sort months chronologically (oldest first) for the chart
		const months = [...monthlyStats().monthlyData].sort(
			(a: any, b: any) => a.date.getTime() - b.date.getTime()
		);

		if (months.length === 0) {
			return null;
		}

		const spending = months.map((m: any) => m.spending || 0);
		const income = months.map((m: any) => m.income || 0);

		// Calculate min and max values for Y-axis, excluding extremes
		const allValues = [...spending, ...income].filter((v) => v !== null && v !== undefined);
		const avgValues = [
			monthlyStats().averageMonthlySpending,
			monthlyStats().averageMonthlyIncome
		].filter((v) => v && v > 0);

		const validValues = [...allValues, ...avgValues].filter((v) => v > 0); // Exclude zeros

		let yAxisMin = 0;
		let yAxisMax = 0;

		if (validValues.length > 0) {
			// Calculate actual min and max from data
			const actualMin = Math.min(...validValues);
			const actualMax = Math.max(...validValues);

			// For extremes: use percentiles if we have enough data, otherwise use min/max
			yAxisMin = actualMin;
			yAxisMax = actualMax;

			if (validValues.length >= 4) {
				// Sort values to find percentiles
				const sortedValues = [...validValues].sort((a, b) => a - b);

				// Calculate quartiles for IQR-based outlier detection
				const q1Index = Math.floor(sortedValues.length * 0.25);
				const q3Index = Math.floor(sortedValues.length * 0.75);
				const q1 = sortedValues[q1Index];
				const q3 = sortedValues[q3Index];
				const iqr = q3 - q1;

				// Use 1st percentile for min (bottom 1%)
				const percentile1Index = Math.max(0, Math.floor(sortedValues.length * 0.01));
				yAxisMin = sortedValues[percentile1Index];

				// Determine max using outlier detection
				const maxValue = sortedValues[sortedValues.length - 1];
				// Upper fence: Q3 + 1.5 * IQR (standard outlier detection)
				const upperFence = q3 + 1.5 * iqr;

				if (maxValue > upperFence) {
					// There are outliers - cap at upper fence or 95th percentile, whichever is lower
					const percentile95Index = Math.min(
						sortedValues.length - 1,
						Math.floor(sortedValues.length * 0.95)
					);
					const percentile95Value = sortedValues[percentile95Index];
					// Use the lower of the two to provide better visual space
					yAxisMax = Math.min(upperFence, percentile95Value * 1.15);
				} else {
					// No significant outliers - use 95th percentile
					const percentile95Index = Math.min(
						sortedValues.length - 1,
						Math.floor(sortedValues.length * 0.95)
					);
					yAxisMax = sortedValues[percentile95Index];
				}
			}

			// Add padding: more at bottom (10% of range), less at top (3% of range)
			const range = yAxisMax - yAxisMin;
			const bottomPadding = range * 0.1; // Extra space below minimum
			const topPadding = range * 0.03;
			yAxisMin = Math.max(0, yAxisMin - bottomPadding);
			yAxisMax = yAxisMax + topPadding;
		}

		// Create labels with lowercase month names and identify year transitions
		const labels: string[] = [];
		const yearTransitions: number[] = []; // Index positions where year changes

		months.forEach((m: any, index: number) => {
			if (index > 0) {
				const prevMonth = months[index - 1];

				// Check if we transitioned from December to January (year change)
				if (prevMonth.date.getMonth() === 11 && m.date.getMonth() === 0) {
					yearTransitions.push(index);
				}
			}

			// Lowercase month name without year
			labels.push(m.date.toLocaleDateString('en-US', { month: 'short' }).toLowerCase());
		});

		return {
			labels,
			yearTransitions, // Store transition points for visual dividers
			spending,
			income,
			avgSpending: monthlyStats().averageMonthlySpending,
			avgIncome: monthlyStats().averageMonthlyIncome,
			yAxisMin,
			yAxisMax
		};
	});

	// Initialize chart when canvas and data are available
	$effect(() => {
		const canvas = chartCanvas;
		const chartDataValue = chartData();

		if (!canvas || !chartDataValue) {
			return;
		}

		// Prevent multiple chart creations
		if (chartInstance) {
			return;
		}

		const timeoutId = setTimeout(() => {
			if (!canvas || chartInstance) return;

			// Calculate initial view to show last 9 months
			const totalLabels = chartDataValue.labels.length;
			const monthsToShow = 9;
			const initialMin = Math.max(0, totalLabels - monthsToShow);
			const initialMax = totalLabels - 1;

			// Define year divider plugin
			const yearDividerPlugin = {
				id: 'yearDivider',
				afterDraw: (chart: any) => {
					const ctx = chart.ctx;
					const chartArea = chart.chartArea;
					const yearTransitions = chartDataValue.yearTransitions || [];

					if (yearTransitions.length === 0) return;

					const xScale = chart.scales.x;

					yearTransitions.forEach((transitionIndex: number) => {
						const x = xScale.getPixelForValue(transitionIndex);

						if (x >= chartArea.left && x <= chartArea.right) {
							ctx.save();
							ctx.strokeStyle = 'rgba(156, 163, 175, 0.5)';
							ctx.lineWidth = 1;
							ctx.setLineDash([5, 5]);
							ctx.beginPath();
							ctx.moveTo(x, chartArea.top);
							ctx.lineTo(x, chartArea.bottom);
							ctx.stroke();
							ctx.restore();
						}
					});
				}
			};

			// Define gradient fill plugin for both spending and income lines
			const gradientFillPlugin = {
				id: 'gradientFill',
				beforeDatasetsDraw: (chart: any) => {
					const ctx = chart.ctx;
					const chartArea = chart.chartArea;

					if (!chartArea) return;

					// Handle spending dataset (purple-blue gradient)
					const spendingDataset = chart.data.datasets[0];
					if (spendingDataset && spendingDataset.fill) {
						const spendingGradient = ctx.createLinearGradient(
							chartArea.left, // x0 - same x
							chartArea.top, // y0 - top (purple)
							chartArea.left, // x1 - same x
							chartArea.bottom // y1 - bottom (blue)
						);

						// Purple to blue gradient
						spendingGradient.addColorStop(0, 'rgba(147, 51, 234, 0.3)'); // Purple at top
						spendingGradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.25)'); // Indigo in middle
						spendingGradient.addColorStop(1, 'rgba(59, 130, 246, 0.2)'); // Blue at bottom

						spendingDataset.backgroundColor = spendingGradient;
					}

					// Handle income dataset (green-blue gradient)
					const incomeDataset = chart.data.datasets[1];
					if (incomeDataset && incomeDataset.fill) {
						const incomeGradient = ctx.createLinearGradient(
							chartArea.left, // x0 - same x
							chartArea.top, // y0 - top (green)
							chartArea.left, // x1 - same x
							chartArea.bottom // y1 - bottom (blue)
						);

						// Green to blue gradient
						incomeGradient.addColorStop(0, 'rgba(5, 150, 105, 0.3)'); // Emerald-600 at top
						incomeGradient.addColorStop(0.5, 'rgba(14, 165, 233, 0.25)'); // Sky-500 in middle
						incomeGradient.addColorStop(1, 'rgba(59, 130, 246, 0.2)'); // Blue-500 at bottom

						incomeDataset.backgroundColor = incomeGradient;
					}
				}
			};

			// Define edge fade gradients plugin - draws only in chart area
			const edgeFadePlugin = {
				id: 'edgeFade',
				afterDraw: (chart: any) => {
					const ctx = chart.ctx;
					const chartArea = chart.chartArea;
					const xScale = chart.scales.x;

					// Get current zoom/pan state
					const minValue = xScale.min;
					const maxValue = xScale.max;
					const totalLabels = chartDataValue.labels.length;

					// Calculate fade width
					const fadeWidth = 64; // 16 * 4 = 64px

					// Left fade - show if not at the beginning
					if (minValue > 0) {
						// Horizontal gradient: x changes, y stays the same
						// createLinearGradient(x0, y0, x1, y1)
						const y = chartArea.top; // Use same Y for both points
						const gradientLeft = ctx.createLinearGradient(
							chartArea.left, // x0 - left edge
							y, // y0 - same y
							chartArea.left + fadeWidth, // x1 - right edge of fade
							y // y1 - same y (horizontal gradient)
						);
						gradientLeft.addColorStop(0, 'rgba(31, 41, 55, 0.08)'); // Very subtle at left
						gradientLeft.addColorStop(1, 'rgba(31, 41, 55, 0)'); // Transparent at right

						ctx.fillStyle = gradientLeft;
						ctx.fillRect(
							chartArea.left,
							chartArea.top,
							fadeWidth,
							chartArea.bottom - chartArea.top
						);
					}

					// Right fade - show if not at the end
					if (maxValue < totalLabels - 1) {
						// Horizontal gradient: x changes, y stays the same
						// createLinearGradient(x0, y0, x1, y1)
						const y = chartArea.top; // Use same Y for both points
						const gradientRight = ctx.createLinearGradient(
							chartArea.right - fadeWidth, // x0 - left edge of fade
							y, // y0 - same y
							chartArea.right, // x1 - right edge
							y // y1 - same y (horizontal gradient)
						);
						gradientRight.addColorStop(0, 'rgba(31, 41, 55, 0)'); // Transparent at left
						gradientRight.addColorStop(1, 'rgba(31, 41, 55, 0.08)'); // Very subtle at right

						ctx.fillStyle = gradientRight;
						ctx.fillRect(
							chartArea.right - fadeWidth,
							chartArea.top,
							fadeWidth,
							chartArea.bottom - chartArea.top
						);
					}
				}
			};

			try {
				console.log('Creating chart with data:', chartDataValue);
				// Define and register year divider plugin
				const yearDividerPlugin = {
					id: 'yearDivider',
					afterDraw: (chart: any) => {
						const ctx = chart.ctx;
						const chartArea = chart.chartArea;
						const yearTransitions = (chart.data as any)._yearTransitions || [];

						if (yearTransitions.length === 0) return;

						const xScale = chart.scales.x;

						yearTransitions.forEach((transitionIndex: number) => {
							const x = xScale.getPixelForValue(transitionIndex);

							if (x >= chartArea.left && x <= chartArea.right) {
								ctx.save();
								ctx.strokeStyle = 'rgba(156, 163, 175, 0.5)';
								ctx.lineWidth = 1;
								ctx.setLineDash([5, 5]);
								ctx.beginPath();
								ctx.moveTo(x, chartArea.top);
								ctx.lineTo(x, chartArea.bottom);
								ctx.stroke();
								ctx.restore();
							}
						});
					}
				};

				// Register the plugins
				Chart.register(yearDividerPlugin, gradientFillPlugin, edgeFadePlugin);

				chartInstance = new Chart(canvas, {
					type: 'line',
					data: {
						// No labels needed when using x/y coordinates
						datasets: [
							{
								label: 'Monthly Spending',
								data: chartDataValue.spending.map((value, index) => ({ x: index, y: value })),
								borderColor: 'rgba(220, 38, 38, 1)', // red-600
								backgroundColor: 'rgba(220, 38, 38, 0.05)', // Will be overridden by plugin
								borderWidth: 1,
								fill: true,
								tension: 0.4,
								pointRadius: 3,
								pointHoverRadius: 5
							},
							{
								label: 'Income',
								data: chartDataValue.income.map((value, index) => ({ x: index, y: value })),
								borderColor: 'rgba(5, 150, 105, 1)', // emerald-600
								backgroundColor: 'rgba(5, 150, 105, 0.05)', // Will be overridden by plugin
								borderWidth: 1,
								fill: true,
								tension: 0.4,
								pointRadius: 3,
								pointHoverRadius: 5
							},
							{
								label: 'Avg Spending',
								data: chartDataValue.spending.map((_, index) => ({
									x: index,
									y: chartDataValue.avgSpending
								})),
								borderColor: 'rgba(220, 38, 38, 1)', // red-600
								borderWidth: 1,
								borderDash: [5, 5],
								fill: false,
								tension: 0,
								pointRadius: 0
							},
							{
								label: 'Avg Income',
								data: chartDataValue.income.map((_, index) => ({
									x: index,
									y: chartDataValue.avgIncome
								})),
								borderColor: 'rgba(5, 150, 105, 1)', // emerald-600
								borderWidth: 1,
								borderDash: [5, 5],
								fill: false,
								tension: 0,
								pointRadius: 0
							}
						]
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						layout: {
							padding: 0
						},
						plugins: {
							legend: {
								display: false
							},
							// @ts-ignore - zoom plugin options
							zoom: {
								pan: {
									enabled: true,
									mode: 'x',
									threshold: 10,
									onPan: function () {
										// Force chart update after panning (triggers edgeFade plugin to redraw)
										if (chartInstance) {
											chartInstance.update('none');
										}
										// Hide hint on interaction
										showHint = false;
									}
								},
								zoom: {
									wheel: {
										enabled: true,
										speed: 0.1
									},
									pinch: {
										enabled: true
									},
									mode: 'x',
									onZoom: function () {
										// Force chart update after zooming (triggers edgeFade plugin to redraw)
										if (chartInstance) {
											chartInstance.update('none');
										}
										// Hide hint on interaction
										showHint = false;
									}
								}
							}
						},
						scales: {
							y: {
								beginAtZero: false,
								min: chartDataValue.yAxisMin,
								max: chartDataValue.yAxisMax,
								ticks: {
									callback: function (value: any) {
										// Format currency without decimals
										return '€' + Math.round(value).toLocaleString();
									}
								}
							},
							x: {
								type: 'linear',
								position: 'bottom',
								grid: {
									display: false
								},
								min: initialMin, // Initial view - last 9 months
								max: initialMax,
								ticks: {
									stepSize: 1,
									callback: function (value: any) {
										const index = Math.round(value);
										const labels = chartDataValue.labels;
										if (labels && labels[index] !== undefined) {
											return labels[index];
										}
										return '';
									}
								}
							}
						},
						animation: {
							duration: 0
						}
					}
				});
				// Set initial zoom to show last 9 months after chart is created
				setTimeout(() => {
					if (chartInstance) {
						try {
							// For CategoryScale, use resetZoom and then zoom to specific range
							const chart = chartInstance as any;
							if (chart.zoomScale) {
								// Reset first
								chart.resetZoom();
								// Then zoom to show last 9 months
								setTimeout(() => {
									chart.zoomScale('x', {
										min: initialMin,
										max: initialMax
									});
									chart.update('none'); // Update without animation
								}, 50);
							}
						} catch (e) {
							console.warn('Could not set initial zoom:', e);
						}
					}
				}, 300);

				console.log('Chart created successfully', {
					labels: chartDataValue.labels.length,
					spending: chartDataValue.spending.length,
					income: chartDataValue.income.length,
					initialView: { min: initialMin, max: initialMax }
				});
			} catch (error) {
				console.error('Error creating chart:', error);
				chartInstance = null;
			}
		}, 200);

		return () => {
			clearTimeout(timeoutId);
		};
	});

	// Handle container resize to keep chart within bounds
	$effect(() => {
		const container = chartContainer;
		if (!container || !chartInstance) return;

		const resizeObserver = new ResizeObserver(() => {
			if (chartInstance && container) {
				// Ensure chart resizes to fit container and doesn't exceed bounds
				const containerWidth = container.clientWidth;
				if (containerWidth > 0) {
					// Force canvas to respect container width
					const canvas = chartInstance.canvas;
					if (canvas && canvas.width > containerWidth) {
						canvas.style.maxWidth = `${containerWidth}px`;
					}
					chartInstance.resize();
				}
			}
		});

		resizeObserver.observe(container);

		return () => {
			resizeObserver.disconnect();
		};
	});

	// Cleanup on destroy
	onDestroy(() => {
		if (chartInstance) {
			chartInstance.destroy();
			chartInstance = null;
		}
	});
</script>

<div class="grid grid-cols-1 gap-8 p-4 md:grid-cols-2 lg:grid-cols-3">
	<!-- Two-column layout: Stats on left, content on right -->
	<div class="col-span-full grid grid-cols-1 gap-8 lg:grid-cols-3">
		<!-- Left Column: Stats Widgets -->
		<div class="flex flex-col gap-8">
			<!-- Title Widget -->
			<PageTitleWidget title="Transactions" />
			<UploadCTAWidget hasTransactions={data.stats?.totalTransactions > 0} />
			{#if data.stats}
				<TransactionStatsWidget
					totalTransactions={data.stats.totalTransactions}
					categorizedCount={data.stats.categorizedCount}
					categorizedPercentage={data.stats.categorizedPercentage}
				/>

				<!-- Last Full Month vs Last Year Widget -->
				{@const comparison = lastFullMonthComparison()}
				{#if comparison.month !== null}
					{@const monthDate = new Date(comparison.year, comparison.month, 1)}
					{@const lastYearDate = new Date(comparison.year - 1, comparison.month, 1)}
					<DashboardWidget size="small">
						<div class="flex h-full flex-col justify-center">
							<div class="grid grid-cols-2 gap-4">
								<!-- This Month -->
								<div class="flex flex-col">
									<div class="mb-1 text-xs text-base-content/70">
										{monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
									</div>
									<div class="text-2xl font-bold">
										{formatAmountNoDecimals(comparison.monthSpending)}
									</div>
								</div>

								<!-- Same Month Last Year -->
								<div class="flex flex-col">
									<div class="mb-1 text-xs text-base-content/70">
										{lastYearDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
									</div>
									<div class="text-2xl font-bold">
										{formatAmountNoDecimals(comparison.lastYearMonthSpending)}
									</div>
								</div>
							</div>

							<div class="divider my-3"></div>
							<div class="grid grid-cols-2 gap-4">
								<!-- Difference -->
								{#if comparison.lastYearMonthSpending > 0}
									<div class="text-center">
										<div class="mb-1 text-xs text-base-content/70">Difference</div>
										<div
											class="text-lg font-semibold {comparison.difference >= 0
												? 'text-error'
												: 'text-success'}"
										>
											{comparison.difference >= 0 ? '+' : ''}
											{formatAmountNoDecimals(comparison.difference)}
										</div>
										<div
											class="text-xs {comparison.difference >= 0 ? 'text-error' : 'text-success'}"
										>
											({comparison.difference >= 0 ? '+' : ''}
											{comparison.percentageChange.toFixed(1)}%)
										</div>
									</div>
								{/if}

								<!-- Average -->
								<div class="text-center">
									<div class="mb-1 text-xs text-base-content/70">Average</div>
									<div class="text-lg font-semibold">
										{formatAmountNoDecimals(comparison.averageMonthlySpending)}
									</div>
									<div class="text-xs text-base-content/70">All months</div>
								</div>
							</div>
						</div>
					</DashboardWidget>
				{/if}
			{/if}
		</div>

		<!-- Right Column: Chart, and Transactions -->
		<div class="flex flex-col gap-8 lg:col-span-2">
			<!-- Chart Widget -->
			{#if chartData() && chartData()!.labels.length > 0}
				{@const chartDataValue = chartData()!}
				<DashboardWidget size="wide" title="Monthly overview">
					<div class="flex h-full flex-col justify-center">
						<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
						<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
						<div
							class="chart-container relative w-full rounded {isDragging ? 'grabbing' : 'grab'}"
							bind:this={chartContainer}
							role="img"
							tabindex="0"
							aria-label="Interactive transaction chart - drag to pan, scroll to zoom"
							style="height: 220px; min-height: 220px; width: 100%; max-width: 100%; box-sizing: border-box; overflow: hidden; position: relative; cursor: {isDragging
								? 'grabbing'
								: 'grab'};"
							onmousedown={() => (isDragging = true)}
							onmouseup={() => (isDragging = false)}
							onmouseleave={() => (isDragging = false)}
						>
							<!-- Hint text -->
							{#if showHint && chartDataValue.labels.length > 9}
								<div
									class="absolute top-2 left-1/2 z-20 flex -translate-x-1/2 transform items-center gap-2 rounded-full bg-base-300/90 px-3 py-1 text-xs"
								>
									<span>Drag to explore</span>
									<button
										class="text-base-content/60 hover:text-base-content"
										onclick={() => (showHint = false)}
										aria-label="Dismiss hint"
									>
										×
									</button>
								</div>
							{/if}

							<canvas
								bind:this={chartCanvas}
								style="display: block; width: 100% !important; height: 100% !important; max-width: 100%; box-sizing: border-box;"
							></canvas>
						</div>
					</div>
				</DashboardWidget>
			{/if}

			<!-- Transactions Widget -->
			<DashboardWidget size="wide">
				<div class="flex h-full flex-col justify-start">
					{#if data.transactions.length === 0}
						<p>No transactions found.</p>
					{:else}
						<div class="overflow-x-auto" style="width: 100%; max-width: 100%;">
							<table
								class="table table-zebra"
								style="width: 100%; min-width: 0; table-layout: fixed; max-width: 100%;"
							>
								<colgroup>
									<col style="width: 70px;" />
									<col />
									<col style="width: 150px;" />
								</colgroup>
								<tbody>
									<!-- Group by month -->
									{#each transactionsByMonth() as monthGroup}
										{@const previousMonth = monthGroup.month === 0 ? 11 : monthGroup.month - 1}
										{@const previousYear =
											monthGroup.month === 0 ? monthGroup.year - 1 : monthGroup.year}
										{@const previousMonthKey = `${previousYear}-${previousMonth}`}
										{@const previousMonthData = monthlyStats().monthlyData.find(
											(m: any) => m.monthKey === previousMonthKey
										)}
										<!-- Month header row -->
										<tr class="bg-base-300">
											<td colspan="3" class="font-bold">
												{monthGroup.date.toLocaleDateString('en-US', { month: 'long' })}
											</td>
										</tr>

										<!-- Week groups within month -->
										{#each monthGroup.weekGroups as weekGroup}
											<!-- Day groups within week -->
											{#each weekGroup.days as [dayKey, transactions]}
												<!-- Transaction rows for this day -->
												{#each transactions as transaction, index}
													{@const CategoryIcon = transaction.category
														? getCategoryIcon(transaction.category.icon)
														: null}
													<tr>
														{#if index === 0}
															<td rowspan={transactions.length} class="align-top">
																<span class="text-sm">{formatDate(transaction.date)}</span>
															</td>
														{/if}
														<td>
															<div class="flex items-start gap-3">
																<div class="mt-0.5 flex-shrink-0">
																	{#if CategoryIcon}
																		<CategoryIcon
																			size={20}
																			strokeWidth={1}
																			style="color: black ;"
																		/>
																	{:else}
																		<HelpCircle size={20} class="text-base-content/40" />
																	{/if}
																</div>
																<div class="flex min-w-0 flex-1 flex-col gap-1">
																	<span class="font-normal" title={transaction.merchantName}>
																		{transaction.merchant?.name ?? transaction.merchantName}
																	</span>
																</div>
															</div>
														</td>
														<td class="text-right align-top" style="padding-right: 1rem;">
															<div class="flex justify-end">
																<Amount
																	value={transaction.amount}
																	size="large"
																	showDecimals={true}
																	isDebit={transaction.is_debit}
																/>
															</div>
														</td>
													</tr>
												{/each}
											{/each}
										{/each}
									{/each}
								</tbody>
							</table>
						</div>

						<!-- Delete All Transactions Button -->
						<div class="mt-8 flex justify-end">
							<button
								class="btn btn-outline btn-error"
								onclick={() => (showDeleteConfirm = true)}
								disabled={deleting}
							>
								<Trash2 size={20} />
								Delete all transactions
							</button>
						</div>
					{/if}
				</div>
			</DashboardWidget>
		</div>
	</div>

	<!-- Delete Confirmation Modal -->
	{#if showDeleteConfirm}
		<div class="modal-open modal">
			<div class="modal-box">
				<h3 class="mb-4 text-2xl font-bold">Delete all transactions</h3>
				<p class="mb-6">
					Are you sure you want to delete <strong>all transactions</strong>? This action cannot be
					undone.
				</p>

				{#if deleteError}
					<div class="mb-4 alert alert-error">
						<span>{deleteError}</span>
					</div>
				{/if}

				<div class="modal-action">
					<button
						class="btn btn-ghost"
						onclick={() => {
							showDeleteConfirm = false;
							deleteError = null;
						}}
						disabled={deleting}
					>
						Cancel
					</button>
					<button class="btn btn-error" onclick={deleteAllTransactions} disabled={deleting}>
						{#if deleting}
							<span class="loading loading-sm loading-spinner"></span>
							Deleting...
						{:else}
							<Trash2 size={20} />
							Delete all
						{/if}
					</button>
				</div>
			</div>
			<div
				class="modal-backdrop"
				role="button"
				tabindex="0"
				onclick={() => {
					if (!deleting) {
						showDeleteConfirm = false;
						deleteError = null;
					}
				}}
				onkeydown={(e) => {
					if ((e.key === 'Enter' || e.key === ' ') && !deleting) {
						showDeleteConfirm = false;
						deleteError = null;
					}
				}}
			></div>
		</div>
	{/if}
</div>
