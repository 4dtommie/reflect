<script lang="ts">
	import DashboardWidget from './DashboardWidget.svelte';
	import { formatNumber } from '$lib/utils/locale';
	import { ArrowRight } from 'lucide-svelte';
	import chartColors from '$lib/config/chartColors';

	let {
		monthlyIncome = 0,
		monthlyExpenses = 0,
		recurringExpenses = 0,
		variableExpenses = 0,
		monthlySavings = 0,
		actionLabel = '',
		actionHref = ''
	}: {
		monthlyIncome?: number;
		monthlyExpenses?: number;
		recurringExpenses?: number;
		variableExpenses?: number;
		monthlySavings?: number;
		actionLabel?: string;
		actionHref?: string;
	} = $props();

	const freeToSpend = $derived(Math.max(0, monthlyIncome - monthlyExpenses - monthlySavings));
	const totalObligations = $derived(monthlyExpenses + monthlySavings);
	const isPositive = $derived(monthlyIncome >= totalObligations);
	const savingsRate = $derived(monthlyIncome > 0 ? (freeToSpend / monthlyIncome) * 100 : 0);

	// For the visual bars - all relative to income
	const incomeBarWidth = $derived(100); // Income is always full width as reference
	const expenseBarWidth = $derived(monthlyIncome > 0 ? (monthlyExpenses / monthlyIncome) * 100 : 0);
	const savingsBarWidth = $derived(monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0);
	const freeBarWidth = $derived(monthlyIncome > 0 ? (freeToSpend / monthlyIncome) * 100 : 0);

	// Calculate recurring and variable bar widths
	const recurringBarWidth = $derived(
		monthlyIncome > 0 && monthlyExpenses > 0 ? (recurringExpenses / monthlyIncome) * 100 : 0
	);
	const variableBarWidth = $derived(
		monthlyIncome > 0 && monthlyExpenses > 0 ? (variableExpenses / monthlyIncome) * 100 : 0
	);

	const showAction = $derived(actionLabel && actionHref);
</script>

<DashboardWidget
	size="small"
	title="Avg free to spend"
	actionLabel={actionLabel || undefined}
	actionHref={actionHref || undefined}
>
	<div class="flex h-full flex-col justify-center gap-4">
		<!-- Free to spend display -->
		<div class="text-center">
			<div class="mb-1">
				<span class="text-3xl font-bold text-sky-600">
					€ {formatNumber(Math.round(freeToSpend))}
				</span>
			</div>
			<span class="text-sm opacity-50">
				{#if isPositive}
					{savingsRate.toFixed(0)}% of income available
				{:else}
					Spending exceeds income
				{/if}
			</span>
		</div>

		<!-- Visual comparison bars -->
		<div class="space-y-2">
			<!-- Income bar -->
			<div class="flex items-center gap-2">
				<span class="w-16 text-right text-xs opacity-50">Income</span>
				<div class="relative h-5 flex-1 overflow-hidden rounded bg-base-300">
					<div
						class="absolute inset-y-0 left-0 flex items-center justify-end rounded px-2 transition-all duration-500"
						style="width: {incomeBarWidth}%; background-color: {chartColors.bg.income};"
					>
						<span class="text-xs font-medium text-success-content">
							€ {formatNumber(Math.round(monthlyIncome))}
						</span>
					</div>
				</div>
			</div>

			<!-- Expenses bar - shows position starting at 0 -->
			<div class="flex items-center gap-2">
				<span class="w-16 text-right text-xs opacity-50">Expenses</span>
				<div class="relative h-5 flex-1 overflow-hidden rounded bg-base-300">
					<!-- Recurring expenses (dark purple) -->
					{#if recurringBarWidth > 0}
						<div
							class="absolute inset-y-0 left-0 flex items-center justify-end rounded-l px-2 transition-all duration-500"
							style="width: {Math.min(recurringBarWidth, 100)}%; background-color: {chartColors.bg
								.recurring};"
						>
							{#if recurringBarWidth > 15 && expenseBarWidth > 30}
								<span class="text-xs font-medium text-white">
									€ {formatNumber(Math.round(recurringExpenses))}
								</span>
							{/if}
						</div>
					{/if}
					<!-- Variable expenses (light purple) -->
					{#if variableBarWidth > 0}
						<div
							class="absolute inset-y-0 flex items-center justify-end rounded-r px-2 transition-all duration-500"
							style="left: {Math.min(recurringBarWidth, 100)}%; width: {Math.min(
								variableBarWidth,
								100 - Math.min(recurringBarWidth, 100)
							)}%; background-color: {chartColors.bg.variable};"
						>
							{#if variableBarWidth > 15 && expenseBarWidth > 30 && recurringBarWidth <= 15}
								<span class="text-xs font-medium text-purple-900">
									€ {formatNumber(Math.round(variableExpenses))}
								</span>
							{/if}
						</div>
					{/if}
					<!-- Total label if bars are too small -->
					{#if expenseBarWidth <= 20}
						<span class="absolute top-1/2 left-2 -translate-y-1/2 text-xs font-medium">
							€ {formatNumber(Math.round(monthlyExpenses))}
						</span>
					{:else if expenseBarWidth > 20 && recurringBarWidth > 20 && variableBarWidth > 20}
						<span
							class="absolute top-1/2 right-2 -translate-y-1/2 text-xs font-medium text-error-content"
						>
							€ {formatNumber(Math.round(monthlyExpenses))}
						</span>
					{/if}
				</div>
			</div>

			<!-- Savings bar - shows position starting where expenses end -->
			{#if savingsBarWidth > 0}
				<div class="flex items-center gap-2">
					<span class="w-16 text-right text-xs opacity-50">Savings</span>
					<div class="relative h-5 flex-1 overflow-hidden rounded bg-base-300">
						<div
							class="absolute inset-y-0 flex items-center justify-end rounded px-2 transition-all duration-500"
							style="left: {Math.min(expenseBarWidth, 100)}%; width: {Math.min(
								savingsBarWidth,
								100 - Math.min(expenseBarWidth, 100)
							)}%; background-color: {chartColors.bg.savings};"
						>
							{#if savingsBarWidth > 20}
								<span class="text-xs font-medium text-yellow-900">
									€ {formatNumber(Math.round(monthlySavings))}
								</span>
							{/if}
						</div>
						{#if savingsBarWidth <= 20 && monthlySavings > 0}
							<span
								class="absolute top-1/2 left-2 -translate-y-1/2 text-xs font-medium"
								style="left: {Math.min(expenseBarWidth + 2, 98)}%;"
							>
								€ {formatNumber(Math.round(monthlySavings))}
							</span>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Free to spend bar - shows position starting where expenses + savings end -->
			<div class="flex items-center gap-2">
				<span class="w-16 text-right text-xs opacity-50">Free</span>
				<div class="relative h-5 flex-1 overflow-hidden rounded bg-base-300">
					<div
						class="absolute inset-y-0 flex items-center justify-end rounded-r px-2 transition-all duration-500"
						style="left: {Math.min(expenseBarWidth + savingsBarWidth, 100)}%; width: {Math.min(
							freeBarWidth,
							100 - Math.min(expenseBarWidth + savingsBarWidth, 100)
						)}%; background-color: {chartColors.bg.remaining};"
					>
						{#if freeBarWidth > 20}
							<span class="text-xs font-medium text-white">
								€ {formatNumber(Math.round(freeToSpend))}
							</span>
						{/if}
					</div>
					{#if freeBarWidth <= 20 && freeToSpend > 0}
						<span class="absolute top-1/2 right-2 -translate-y-1/2 text-xs font-medium">
							€ {formatNumber(Math.round(freeToSpend))}
						</span>
					{/if}
				</div>
			</div>
		</div>
	</div>
</DashboardWidget>
