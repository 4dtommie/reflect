<script lang="ts">
	import DashboardWidget from './DashboardWidget.svelte';
	import Amount from './Amount.svelte';
	import { formatNumber } from '$lib/utils/locale';

	let {
		monthlyIncome = 0,
		monthlyExpenses = 0,
		recurringExpenses = 0,
		variableExpenses = 0
	}: {
		monthlyIncome?: number;
		monthlyExpenses?: number;
		recurringExpenses?: number;
		variableExpenses?: number;
	} = $props();

	const freeToSpend = $derived(Math.max(0, monthlyIncome - monthlyExpenses));
	const isPositive = $derived(monthlyIncome >= monthlyExpenses);
	const savingsRate = $derived(monthlyIncome > 0 ? (freeToSpend / monthlyIncome) * 100 : 0);

	// For the visual bars - all relative to income
	const incomeBarWidth = $derived(100); // Income is always full width as reference
	const expenseBarWidth = $derived(monthlyIncome > 0 ? (monthlyExpenses / monthlyIncome) * 100 : 0);
	const freeBarWidth = $derived(monthlyIncome > 0 ? (freeToSpend / monthlyIncome) * 100 : 0);
	
	// Calculate recurring and variable bar widths
	const recurringBarWidth = $derived(monthlyIncome > 0 && monthlyExpenses > 0 ? (recurringExpenses / monthlyIncome) * 100 : 0);
	const variableBarWidth = $derived(monthlyIncome > 0 && monthlyExpenses > 0 ? (variableExpenses / monthlyIncome) * 100 : 0);
</script>

<DashboardWidget size="small" title="Income you can spend">
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
						class="absolute inset-y-0 left-0 flex items-center justify-end rounded bg-success/70 px-2 transition-all duration-500"
						style="width: {incomeBarWidth}%"
					>
						<span class="text-xs font-medium text-success-content">
							€ {formatNumber(Math.round(monthlyIncome))}
						</span>
					</div>
				</div>
			</div>

			<!-- Expenses bar (split into recurring and variable) -->
			<div class="flex items-center gap-2">
				<span class="w-16 text-right text-xs opacity-50">Expenses</span>
				<div class="relative h-5 flex-1 overflow-hidden rounded bg-base-300">
					<!-- Recurring expenses (dark purple - matching chart) -->
					{#if recurringBarWidth > 0}
						<div
							class="absolute inset-y-0 left-0 flex items-center justify-end rounded-l px-2 transition-all duration-500"
							style="width: {Math.min(recurringBarWidth, 100)}%; background-color: rgba(139, 92, 246, 0.8);"
						>
							{#if recurringBarWidth > 20}
								<span class="text-xs font-medium text-white">
									€ {formatNumber(Math.round(recurringExpenses))}
								</span>
							{/if}
						</div>
					{/if}
					<!-- Variable expenses (light purple - matching chart) -->
					{#if variableBarWidth > 0}
						<div
							class="absolute inset-y-0 flex items-center justify-end rounded-r px-2 transition-all duration-500"
							style="left: {Math.min(recurringBarWidth, 100)}%; width: {Math.min(variableBarWidth, 100 - Math.min(recurringBarWidth, 100))}%; background-color: rgba(196, 181, 253, 0.7);"
						>
							{#if variableBarWidth > 20 && recurringBarWidth <= 20}
								<span class="text-xs font-medium text-purple-900">
									€ {formatNumber(Math.round(variableExpenses))}
								</span>
							{/if}
						</div>
					{/if}
					<!-- Total label if bars are too small or at the end if both visible -->
					{#if expenseBarWidth <= 20}
						<span class="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-medium">
							€ {formatNumber(Math.round(monthlyExpenses))}
						</span>
					{:else if expenseBarWidth > 20 && recurringBarWidth > 20 && variableBarWidth > 20}
						<span class="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-error-content">
							€ {formatNumber(Math.round(monthlyExpenses))}
						</span>
					{/if}
				</div>
			</div>

			<!-- Free to spend bar -->
			<div class="flex items-center gap-2">
				<span class="w-16 text-right text-xs opacity-50">Free</span>
				<div class="relative h-5 flex-1 overflow-hidden rounded bg-base-300">
					<div
						class="absolute inset-y-0 left-0 flex items-center justify-end rounded bg-sky-600/80 px-2 transition-all duration-500"
						style="width: {freeBarWidth}%"
					>
					{#if freeBarWidth > 20}
						<span class="text-xs font-medium text-white">
							€ {formatNumber(Math.round(freeToSpend))}
						</span>
					{/if}
					</div>
					{#if freeBarWidth <= 20 && freeToSpend > 0}
						<span class="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-medium">
							€ {formatNumber(Math.round(freeToSpend))}
						</span>
					{/if}
				</div>
			</div>
		</div>

		<!-- Yearly projection -->
		<div class="border-t border-base-200 pt-3 text-center text-sm">
			<span class="opacity-50">Yearly savings potential: </span>
			<span class="font-semibold text-sky-600">
				€ {formatNumber(Math.round(freeToSpend * 12))}
			</span>
		</div>
	</div>
</DashboardWidget>

