<script lang="ts">
	import DashboardWidget from './DashboardWidget.svelte';
	import Amount from './Amount.svelte';
	import { TrendingDown, TrendingUp, CalendarCheck, AlertCircle } from 'lucide-svelte';

	let {
		monthlyTotal,
		yearlyTotal,
		totalActive,
		overdue = 0
	}: {
		monthlyTotal: number;
		yearlyTotal: number;
		totalActive: number;
		overdue?: number;
	} = $props();
</script>

<DashboardWidget size="small" title="Fixed costs">
	<div class="flex h-full flex-col justify-center gap-4">
		<!-- Monthly & Yearly -->
		<div class="grid grid-cols-2 gap-4">
			<div class="flex flex-col">
				<span class="text-xs uppercase tracking-wide opacity-50">Monthly</span>
				<span class="text-2xl font-bold text-error">
					<Amount value={monthlyTotal} size="large" showDecimals={false} isDebit={true} />
				</span>
			</div>
			<div class="flex flex-col">
				<span class="text-xs uppercase tracking-wide opacity-50">Yearly</span>
				<span class="text-lg font-semibold opacity-70">
					<Amount value={yearlyTotal} size="medium" showDecimals={false} isDebit={true} />
				</span>
			</div>
		</div>

		<!-- Stats row -->
		<div class="flex items-center gap-4 border-t border-base-200 pt-4">
			<div class="flex items-center gap-2">
				<CalendarCheck size={16} class="text-primary" />
				<span class="text-sm">
					<span class="font-semibold">{totalActive}</span>
					<span class="opacity-70">active</span>
				</span>
			</div>

			{#if overdue > 0}
				<div class="flex items-center gap-2">
					<AlertCircle size={16} class="text-warning" />
					<span class="text-sm">
						<span class="font-semibold text-warning">{overdue}</span>
						<span class="opacity-70">overdue</span>
					</span>
				</div>
			{/if}
		</div>
	</div>
</DashboardWidget>



