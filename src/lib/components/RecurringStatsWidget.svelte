<script lang="ts">
	import DashboardWidget from './DashboardWidget.svelte';
	import Amount from './Amount.svelte';
	import { Receipt, ShoppingCart, Wallet } from 'lucide-svelte';

	let {
		fixedMonthly = 0,
		variableMonthly = 0,
		subscriptionCount = 0,
		variableCategoryCount = 0
	}: {
		fixedMonthly?: number;
		variableMonthly?: number;
		subscriptionCount?: number;
		variableCategoryCount?: number;
	} = $props();

	const totalMonthly = $derived(fixedMonthly + variableMonthly);
	const totalYearly = $derived(totalMonthly * 12);

	// Calculate percentages for the bar
	const fixedPercent = $derived(totalMonthly > 0 ? (fixedMonthly / totalMonthly) * 100 : 50);
	const variablePercent = $derived(totalMonthly > 0 ? (variableMonthly / totalMonthly) * 100 : 50);
</script>

<DashboardWidget size="small" title="Monthly expenses">
	<div class="flex h-full flex-col justify-center gap-4">
		<!-- Total -->
		<div class="text-center">
			<span class="text-xs uppercase tracking-wide opacity-50">Total monthly</span>
			<div class="text-3xl font-bold text-error">
				<Amount value={totalMonthly} size="lg" showDecimals={false} isDebit={true} />
			</div>
			<span class="text-sm opacity-50">
				<Amount value={totalYearly} size="sm" showDecimals={false} isDebit={true} /> / year
			</span>
		</div>

		<!-- Breakdown bar -->
		<div class="flex h-3 w-full overflow-hidden rounded-full bg-base-300">
			{#if fixedMonthly > 0}
				<div
					class="bg-error transition-all duration-300"
					style="width: {fixedPercent}%"
					title="Fixed: €{Math.round(fixedMonthly)}"
				></div>
			{/if}
			{#if variableMonthly > 0}
				<div
					class="bg-warning transition-all duration-300"
					style="width: {variablePercent}%"
					title="Variable: €{Math.round(variableMonthly)}"
				></div>
			{/if}
		</div>

		<!-- Legend -->
		<div class="grid grid-cols-2 gap-2 text-sm">
			<div class="flex items-center gap-2">
				<div class="h-3 w-3 rounded-full bg-error"></div>
				<div class="flex flex-col">
					<span class="font-semibold">
						<Amount value={fixedMonthly} size="sm" showDecimals={false} isDebit={true} />
					</span>
					<span class="text-xs opacity-50">{subscriptionCount} subscriptions</span>
				</div>
			</div>
			<div class="flex items-center gap-2">
				<div class="h-3 w-3 rounded-full bg-warning"></div>
				<div class="flex flex-col">
					<span class="font-semibold">
						<Amount value={variableMonthly} size="sm" showDecimals={false} isDebit={true} />
					</span>
					<span class="text-xs opacity-50">{variableCategoryCount} categories</span>
				</div>
			</div>
		</div>
	</div>
</DashboardWidget>



