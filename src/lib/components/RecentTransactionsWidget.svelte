<script lang="ts">
	import DashboardWidget from './DashboardWidget.svelte';
	import Amount from './Amount.svelte';
	import * as LucideIcons from 'lucide-svelte';
	import { transactionModalStore } from '$lib/stores/transactionModalStore';

	let { transactions }: { transactions: any[] } = $props();

	// Get icon component from lucide-svelte by name
	const getCategoryIcon = (iconName: string | null) => {
		if (!iconName) return LucideIcons.ShoppingCart;

		// Try to get the icon from lucide-svelte
		const icon = (LucideIcons as any)[iconName];
		return icon || LucideIcons.ShoppingCart;
	};

	function handleTransactionClick(transaction: any) {
		// Dashboard provides category as a string (name), not an object
		// Build the category object from available fields
		const categoryObj = transaction.category
			? typeof transaction.category === 'string'
				? { id: 0, name: transaction.category, icon: transaction.categoryIcon }
				: transaction.category
			: null;

		transactionModalStore.open({
			id: transaction.id,
			date: transaction.date,
			merchantName: transaction.merchantName ?? transaction.merchant,
			amount: transaction.amount,
			description: transaction.description ?? '',
			is_debit: transaction.isDebit ?? transaction.is_debit ?? true,
			category: categoryObj,
			merchant: transaction.merchant ? { name: transaction.merchant } : null,
			type: transaction.type,
			is_recurring: transaction.is_recurring,
			recurring_transaction: transaction.recurring_transaction
		});
	}
</script>

{#if transactions.length === 0}
	{@const Clock = LucideIcons.Clock}
	<!-- Empty State -->
	<DashboardWidget size="small" variant="placeholder">
		<div class="flex h-full flex-col items-center justify-center text-center opacity-50">
			<Clock size={48} class="mb-4" />
			<h3 class="text-lg font-semibold">Recent transactions</h3>
			<p class="text-sm">This will fill up after you add transactions</p>
		</div>
	</DashboardWidget>
{:else}
	<!-- Transaction List -->
	<DashboardWidget
		size="auto"
		title="Recent transactions"
		actionLabel="View all"
		actionHref="/transactions"
	>
		<div class="space-y-1">
			<div class="flex flex-col gap-2">
				{#each transactions as transaction}
					{@const Icon = getCategoryIcon(transaction.categoryIcon)}
					<button
						class="flex w-full cursor-pointer items-center justify-between rounded-lg border border-transparent px-3 py-2 text-left transition-all hover:border-base-300 hover:bg-base-200"
						onclick={() => handleTransactionClick(transaction)}
					>
						<div class="flex min-w-0 flex-1 flex-col">
							<span class="truncate text-sm font-medium">{transaction.merchant}</span>
							<div class="flex items-center gap-2 text-xs text-base-content/60">
								<Icon size={12} />
								<span>{transaction.category}</span>
							</div>
						</div>
						<div class="flex-shrink-0 text-right">
							<Amount value={transaction.amount} size="small" isDebit={transaction.isDebit} />
						</div>
					</button>
				{/each}
			</div>
		</div>
	</DashboardWidget>
{/if}
