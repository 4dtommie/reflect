<script lang="ts">
	import Amount from './Amount.svelte';
	import MerchantLogo from './MerchantLogo.svelte';
	import { ChevronDown, ChevronUp } from 'lucide-svelte';
	import { slide } from 'svelte/transition';
	import { formatNumber, formatDateShort } from '$lib/utils/locale';

	type TopMerchant = {
		merchantName: string;
		totalSpent: number;
		transactionCount: number;
	};

	type VariablePattern = {
		id?: number;
		categoryName: string;
		categoryColor?: string | null;
		categoryIcon?: string | null;
		monthlyAverage: number;
		visitsPerMonth: number;
		averagePerVisit: number;
		totalSpent: number;
		totalTransactions: number;
		uniqueMerchants: number;
		topMerchants: TopMerchant[] | unknown;
		minAmount: number;
		maxAmount: number;
		firstTransaction: string;
		lastTransaction: string;
	};

	let {
		pattern
	}: {
		pattern: VariablePattern;
	} = $props();

	let expanded = $state(false);

	// Calculate percentages for bar charts
	const merchantPercentages = $derived.by(() => {
		const merchants = pattern.topMerchants as TopMerchant[] | null;
		if (!merchants || !Array.isArray(merchants) || merchants.length === 0) return [];

		const maxSpent = Math.max(...merchants.map((m) => Math.abs(m.totalSpent)));
		if (maxSpent === 0)
			return merchants.map(() => ({
				merchantName: '',
				totalSpent: 0,
				transactionCount: 0,
				percentage: 0
			}));

		return merchants.map((merchant) => ({
			...merchant,
			percentage: (Math.abs(merchant.totalSpent) / maxSpent) * 100
		}));
	});
</script>

<div class="border-b border-base-200 last:border-b-0">
	<button
		class="flex w-full cursor-pointer items-center justify-between gap-3 py-2.5 text-left transition-colors hover:bg-base-200/30 focus:outline-none"
		onclick={() => (expanded = !expanded)}
	>
		<!-- Left: Chevron + Name -->
		<div class="flex min-w-0 flex-1 items-center gap-2">
			<div class="flex-shrink-0 text-base-content/30">
				{#if expanded}
					<ChevronUp size={16} />
				{:else}
					<ChevronDown size={16} />
				{/if}
			</div>

			<span class="truncate">{pattern.categoryName}</span>
		</div>

		<!-- Right: Monthly average -->
		<div class="flex-shrink-0">
			<span class="font-semibold">
				<Amount
					value={pattern.monthlyAverage}
					size="small"
					showDecimals={false}
					isDebit={true}
					locale="NL"
				/>
			</span>
			<span class="text-xs opacity-50">/mo</span>
		</div>
	</button>

	<!-- Expanded content -->
	{#if expanded}
		<div
			transition:slide={{ duration: 150 }}
			class="rounded-lg bg-base-200/30 p-4 pb-3"
			style="background-color: rgba(0, 0, 0, 0.03);"
		>
			<!-- Key Metrics Grid -->
			<div class="mb-4 grid grid-cols-3 gap-4 border-b border-base-300/50 pb-3">
				<div class="flex flex-col">
					<span class="mb-1 text-[10px] tracking-wide uppercase opacity-50"
						>Total {new Date().getFullYear()}</span
					>
					<span class="text-base font-semibold">
						<Amount
							value={pattern.totalSpent}
							size="small"
							showDecimals={false}
							isDebit={true}
							locale="NL"
						/>
					</span>
				</div>
				<div class="flex flex-col">
					<span class="mb-1 text-[10px] tracking-wide uppercase opacity-50">Per visit</span>
					<span class="text-base font-semibold">
						<Amount
							value={Math.round(pattern.averagePerVisit)}
							size="small"
							showDecimals={false}
							isDebit={true}
							locale="NL"
						/>
					</span>
				</div>
				<div class="flex flex-col">
					<span class="mb-1 text-[10px] tracking-wide uppercase opacity-50">Frequency</span>
					<span class="text-base font-semibold"
						>{Math.round(pattern.visitsPerMonth * 10) / 10}x/month</span
					>
				</div>
			</div>

			<!-- Top merchants with bar charts -->
			{#if pattern.topMerchants && pattern.topMerchants.length > 0}
				<div class="mb-4 space-y-3">
					<div class="mb-2 text-[10px] tracking-wide uppercase opacity-50">Top merchants</div>
					{#each merchantPercentages.slice(0, 5) as merchant (merchant.merchantName)}
						<div class="space-y-1">
							<div class="flex items-center justify-between gap-2 text-xs">
								<div class="flex min-w-0 flex-1 items-center gap-1.5">
									<MerchantLogo merchantName={merchant.merchantName} size="xs" />
									<span class="truncate font-medium opacity-90">{merchant.merchantName}</span>
									<span class="flex-shrink-0 text-[10px] opacity-50"
										>({merchant.transactionCount}x)</span
									>
								</div>
								<span class="flex-shrink-0 font-semibold">
									<Amount
										value={merchant.totalSpent}
										size="small"
										showDecimals={false}
										isDebit={true}
										locale="NL"
									/>
								</span>
							</div>
							<!-- Horizontal bar chart -->
							<div class="h-1.5 w-full overflow-hidden rounded-full bg-base-300/50">
								<div
									class="h-full transition-all duration-300"
									style="width: {merchant.percentage}%; background-color: rgba(196, 181, 253, 0.7);"
								></div>
							</div>
						</div>
					{/each}
					{#if pattern.topMerchants.length > 5}
						<p class="pt-1 text-xs opacity-40">+{pattern.topMerchants.length - 5} more</p>
					{/if}
				</div>
			{/if}

			<!-- Divider and Stats -->
			<div class="border-t border-base-300/50 pt-3">
				<div class="grid grid-cols-3 gap-4 text-xs">
					<div class="flex flex-col">
						<span class="mb-0.5 text-[10px] tracking-wide uppercase opacity-50">Transactions</span>
						<span class="font-semibold opacity-90">{pattern.totalTransactions}</span>
					</div>
					<div class="flex flex-col">
						<span class="mb-0.5 text-[10px] tracking-wide uppercase opacity-50">Merchants</span>
						<span class="font-semibold opacity-90">{pattern.uniqueMerchants}</span>
					</div>
					<div class="flex flex-col">
						<span class="mb-0.5 text-[10px] tracking-wide uppercase opacity-50">Range</span>
						<span class="font-semibold opacity-90">
							€ {formatNumber(Math.abs(pattern.minAmount), { maximumFractionDigits: 0 })} - € {formatNumber(
								Math.abs(pattern.maxAmount),
								{ maximumFractionDigits: 0 }
							)}
						</span>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
