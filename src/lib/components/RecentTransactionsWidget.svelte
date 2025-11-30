<script lang="ts">
	import DashboardWidget from './DashboardWidget.svelte';
	import Amount from './Amount.svelte';
	import * as LucideIcons from 'lucide-svelte';

	let { transactions }: { transactions: any[] } = $props();

	// Get icon component from lucide-svelte by name
	const getCategoryIcon = (iconName: string | null) => {
		if (!iconName) return LucideIcons.ShoppingCart;

		// Try to get the icon from lucide-svelte
		const icon = (LucideIcons as any)[iconName];
		return icon || LucideIcons.ShoppingCart;
	};
</script>

{#if transactions.length === 0}
	{@const Clock = LucideIcons.Clock}
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
	<DashboardWidget size="medium">
		<div class="space-y-1">
			<h3 class="mb-4 text-lg font-semibold opacity-70">Recent transactions</h3>

			<div class="space-y-2">
				{#each transactions as transaction}
					{@const Icon = getCategoryIcon(transaction.categoryIcon)}
					<div
						class="group flex cursor-pointer items-center gap-4 rounded-2xl bg-base-200/50 p-3 transition-all duration-200 hover:scale-[1.01] hover:bg-base-200"
					>
						<!-- Category Icon -->
						<div class="flex-shrink-0">
							<div
								class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20"
							>
								<Icon size={20} class="text-primary" />
							</div>
						</div>

						<!-- Merchant Name -->
						<div class="min-w-0 flex-1">
							<p class="truncate font-medium">{transaction.merchant}</p>
							<p class="text-xs opacity-60">{transaction.category}</p>
						</div>

						<!-- Amount -->
						<div class="flex-shrink-0">
							<Amount value={transaction.amount} size="medium" isDebit={transaction.isDebit} />
						</div>
					</div>
				{/each}
			</div>
		</div>
	</DashboardWidget>
{/if}
