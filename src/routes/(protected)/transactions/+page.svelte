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
	import ManualCategorizeModal from '$lib/components/ManualCategorizeModal.svelte';

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

	let { data }: { data: { transactions: any[]; stats: any | null; categories: any[] } } = $props();
	let chartCanvas: HTMLCanvasElement | null = $state(null);
	let chartInstance: Chart | null = $state(null);
	let chartContainer: HTMLDivElement | null = $state(null);
	let showHint = $state(true);
	let isDragging = $state(false);
	let showDeleteConfirm = $state(false);
	let deleting = $state(false);
	let deleteError = $state<string | null>(null);

	// Manual Categorization Modal State
	let selectedTransaction = $state<any | null>(null);
	let isModalOpen = $state(false);

	// Filters
	let selectedCategory = $state<string>('all');
	let showUncategorizedOnly = $state(false);

	// Calculate active categories with counts
	const activeCategories = $derived(() => {
		const categoryCounts = new Map<string, number>();

		for (const t of data.transactions) {
			if (t.category?.id) {
				categoryCounts.set(t.category.id, (categoryCounts.get(t.category.id) || 0) + 1);
			}
		}

		return data.categories
			.filter((c) => categoryCounts.has(c.id))
			.map((c) => ({
				...c,
				count: categoryCounts.get(c.id) || 0
			}))
			.sort((a, b) => b.count - a.count); // Sort by count descending
	});

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

	function getMonthDayKey(date: Date | string): string {
		const d = typeof date === 'string' ? new Date(date) : date;
		return `${d.getMonth()}-${d.getDate()}`;
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

	async function handleSaveCategory(
		transactionId: number,
		categoryId: number,
		merchantName: string
	) {
		const response = await fetch(`/api/transactions/${transactionId}/categorize`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ categoryId, merchantName })
		});

		if (!response.ok) {
			throw new Error('Failed to update transaction');
		}

		await invalidateAll();
	}

	function handleTransactionClick(transaction: any) {
		selectedTransaction = transaction;
		isModalOpen = true;
	}

	// Group transactions by day
	const groupedTransactions = $derived(() => {
		const dayGroups: Map<string, typeof data.transactions> = new Map();

		const filtered = data.transactions.filter((t) => {
			if (showUncategorizedOnly) {
				return !t.category || t.category.name === 'Niet gecategoriseerd';
			}
			if (selectedCategory !== 'all') {
				return t.category?.id === selectedCategory;
			}
			return true;
		});

		for (const transaction of filtered) {
			const dayKey = getMonthDayKey(transaction.date);

			if (!dayGroups.has(dayKey)) {
				dayGroups.set(dayKey, []);
			}

			dayGroups.get(dayKey)!.push(transaction);
		}

		// Convert to array structure: [dayKey, transactions]
		const sortedDays = Array.from(dayGroups.entries()).sort(([keyA], [keyB]) => {
			const dateA = new Date(dayGroups.get(keyA)![0].date);
			const dateB = new Date(dayGroups.get(keyB)![0].date);
			return dateB.getTime() - dateA.getTime();
		});

		return sortedDays;
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
				const savings = typeof m.savings === 'number' ? m.savings : 0;

				return {
					monthKey: `${year}-${month}`,
					total: spending, // For backward compatibility
					spending: Number(spending),
					income: Number(income),
					savings: Number(savings),
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

	// Group transactions by month for display
	const transactionsByMonth = $derived(() => {
		const monthMap = new Map<string, Array<[string, typeof data.transactions]>>();

		for (const [dayKey, transactions] of groupedTransactions()) {
			if (transactions.length === 0) continue;

			const firstTransaction = transactions[0];
			const d =
				typeof firstTransaction.date === 'string'
					? new Date(firstTransaction.date)
					: firstTransaction.date;
			const monthKey = `${d.getFullYear()}-${d.getMonth()}`;

			if (!monthMap.has(monthKey)) {
				monthMap.set(monthKey, []);
			}
			monthMap.get(monthKey)!.push([dayKey, transactions]);
		}

		// Convert to array and get month info
		return Array.from(monthMap.entries())
			.map(([monthKey, days]) => {
				const firstTransaction = days[0][1][0];
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
					days,
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
		const savings = months.map((m: any) => m.savings || 0);

		// Calculate min and max values for Y-axis
		// For max, we need to consider the stacked height of spending + savings
		const totalOutflow = spending.map((v, i) => v + savings[i]);
		const allValues = [...totalOutflow, ...income].filter((v) => v !== null && v !== undefined);
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
			labels.push(m.date.toLocaleDateString('en-US', { month: 'short' }));
		});

		return {
			labels,
			yearTransitions, // Store transition points for visual dividers
			spending,
			income,
			savings,
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

			try {
				console.log('Creating chart with data:', chartDataValue);

				chartInstance = new Chart(canvas, {
					type: 'bar',
					data: {
						labels: chartDataValue.labels,
						datasets: [
							{
								label: 'Income',
								data: chartDataValue.income,
								backgroundColor: 'rgba(16, 185, 129, 0.8)',
								borderColor: '#10B981',
								borderWidth: 1,
								borderRadius: 4,
								maxBarThickness: 40,
								// @ts-ignore
								categoryPercentage: 0.8,
								barPercentage: 0.9,
								stack: 'income'
							},
							{
								label: 'Expenses',
								data: chartDataValue.spending,
								backgroundColor: 'rgba(244, 63, 94, 0.8)',
								borderColor: '#F43F5E',
								borderWidth: 1,
								borderRadius: 4,
								maxBarThickness: 40,
								// @ts-ignore
								categoryPercentage: 0.8,
								barPercentage: 0.9,
								stack: 'outflow'
							},
							{
								label: 'Savings',
								data: chartDataValue.savings,
								backgroundColor: 'rgba(250, 204, 21, 0.8)', // Yellow-400
								borderColor: '#FACC15',
								borderWidth: 1,
								borderRadius: 4,
								maxBarThickness: 40,
								// @ts-ignore
								categoryPercentage: 0.8,
								barPercentage: 0.9,
								stack: 'outflow'
							}
						]
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						layout: {
							padding: 0
						},
						interaction: {
							mode: 'index',
							intersect: false
						},
						plugins: {
							legend: {
								display: true,
								position: 'top',
								labels: {
									font: {
										family:
											"system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
									},
									usePointStyle: true,
									boxWidth: 8
								}
							},
							tooltip: {
								callbacks: {
									label: function (context) {
										let label = context.dataset.label || '';
										if (label) {
											label += ': ';
										}
										if (context.parsed.y !== null) {
											label += new Intl.NumberFormat('en-US', {
												style: 'currency',
												currency: 'EUR'
											}).format(context.parsed.y);
										}
										return label;
									}
								}
							},
							// @ts-ignore - zoom plugin options
							zoom: {
								pan: {
									enabled: true,
									mode: 'x',
									threshold: 10,
									onPan: function () {
										if (chartInstance) {
											chartInstance.update('none');
										}
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
										if (chartInstance) {
											chartInstance.update('none');
										}
										showHint = false;
									}
								}
							}
						},
						scales: {
							y: {
								stacked: true,
								beginAtZero: true,
								grid: {
									color: 'rgba(0, 0, 0, 0.05)',
									// @ts-ignore
									borderDash: [5, 5]
								},
								ticks: {
									callback: function (value: any) {
										return new Intl.NumberFormat('en-US', {
											style: 'currency',
											currency: 'EUR',
											maximumFractionDigits: 0
										}).format(value);
									},
									font: {
										family:
											"system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
									}
								},
								border: {
									display: false
								}
							},
							x: {
								stacked: true,
								grid: {
									display: false
								},
								min: initialMin,
								max: initialMax,
								ticks: {
									font: {
										family:
											"system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
									}
								},
								border: {
									display: false
								}
							}
						},
						animation: {
							duration: 500
						}
					}
				});

				// Set initial zoom to show last 9 months after chart is created
				setTimeout(() => {
					if (chartInstance) {
						try {
							const chart = chartInstance as any;
							if (chart.zoomScale) {
								chart.zoomScale('x', {
									min: initialMin,
									max: initialMax
								});
								chart.update('none');
							}
						} catch (e) {
							console.warn('Could not set initial zoom:', e);
						}
					}
				}, 300);

				console.log('Chart created successfully');
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
					uncategorizedCount={data.stats.totalTransactions - data.stats.categorizedCount}
					categorizedPercentage={data.stats.categorizedPercentage}
					topUncategorizedMerchants={data.stats.topUncategorizedMerchants}
				/>
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

			<!-- Transaction List Snippet -->
			{#snippet transactionList(days: any[])}
				<div class="flex flex-col gap-6 border-l-2 border-base-200/50 pl-2">
					{#each days as [dayKey, transactions]}
						<!-- Day section -->
						<div class="flex flex-col overflow-hidden rounded-lg">
							<!-- Date header -->
							<div class="py-2 pt-0">
								<span class="text-sm font-medium opacity-70">
									{formatDate(transactions[0].date)}
								</span>
							</div>
							<!-- Transactions list -->
							<div class="divide-y divide-base-200">
								{#each transactions as transaction}
									{@const CategoryIcon = transaction.category
										? getCategoryIcon(transaction.category.icon)
										: null}
									<button
										class="-mx-2 flex w-full cursor-pointer items-center justify-between gap-4 rounded-lg px-2 py-2 text-left transition-colors hover:bg-base-100"
										onclick={() => handleTransactionClick(transaction)}
									>
										<div class="flex min-w-0 flex-1 items-center gap-3">
											<div class="flex-shrink-0">
												{#if CategoryIcon}
													<CategoryIcon size={18} strokeWidth={1.5} class="text-primary" />
												{:else}
													<HelpCircle size={18} class="text-base-content/30" />
												{/if}
											</div>
											<span class="truncate text-sm font-normal" title={transaction.merchantName}>
												{transaction.merchant?.name ?? transaction.merchantName}
											</span>
										</div>
										<div class="flex-shrink-0">
											<Amount
												value={transaction.amount}
												size="small"
												showDecimals={true}
												isDebit={transaction.is_debit}
												hideEuro={true}
											/>
										</div>
									</button>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{/snippet}

			<!-- First Widget: Filters + First Month -->
			<DashboardWidget size="wide" enableHover={false}>
				<!-- Header with Filters -->
				<div class="mb-6 flex flex-wrap items-center justify-between gap-4">
					<h2 class="card-title">Transactions</h2>

					{#if data.transactions.length > 0}
						<div class="flex items-center gap-4">
							<select
								class="select-bordered select w-48 select-sm"
								bind:value={selectedCategory}
								disabled={showUncategorizedOnly}
							>
								<option value="all">All Categories</option>
								{#each activeCategories() as category}
									<option value={category.id}>{category.name} ({category.count})</option>
								{/each}
							</select>

							<label
								class="label cursor-pointer gap-2 rounded-lg border border-base-200 px-2 py-1 transition-colors hover:bg-base-200/50"
							>
								<span class="label-text text-sm">Uncategorized only</span>
								<input
									type="checkbox"
									class="toggle toggle-sm toggle-warning"
									bind:checked={showUncategorizedOnly}
								/>
							</label>
						</div>
					{/if}
				</div>

				<!-- Content -->
				{#if data.transactions.length === 0}
					<div class="py-8 text-center opacity-70">
						<p>No transactions found.</p>
					</div>
				{:else if transactionsByMonth().length === 0}
					<div class="py-8 text-center opacity-70">
						<p>No transactions match your filters.</p>
					</div>
				{:else}
					{@const firstMonth = transactionsByMonth()[0]}
					<div class="flex flex-col">
						<!-- Month Header -->
						<h3 class="mb-4 text-lg font-bold opacity-50">
							{firstMonth.date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
						</h3>
						{@render transactionList(firstMonth.days)}
					</div>
				{/if}
			</DashboardWidget>

			<!-- Subsequent Widgets -->
			{#if transactionsByMonth().length > 1}
				{#each transactionsByMonth().slice(1) as monthGroup}
					<DashboardWidget
						size="wide"
						enableHover={false}
						title={monthGroup.date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
					>
						{@render transactionList(monthGroup.days)}
					</DashboardWidget>
				{/each}
			{/if}

			<!-- Delete All Transactions Button -->
			{#if data.transactions.length > 0}
				<DashboardWidget size="small" enableHover={false}>
					<div class="flex justify-end">
						<button
							class="btn btn-outline btn-sm btn-error"
							onclick={() => (showDeleteConfirm = true)}
							disabled={deleting}
						>
							<Trash2 size={16} />
							Delete all transactions
						</button>
					</div>
				</DashboardWidget>
			{/if}
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

	<ManualCategorizeModal
		isOpen={isModalOpen}
		transaction={selectedTransaction}
		categories={data.categories}
		onClose={() => (isModalOpen = false)}
		onSave={handleSaveCategory}
	/>
</div>
