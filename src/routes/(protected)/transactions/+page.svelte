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
	import {
		HelpCircle,
		Trash2,
		AlertTriangle,
		Star,
		TrendingUp,
		ArrowDownLeft,
		Lightbulb,
		Search,
		X,
		RefreshCw
	} from 'lucide-svelte';
	import * as Icons from 'lucide-svelte';
	import { invalidateAll } from '$app/navigation';
	import UploadCTAWidget from '$lib/components/UploadCTAWidget.svelte';
	import TransactionStatsWidget from '$lib/components/TransactionStatsWidget.svelte';
	import DashboardWidget from '$lib/components/DashboardWidget.svelte';
	import PageTitleWidget from '$lib/components/PageTitleWidget.svelte';
	import RecurringDetailsModal from '$lib/components/RecurringDetailsModal.svelte';
	import CreateSubscriptionModal from '$lib/components/CreateSubscriptionModal.svelte';
	import Amount from '$lib/components/Amount.svelte';
	import MerchantLogo from '$lib/components/MerchantLogo.svelte';
	import TransactionInsightCard from '$lib/components/TransactionInsightCard.svelte';
	import { transactionModalStore } from '$lib/stores/transactionModalStore';
	import { createSubscriptionModalStore } from '$lib/stores/createSubscriptionModalStore';
	import { recurringModalStore } from '$lib/stores/recurringModalStore';
	import { page } from '$app/stores';
	import chartColors from '$lib/config/chartColors';
	import { identifyInternalTransfers } from '$lib/utils/transactionAnalysis';
	import CategorySelector from '$lib/components/CategorySelector.svelte';

	// Witty random subtitles for the page title
	const wittySubtitles = [
		'Where your money went (and why) 💸',
		'Every euro tells a story',
		'The financial paper trail',
		'Proof that you did buy that 🍕',
		'Your spending, unfiltered',
		"The receipts don't lie",
		'Money in, money out, mystery solved'
	];

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

	let {
		data
	}: {
		data: {
			transactions: any[];
			stats: any | null;
			categories: any[];
			categoryParam: string | null;
			bankAccounts?: any[];
		};
	} = $props();
	let chartCanvas: HTMLCanvasElement | null = $state(null);
	let chartInstance: Chart | null = $state(null);
	let chartContainer: HTMLDivElement | null = $state(null);
	let showHint = $state(true);
	let isDragging = $state(false);
	let showDeleteConfirm = $state(false);
	let deleting = $state(false);
	let deleteError = $state<string | null>(null);

	// Transaction insights
	type TransactionInsight = {
		id: string;
		transactionId: number;
		category: 'urgent' | 'action' | 'insight' | 'celebration' | 'roast';
		message: string;
		title?: string;
		icon?: string;
		priority: number;
		relatedTransactionId?: number;
		actionLabel?: string;
		actionHref?: string;
	};
	let transactionInsights = $state<Record<number, TransactionInsight[]>>({});
	let insightsLoading = $state(false);
	let hoveredTransactionId = $state<number | null>(null);
	let showFilters = $state(false);
	let debitCreditFilter = $state<'all' | 'debit' | 'credit'>('all');

	// Filters - initialize from URL param if provided
	let selectedCategoryId = $state<number | null>(
		data.categoryParam ? Number(data.categoryParam) : null
	);
	let selectedAccounts = $state<string[]>(data.bankAccounts?.map((a) => a.iban) || []);
	let searchQuery = $state<string>('');

	// Identify internal transfers (connected payments)
	const internalTransferIds = $derived(identifyInternalTransfers(data.transactions));

	// Fetch transaction insights when transactions are loaded or changed
	// Track transaction recurring_transaction_ids to detect when subscriptions are created
	const transactionsFingerprint = $derived(
		data.transactions.map((t) => `${t.id}:${t.recurring_transaction_id || ''}`).join(',')
	);

	let lastFetchedFingerprint = $state('');

	$effect(() => {
		const currentFingerprint = transactionsFingerprint;
		if (browser && data.transactions.length > 0 && currentFingerprint !== lastFetchedFingerprint) {
			lastFetchedFingerprint = currentFingerprint;
			fetchTransactionInsights();
		}
	});

	async function fetchTransactionInsights() {
		if (insightsLoading || data.transactions.length === 0) return;
		insightsLoading = true;
		try {
			const response = await fetch('/api/transaction-insights', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					transactions: data.transactions.map((t) => ({
						id: t.id,
						date: t.date,
						amount: t.amount,
						merchantName: t.merchantName,
						cleaned_merchant_name: t.cleaned_merchant_name || t.merchant?.name,
						merchant_id: t.merchant_id,
						is_debit: t.is_debit,
						type: t.type,
						category_id: t.category_id,
						category_name: t.category?.name,
						recurring_transaction_id: t.recurring_transaction_id,
						recurring_transaction_type: t.recurring_transaction_type,
						merchant_is_potential_recurring: t.merchant_is_potential_recurring
					}))
				})
			});
			if (response.ok) {
				const result = await response.json();
				transactionInsights = result.insightsByTransaction || {};
				console.log(`📊 Loaded ${result.count || 0} transaction insights`);
			}
		} catch (err) {
			console.warn('Failed to load transaction insights:', err);
		} finally {
			insightsLoading = false;
		}
	}

	function getInsightIcon(iconName?: string) {
		switch (iconName) {
			case 'AlertTriangle':
				return AlertTriangle;
			case 'Star':
				return Star;
			case 'TrendingUp':
				return TrendingUp;
			case 'ArrowDownLeft':
				return ArrowDownLeft;
			default:
				return null;
		}
	}

	function getInsightColor(category: string): string {
		switch (category) {
			case 'urgent':
				return 'badge-error';
			case 'action':
				return 'badge-warning';
			case 'insight':
				return 'badge-info';
			case 'celebration':
				return 'badge-success';
			case 'roast':
				return 'badge-secondary';
			default:
				return 'badge-ghost';
		}
	}

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

	async function handleTransactionClick(transaction: any) {
		// If recurring, open the recurring modal directly
		if (transaction.recurring_transaction_id) {
			try {
				const res = await fetch('/api/recurring');
				if (res.ok) {
					const data = await res.json();
					const recurring = data.subscriptions.find(
						(s: any) => s.id === transaction.recurring_transaction_id
					);
					if (recurring) {
						recurringModalStore.open(recurring);
						return;
					}
				}
			} catch (e) {
				console.error('Failed to fetch recurring details:', e);
			}
		}

		// Otherwise, open the transaction details modal
		transactionModalStore.open({
			id: transaction.id,
			date: transaction.date,
			merchantName: transaction.merchantName ?? transaction.merchant?.name,
			amount: transaction.amount,
			description: transaction.description ?? '',
			is_debit: transaction.is_debit ?? true,
			category: transaction.category ?? null,
			merchant: transaction.merchant ?? null,
			type: transaction.type,
			is_recurring: transaction.is_recurring,
			recurring_transaction: transaction.recurring_transaction
		});
	}

	function handleInsightDismiss(transactionId: number, insightId: string) {
		if (transactionInsights[transactionId]) {
			transactionInsights[transactionId] = transactionInsights[transactionId].filter(
				(i) => i.id !== insightId
			);
		}
	}

	function handleInsightAction(action: { type: string; transactionId: number }) {
		if (action.type === 'add_sub') {
			const transaction = data.transactions.find((t) => t.id === action.transactionId);
			if (transaction) {
				createSubscriptionModalStore.open({
					id: transaction.id,
					date: transaction.date,
					merchantName: transaction.merchantName ?? transaction.merchant?.name,
					amount: transaction.amount,
					description: transaction.description ?? '',
					is_debit: transaction.is_debit ?? true,
					category: transaction.category ?? null,
					merchant: transaction.merchant ?? null,
					type: transaction.type,
					is_recurring: transaction.is_recurring,
					recurring_transaction: transaction.recurring_transaction,
					recurring_transaction_id: transaction.recurring_transaction_id,
					cleaned_merchant_name: transaction.cleaned_merchant_name
				});
			}
		}
	}

	// Group transactions by day
	const groupedTransactions = $derived(() => {
		const dayGroups: Map<string, typeof data.transactions> = new Map();

		const filtered = data.transactions.filter((t) => {
			// Search filter
			if (searchQuery.trim()) {
				const query = searchQuery.toLowerCase();
				const merchantName = (t.merchant?.name ?? t.merchantName ?? '').toLowerCase();
				const description = (t.description ?? '').toLowerCase();
				const categoryName = (t.category?.name ?? '').toLowerCase();
				if (
					!merchantName.includes(query) &&
					!description.includes(query) &&
					!categoryName.includes(query)
				) {
					return false;
				}
			}
			if (selectedCategoryId !== null) {
				// Match the selected category OR any of its children
				const categoryMatch =
					t.category?.id === selectedCategoryId || t.category?.parent_id === selectedCategoryId;
				if (!categoryMatch) return false;
			}
			if (selectedAccounts.length > 0 && !selectedAccounts.includes(t.iban)) return false;

			// Debit/Credit filter
			if (debitCreditFilter !== 'all') {
				if (debitCreditFilter === 'debit' && !t.is_debit) return false;
				if (debitCreditFilter === 'credit' && t.is_debit) return false;
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

	// Get monthly stats - compute from filtered transactions
	const monthlyStats = $derived(() => {
		// Filter transactions based on UI filters AND exclude internal transfers
		const filtered = data.transactions.filter((t) => {
			// Exclude internal transfers from stats
			if (internalTransferIds.has(t.id)) return false;

			if (selectedCategoryId !== null) {
				const categoryMatch =
					t.category?.id === selectedCategoryId || t.category?.parent_id === selectedCategoryId;
				if (!categoryMatch) return false;
			}

			if (selectedAccounts.length > 0 && !selectedAccounts.includes(t.iban)) return false;
			return true;
		});

		// Group by month
		const monthMap = new Map<
			string,
			{ spending: number; income: number; date: Date; year: number; month: number }
		>();

		for (const t of filtered) {
			const d = typeof t.date === 'string' ? new Date(t.date) : t.date;
			const year = d.getFullYear();
			const month = d.getMonth();
			const monthKey = `${year}-${month}`;

			if (!monthMap.has(monthKey)) {
				monthMap.set(monthKey, {
					spending: 0,
					income: 0,
					date: new Date(year, month, 1),
					year,
					month
				});
			}

			const entry = monthMap.get(monthKey)!;
			if (t.is_debit) {
				entry.spending += Math.abs(t.amount);
			} else {
				entry.income += Math.abs(t.amount);
			}
		}

		const monthlyData = Array.from(monthMap.values())
			.map((m) => ({
				...m,
				monthKey: `${m.year}-${m.month}`,
				total: m.spending,
				savings: 0 // Savings logic would need to be re-implemented if needed, or derived from categories
			}))
			.sort((a, b) => b.date.getTime() - a.date.getTime());

		const totalSpending = monthlyData.reduce((sum, m) => sum + m.spending, 0);
		const avgSpending = monthlyData.length > 0 ? totalSpending / monthlyData.length : 0;
		const totalIncome = monthlyData.reduce((sum, m) => sum + m.income, 0);
		const avgIncome = monthlyData.length > 0 ? totalIncome / monthlyData.length : 0;

		return {
			monthlyData,
			averageMonthlySpending: avgSpending,
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
								backgroundColor: chartColors.bg.income,
								borderColor: chartColors.border.income,
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
								backgroundColor: chartColors.bg.expenses,
								borderColor: chartColors.border.expenses,
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
								backgroundColor: chartColors.bg.savings,
								borderColor: chartColors.border.savings,
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

	// Update chart data when filter changes
	$effect(() => {
		const chartDataValue = chartData();
		if (!chartInstance || !chartDataValue) return;

		// Save current scale state before update
		const xScale = chartInstance.scales?.x;
		const currentMin = xScale?.min;
		const currentMax = xScale?.max;

		// Update chart datasets with new filtered data
		chartInstance.data.labels = chartDataValue.labels;
		chartInstance.data.datasets[0].data = chartDataValue.income;
		chartInstance.data.datasets[1].data = chartDataValue.spending;
		chartInstance.data.datasets[2].data = chartDataValue.savings;

		// Use 'none' to prevent animation and keep view stable
		chartInstance.update('none');

		// Restore zoom state if it was set
		if (currentMin !== undefined && currentMax !== undefined) {
			try {
				const chart = chartInstance as any;
				if (chart.zoomScale) {
					chart.zoomScale('x', { min: currentMin, max: currentMax });
					chart.update('none');
				}
			} catch (e) {
				// Ignore zoom restore errors
			}
		}
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

<div class="grid grid-cols-1 gap-8 py-4 lg:grid-cols-6 lg:pr-4">
	<!-- Header Row: Title (4 cols) + Stats (2 cols) -->
	<div class="col-span-6 grid grid-cols-6 gap-8">
		<PageTitleWidget
			title="Transactions"
			subtitle={wittySubtitles[Math.floor(Math.random() * wittySubtitles.length)]}
			class="col-span-4"
		/>

		<!-- Stats Widget -->
		<DashboardWidget
			size="auto"
			enableHover={true}
			enableScale={false}
			class="col-span-2"
			bodyClass="!p-4"
		>
			<div class="flex h-full flex-col justify-center gap-4">
				<div class="text-center">
					<p class="text-3xl font-bold">{data.stats?.totalTransactions || 0}</p>
					<p class="text-sm opacity-50">Total transactions</p>
				</div>
				<div class="h-px bg-base-300"></div>
				<div class="flex items-center justify-center gap-8">
					<div class="text-center">
						<p class="text-lg font-bold">
							{transactionsByMonth().reduce(
								(acc, month) => acc + month.days.reduce((dAcc, day) => dAcc + day[1].length, 0),
								0
							)}
						</p>
						<p class="text-xs opacity-50">Shown</p>
					</div>
					<div class="h-8 w-px bg-base-300"></div>
					<div class="text-center">
						<p class="text-lg font-bold text-warning">
							{(data.stats?.totalTransactions || 0) - (data.stats?.categorizedCount || 0)}
						</p>
						<p class="text-xs opacity-50">Uncategorized</p>
					</div>
				</div>
				<a
					href="/upload-transactions"
					class="btn w-full gap-2 bg-base-200/30 font-medium text-base-content/50 btn-ghost btn-sm hover:bg-base-200 hover:text-base-content"
				>
					<Icons.Plus size={14} />
					Add transactions
				</a>
			</div>
		</DashboardWidget>
	</div>

	<!-- SIDEBAR (2/6 Column = 33%) -->
	<!-- Compact widgets -->
	<div class="col-span-2 flex flex-col gap-4">
		<!-- Filters Widget -->
		<DashboardWidget
			size="auto"
			enableHover={true}
			enableScale={false}
			title="Filters"
			bodyClass="!p-4"
		>
			<div class="flex flex-col gap-3">
				<!-- Row 1: Search -->
				<label
					class="input-bordered input flex h-10 w-full items-center gap-2 rounded-xl border-base-content/30 bg-base-100 pl-3 focus-within:border-primary"
				>
					<Search class="opacity-40" size={16} />
					<input
						type="text"
						class="grow text-sm"
						placeholder="Search for name or description"
						bind:value={searchQuery}
					/>
					{#if searchQuery}
						<button
							class="btn btn-circle opacity-40 btn-ghost btn-xs hover:opacity-100"
							onclick={() => (searchQuery = '')}
						>
							<X size={14} />
						</button>
					{/if}
				</label>

				<!-- Row 2: Category (full width) -->
				<CategorySelector
					categories={data.categories}
					bind:selectedCategoryId
					placeholder="Category"
					size="sm"
				/>

				<!-- Row 3: Debit/Credit toggle buttons -->
				<div class="flex gap-1 rounded-full border border-base-content/10 bg-base-200/50 p-1">
					<button
						class="btn h-9 flex-1 rounded-full border text-xs {debitCreditFilter === 'all'
							? 'border-base-content/20 bg-base-100'
							: 'border-transparent btn-ghost hover:bg-base-200'}"
						onclick={() => (debitCreditFilter = 'all')}
					>
						All
					</button>
					<button
						class="btn h-9 flex-1 gap-1 rounded-full border text-xs {debitCreditFilter === 'debit'
							? 'border-base-content/20 bg-base-100'
							: 'border-transparent btn-ghost hover:bg-base-200'}"
						onclick={() => (debitCreditFilter = 'debit')}
					>
						<Icons.ArrowUpRight size={14} />
						Outgoing
					</button>
					<button
						class="btn h-9 flex-1 gap-1 rounded-full border text-xs {debitCreditFilter === 'credit'
							? 'border-base-content/20 bg-base-100'
							: 'border-transparent btn-ghost hover:bg-base-200'}"
						onclick={() => (debitCreditFilter = 'credit')}
					>
						<Icons.ArrowDownLeft size={14} />
						Incoming
					</button>
				</div>

				<!-- Row 4: Account Checkboxes -->
				{#if data.bankAccounts && data.bankAccounts.length > 0}
					<div class="flex flex-col gap-2 border-t border-base-content/10 pt-1">
						<span class="text-xs font-bold tracking-wider uppercase opacity-50">Accounts</span>
						<div class="flex flex-col gap-1">
							{#each data.bankAccounts as account}
								<label
									class="-mx-2 label cursor-pointer justify-start gap-3 rounded-lg px-2 py-1 hover:bg-base-200/50"
								>
									<input
										type="checkbox"
										class="checkbox rounded-md checkbox-sm checkbox-primary"
										bind:group={selectedAccounts}
										value={account.iban}
									/>
									<span class="label-text text-sm font-medium">{account.name || account.iban}</span>
								</label>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Clear all filters button (at bottom) -->
				{#if searchQuery || selectedCategoryId !== null || (data.bankAccounts && selectedAccounts.length !== data.bankAccounts.length) || debitCreditFilter !== 'all'}
					<button
						class="btn mt-2 w-full text-error btn-ghost btn-sm"
						onclick={() => {
							searchQuery = '';
							selectedCategoryId = null;
							selectedAccounts = data.bankAccounts?.map((a) => a.iban) || [];
							debitCreditFilter = 'all';
						}}
					>
						Clear all filters
					</button>
				{/if}
			</div>
		</DashboardWidget>
	</div>

	<!-- MAIN CONTENT Wrapper (3/5 Columns = 60%) -->
	<div class="col-span-4">
		<!-- INNER GRID: 3 Columns. 
			     Transactions = 2/3 of this wrapper (40% of total width)
				 Insights     = 1/3 of this wrapper (20% of total width) 
			-->
		<div class="relative grid grid-cols-3 items-start gap-x-8 gap-y-0">
			{#if data.transactions.length === 0}
				<DashboardWidget size="auto" enableHover={false} class="col-span-3">
					<div class="py-8 text-center opacity-70">
						<p>No transactions found.</p>
					</div>
				</DashboardWidget>
			{:else if transactionsByMonth().length === 0}
				<DashboardWidget size="auto" enableHover={false} class="col-span-3">
					<div class="py-8 text-center opacity-70">
						<p>No transactions match your filters.</p>
					</div>
				</DashboardWidget>
			{:else}
				{#each transactionsByMonth() as monthGroup}
					<!-- MONTH HEADER -->
					<!-- Spans 2 columns (Transactions area) -->
					<div
						class="col-span-2 mt-6 rounded-t-3xl border-x border-t border-base-content/20 bg-base-100 p-6 pb-2 shadow-[0_1px_2px_0_rgba(0,0,0,0.05),-4px_6px_15px_-3px_rgba(105,125,155,0.05),4px_6px_15px_-3px_rgba(145,120,175,0.05)] transition-all duration-300 first:mt-0 hover:shadow-[0_1px_2px_0_rgba(0,0,0,0.05),-6px_12px_40px_-3px_rgba(105,125,155,0.25),6px_12px_40px_-3px_rgba(145,120,175,0.25)]"
					>
						<h3 class="text-lg font-bold">
							{monthGroup.date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
						</h3>
					</div>
					<div class="col-span-1 mt-6 first:mt-0"></div>
					<!-- Spacer for insights area -->

					{#each monthGroup.days as [dayKey, transactions], dayIndex}
						<!-- DATE HEADER -->
						<div class="col-span-2 border-x border-base-content/20 bg-base-100 px-6 py-2">
							<span class="text-xs font-semibold opacity-70">
								{formatDate(transactions[0].date)}
							</span>
						</div>
						<div class="col-span-1"></div>
						<!-- Spacer -->

						{#each transactions as transaction, txIndex}
							{@const insights = transactionInsights[transaction.id] || []}
							{@const hasInsight = insights.length > 0}
							{@const isHovered = hoveredTransactionId === transaction.id}

							<!-- Determine if this is the very last transaction of the month to close the card -->
							{@const isLastOfDay = txIndex === transactions.length - 1}
							{@const isLastOfMonth = dayIndex === monthGroup.days.length - 1 && isLastOfDay}

							<!-- TRANSACTION ROW -->
							<!-- Spans 2 columns -->
							<div
								class="group relative col-span-2 border-x border-base-content/20 bg-base-100 px-4 {isLastOfMonth
									? 'rounded-b-3xl border-b pb-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.05),-4px_6px_15px_-3px_rgba(105,125,155,0.05),4px_6px_15px_-3px_rgba(145,120,175,0.05)]'
									: ''}"
							>
								<button
									class="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-2 py-2 text-left transition-all duration-200
										{isHovered ? 'bg-base-200/50' : 'hover:bg-base-100'}
										{internalTransferIds.has(transaction.id) ? 'opacity-50' : ''}"
									onclick={() => handleTransactionClick(transaction)}
									onmouseenter={() => (hoveredTransactionId = transaction.id)}
									onmouseleave={() => (hoveredTransactionId = null)}
								>
									<!-- Content -->
									<div class="flex min-w-0 flex-1 items-center gap-4">
										<MerchantLogo
											merchantName={transaction.merchant?.name ?? transaction.merchantName}
											categoryIcon={transaction.category?.icon}
											categoryColor={transaction.category?.color}
											size="xs"
										/>
										<div class="flex min-w-0 flex-col">
											<span
												class="truncate text-sm font-medium {internalTransferIds.has(transaction.id)
													? 'line-through'
													: ''}"
											>
												{transaction.merchant?.name ?? transaction.merchantName}
											</span>
											{#if transaction.category?.name}
												<span class="truncate text-xs opacity-50">{transaction.category.name}</span>
											{/if}
										</div>
									</div>
									<div class="flex items-center gap-2">
										{#if transaction.recurring_transaction_id}
											<span
												class="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary"
												title="Subscription"
											>
												<RefreshCw size={10} />
											</span>
										{/if}
										<div
											class="text-sm font-medium {internalTransferIds.has(transaction.id)
												? 'line-through'
												: ''}"
										>
											<Amount
												value={transaction.amount}
												size="small"
												showDecimals={true}
												isDebit={transaction.is_debit}
												hideEuro={true}
											/>
										</div>
									</div>
								</button>
							</div>

							<!-- INSIGHT BADGE -->
							<!-- Spans 1 column -->
							<div class="relative col-span-1 flex h-full min-h-[50px] items-center pl-4">
								{#if hasInsight}
									<!-- Connector Line -->
									<div
										class="pointer-events-none absolute top-1/2 -left-4 h-[2px] w-8 -translate-y-1/2"
									>
										<svg
											width="40"
											height="40"
											class="absolute top-1/2 right-0 -translate-y-1/2 overflow-visible"
										>
											<path
												d="M -10,20 C 10,20 10,20 20,20"
												fill="none"
												stroke={isHovered ? 'oklch(var(--p))' : 'currentColor'}
												stroke-width={isHovered ? 2 : 1}
												class="transition-colors duration-300 {isHovered
													? 'opacity-100'
													: 'opacity-20'}"
											/>
										</svg>
									</div>

									<TransactionInsightCard
										insight={insights[0]}
										isHighlighted={isHovered}
										onHover={(id) => (hoveredTransactionId = id)}
										onDismiss={(id) => handleInsightDismiss(transaction.id, id)}
										onAction={handleInsightAction}
									/>
								{/if}
							</div>
						{/each}
					{/each}
				{/each}
			{/if}
		</div>
		<CreateSubscriptionModal />
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
