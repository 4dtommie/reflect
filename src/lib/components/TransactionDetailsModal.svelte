<script lang="ts">
	import { scale } from 'svelte/transition';
	import {
		X,
		CheckCircle,
		Building2,
		Clock,
		Tag,
		Globe,
		ArrowLeftRight,
		Pencil,
		Scissors,
		Repeat,
		FileText,
		MessageCircle,
		Download,
		ArrowLeft,
		Loader2
	} from 'lucide-svelte';
	import Amount from '$lib/components/Amount.svelte';
	import CategorySelector from '$lib/components/CategorySelector.svelte';
	import { transactionModalStore, type TransactionData } from '$lib/stores/transactionModalStore';
	import { invalidateAll } from '$app/navigation';

	// Subscribe to store
	const state = $derived($transactionModalStore);

	// View mode: 'details' or 'changeCategory'
	let viewMode = $state<'details' | 'changeCategory'>('details');
	let selectedCategoryId = $state<number | null>(null);
	let isSaving = $state(false);
	let categories = $state<any[]>([]);

	// Reset view mode when modal opens
	$effect(() => {
		if (state.isOpen) {
			viewMode = 'details';
			selectedCategoryId = state.transaction?.category?.id ?? null;
			// Fetch categories when modal opens
			fetchCategories();
		}
	});

	async function fetchCategories() {
		try {
			const res = await fetch('/api/categories');
			if (res.ok) {
				const data = await res.json();
				// API returns { categories: [...] }
				categories = data.categories || [];

				// Match current category by name to find the real ID
				const currentCategoryName = state.transaction?.category?.name;
				if (currentCategoryName && categories.length > 0) {
					const matchedCategory = categories.find(
						(c: any) => c.name.toLowerCase() === currentCategoryName.toLowerCase()
					);
					if (matchedCategory) {
						selectedCategoryId = matchedCategory.id;
					}
				}
			} else {
				console.error('Failed to fetch categories:', res.status, res.statusText);
			}
		} catch (e) {
			console.error('Failed to fetch categories:', e);
		}
	}

	// Format date nicely
	function formatDateTime(date: string | Date): string {
		const d = typeof date === 'string' ? new Date(date) : date;
		return d.toLocaleDateString('en-US', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}

	// Get transaction type label
	function getTypeLabel(type: string | undefined): string {
		if (!type) return 'No notes';
		const labels: Record<string, string> = {
			Payment: 'Payment',
			Transfer: 'Transfer',
			DirectDebit: 'Direct debit',
			Deposit: 'Deposit',
			Withdrawal: 'Withdrawal',
			Refund: 'Refund',
			Fee: 'Fee',
			Interest: 'Interest',
			Other: 'Other'
		};
		return labels[type] || type;
	}

	function handleClose() {
		transactionModalStore.close();
	}

	function handleChangeCategory() {
		viewMode = 'changeCategory';
	}

	function handleBackToDetails() {
		viewMode = 'details';
	}

	async function handleSaveCategory() {
		if (!state.transaction || !selectedCategoryId) return;

		isSaving = true;
		try {
			const res = await fetch(`/api/transactions/${state.transaction.id}/categorize`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					categoryId: selectedCategoryId,
					merchantName: state.transaction.merchantName
				})
			});

			if (res.ok) {
				await invalidateAll();
				handleClose();
			}
		} catch (e) {
			console.error('Failed to save category:', e);
		} finally {
			isSaving = false;
		}
	}

	// Mock action handlers
	function handleSplit() {
		console.log('Split: Coming soon');
	}
	function handleRepeat() {
		console.log('Repeat: Coming soon');
	}
	function handleAddReceipt() {
		console.log('Add receipt: Coming soon');
	}
	function handleContact() {
		console.log('Contact: Coming soon');
	}
	function handleDownloadPDF() {
		console.log('Download PDF: Coming soon');
	}
</script>

{#if state.isOpen && state.transaction}
	{@const tx = state.transaction}
	<div class="modal-open modal" role="dialog" aria-modal="true">
		<div
			class="modal-box w-11/12 max-w-lg overflow-hidden p-0"
			in:scale={{ duration: 200, start: 0.95 }}
			out:scale={{ duration: 150, start: 0.95 }}
		>
			{#if viewMode === 'details'}
				<!-- Details View -->
				<!-- Header -->
				<div
					class="flex items-center justify-between border-b border-base-300 bg-base-200/50 px-6 py-4"
				>
					<h3 class="text-lg font-bold">
						Transaction details of {tx.merchant?.name ?? tx.merchantName}
					</h3>
					<button class="btn btn-circle btn-ghost btn-sm" onclick={handleClose}>
						<X size={20} />
					</button>
				</div>

				<div class="flex flex-col space-y-6 p-6">
					<!-- Amount + Logo Row -->
					<div class="flex items-start justify-between">
						<div>
							<div class="text-3xl font-bold">
								<Amount
									value={typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount}
									size="large"
									isDebit={tx.is_debit}
									showDecimals={true}
									locale="NL"
								/>
							</div>
							<div class="mt-1 flex items-center gap-2 text-sm text-success">
								<CheckCircle size={16} />
								<span>Completed</span>
							</div>
						</div>
						<!-- Merchant Logo Placeholder -->
						<div class="flex h-14 w-14 items-center justify-center rounded-xl bg-base-200 text-2xl">
							🏪
						</div>
					</div>

					<!-- About the transaction -->
					<div>
						<h4 class="mb-4 text-base font-semibold">About the transaction</h4>
						<div class="space-y-3">
							<!-- Counterparty IBAN -->
							<div class="flex items-center justify-between text-sm">
								<div class="flex items-center gap-3 opacity-70">
									<Building2 size={16} />
									<span>Counterparty IBAN</span>
								</div>
								<span class="max-w-[60%] truncate text-right font-medium" title={tx.description}>
									{tx.description || 'N/A'}
								</span>
							</div>

							<!-- Date & Time -->
							<div class="flex items-center justify-between text-sm">
								<div class="flex items-center gap-3 opacity-70">
									<Clock size={16} />
									<span>Date & time</span>
								</div>
								<span class="font-medium">{formatDateTime(tx.date)}</span>
							</div>

							<!-- Category -->
							<div class="flex items-center justify-between text-sm">
								<div class="flex items-center gap-3 opacity-70">
									<Tag size={16} />
									<span>Category</span>
								</div>
								<span class="font-medium">{tx.category?.name ?? 'Uncategorized'}</span>
							</div>

							<!-- Reference -->
							<div class="flex items-center justify-between text-sm">
								<div class="flex items-center gap-3 opacity-70">
									<Globe size={16} />
									<span>Reference</span>
								</div>
								<span class="font-medium">{tx.type ? getTypeLabel(tx.type) : 'Transfer'}</span>
							</div>

							<!-- Type -->
							<div class="flex items-center justify-between text-sm">
								<div class="flex items-center gap-3 opacity-70">
									<ArrowLeftRight size={16} />
									<span>Type</span>
								</div>
								<span class="font-medium">No notes</span>
							</div>
						</div>
					</div>

					<!-- Actions -->
					<div>
						<h4 class="mb-3 text-base font-semibold">Actions</h4>
						<div class="flex flex-wrap gap-2">
							<button class="btn gap-2 btn-outline btn-sm" onclick={handleChangeCategory}>
								<Pencil size={14} />
								Change category
							</button>
							<button class="btn gap-2 btn-outline btn-sm" onclick={handleSplit} disabled>
								<Scissors size={14} />
								Split
							</button>
							<button class="btn gap-2 btn-outline btn-sm" onclick={handleRepeat} disabled>
								<Repeat size={14} />
								Repeat
							</button>
							<button class="btn gap-2 btn-outline btn-sm" onclick={handleAddReceipt} disabled>
								<FileText size={14} />
								Add receipt
							</button>
							<button class="btn gap-2 btn-outline btn-sm" onclick={handleContact} disabled>
								<MessageCircle size={14} />
								Contact
							</button>
							<button class="btn gap-2 btn-outline btn-sm" onclick={handleDownloadPDF} disabled>
								<Download size={14} />
								Download PDF
							</button>
						</div>
					</div>

					<!-- Close button -->
					<div class="flex justify-end border-t border-base-200 pt-4">
						<button class="btn btn-ghost" onclick={handleClose}>Close</button>
					</div>
				</div>
			{:else if viewMode === 'changeCategory'}
				<!-- Change Category View -->
				<div
					class="flex items-center justify-between border-b border-base-300 bg-base-200/50 px-6 py-4"
				>
					<div class="flex items-center gap-3">
						<button class="btn btn-circle btn-ghost btn-sm" onclick={handleBackToDetails}>
							<ArrowLeft size={20} />
						</button>
						<h3 class="text-lg font-bold">Change category</h3>
					</div>
					<button class="btn btn-circle btn-ghost btn-sm" onclick={handleClose}>
						<X size={20} />
					</button>
				</div>

				<div class="flex flex-col space-y-6 p-6">
					<!-- Transaction summary -->
					<div class="rounded-lg bg-base-200/50 p-4">
						<div class="flex items-center justify-between">
							<div>
								<div class="font-semibold">{tx.merchant?.name ?? tx.merchantName}</div>
								<div class="text-sm opacity-70">{formatDateTime(tx.date)}</div>
							</div>
							<Amount
								value={typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount}
								size="medium"
								isDebit={tx.is_debit}
								showDecimals={true}
								locale="NL"
							/>
						</div>
					</div>

					<!-- Category Selector -->
					<div>
						<label class="mb-2 block text-sm font-medium">Select a category</label>
						<CategorySelector {categories} bind:selectedCategoryId />
					</div>

					<!-- Actions -->
					<div class="flex justify-end gap-3 border-t border-base-200 pt-4">
						<button class="btn btn-ghost" onclick={handleBackToDetails}>Cancel</button>
						<button
							class="btn btn-primary"
							onclick={handleSaveCategory}
							disabled={!selectedCategoryId || isSaving}
						>
							{#if isSaving}
								<Loader2 class="animate-spin" size={16} />
								Saving...
							{:else}
								Save category
							{/if}
						</button>
					</div>
				</div>
			{/if}
		</div>
		<button class="modal-backdrop bg-black/50" onclick={handleClose}></button>
	</div>
{/if}
