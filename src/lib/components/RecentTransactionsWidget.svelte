<script lang="ts">
	import DashboardWidget from './DashboardWidget.svelte';
	import Amount from './Amount.svelte';
	import MerchantLogo from './MerchantLogo.svelte';
	import { Clock } from 'lucide-svelte';
	import { transactionModalStore } from '$lib/stores/transactionModalStore';

	let { transactions, variant = 'redesign' }: { transactions: any[]; variant?: 'original' | 'redesign' } = $props();

	// Try to extract time (HH:MM) from description text like "... 14:30 ..." or fallback to transaction.date
	function extractTime(transaction: any) {
		const desc = transaction.description ?? '';
		const timeMatch = desc.match(/(\b[0-2]?\d:[0-5]\d\b)/);
		if (timeMatch) return timeMatch[1];
		if (transaction.date) {
			const d = new Date(transaction.date);
			return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		}
		return '';
	}

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
					<button
						class="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-left transition-all hover:border-base-300 hover:bg-base-200"
						onclick={() => handleTransactionClick(transaction)}
					>
						<MerchantLogo
							merchantName={transaction.merchantName ||
								(typeof transaction.merchant === 'string' ? transaction.merchant : 'Unknown')}
							categoryIcon={transaction.categoryIcon}
							categoryColor={transaction.categoryColor}
							size="sm"
						/>
						<div class="flex min-w-0 flex-1 flex-col">
							<span class="truncate text-sm font-medium">{transaction.merchant}</span>
							{#if variant === 'original'}
								<span class="text-xs text-base-content/60">{transaction.date ? new Date(transaction.date).toLocaleDateString() : ''} {extractTime(transaction) ? '· ' + extractTime(transaction) : ''}</span>
							{:else}
								<span class="text-xs text-base-content/60">{transaction.category}</span>
							{/if}
						</div>
						<div class="flex-shrink-0 text-right">
							<Amount value={transaction.amount} size="sm" isDebit={transaction.isDebit} />
						</div>
					</button>
				{/each}
			</div>
		</div>
	</DashboardWidget>
{/if}
