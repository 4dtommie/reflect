<script lang="ts">
	import DashboardWidget from './DashboardWidget.svelte';
	import {
		ShoppingCart,
		Coffee,
		Home,
		Car,
		Utensils,
		Zap,
		Heart,
		Briefcase,
		Clock
	} from 'lucide-svelte';

	let { transactions }: { transactions: any[] } = $props();

	// Map category to icon
	const categoryIcons: Record<string, any> = {
		Groceries: ShoppingCart,
		Dining: Utensils,
		Coffee: Coffee,
		Housing: Home,
		Transportation: Car,
		Utilities: Zap,
		Healthcare: Heart,
		Business: Briefcase
	};

	const getCategoryIcon = (category: string) => {
		return categoryIcons[category] || ShoppingCart;
	};

	// Format amount with color
	const formatAmount = (amount: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(Math.abs(amount));
	};
</script>

{#if transactions.length === 0}
	<!-- Empty State -->
	<DashboardWidget size="large" variant="placeholder">
		<div class="flex h-full flex-col items-center justify-center text-center opacity-50">
			<Clock size={48} class="mb-4" />
			<h3 class="text-lg font-semibold">Recent transactions</h3>
			<p class="text-sm">This will fill up after you add transactions</p>
		</div>
	</DashboardWidget>
{:else}
	<!-- Transaction List -->
	<DashboardWidget size="large">
		<div class="space-y-1">
			<h3 class="mb-4 text-lg font-semibold opacity-70">Recent transactions</h3>

			<div class="space-y-2">
				{#each transactions as transaction}
					<div
						class="group flex cursor-pointer items-center gap-4 rounded-2xl bg-base-200/50 p-3 transition-all duration-200 hover:scale-[1.01] hover:bg-base-200"
					>
						<!-- Category Icon -->
						<div class="flex-shrink-0">
							<div
								class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20"
							>
								<svelte:component
									this={getCategoryIcon(transaction.category)}
									size={20}
									class="text-primary"
								/>
							</div>
						</div>

						<!-- Merchant Name -->
						<div class="min-w-0 flex-1">
							<p class="truncate font-medium">{transaction.merchant}</p>
							<p class="text-xs opacity-60">{transaction.category}</p>
						</div>

						<!-- Amount -->
						<div class="flex-shrink-0">
							<p class="text-lg font-bold {transaction.amount < 0 ? 'text-error' : 'text-success'}">
								{transaction.amount < 0 ? '-' : '+'}{formatAmount(transaction.amount)}
							</p>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</DashboardWidget>
{/if}
