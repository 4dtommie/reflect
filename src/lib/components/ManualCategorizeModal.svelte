<script lang="ts">
	import { scale } from 'svelte/transition';
	import { X, AlertCircle, Loader2 } from 'lucide-svelte';
	import Amount from '$lib/components/Amount.svelte';
	import CategorySelector from '$lib/components/CategorySelector.svelte';

	interface Category {
		id: number;
		name: string;
		icon?: string | null;
		color?: string | null;
		parentId?: number | null;
	}

	interface Transaction {
		id: number;
		date: string;
		merchantName: string;
		amount: string;
		description: string;
		category: Category | null;
	}

	let {
		transaction,
		isOpen,
		categories = [],
		transactionCount = 1,
		onClose,
		onSave
	}: {
		transaction: Transaction | null;
		isOpen: boolean;
		categories: Category[];
		transactionCount?: number;
		onClose: () => void;
		onSave: (transactionId: number, categoryId: number, merchantName: string) => Promise<void>;
	} = $props();

	let isSaving = $state(false);
	let error = $state<string | null>(null);

	// Form state
	let selectedCategoryId = $state<number | null>(null);
	let merchantName = $state('');

	// Reset state when transaction changes or modal opens
	$effect(() => {
		if (isOpen && transaction) {
			merchantName = transaction.merchantName;
			selectedCategoryId = transaction.category?.id || null;
			error = null;
		}
	});

	async function handleSave() {
		if (!transaction || !selectedCategoryId) return;

		isSaving = true;
		error = null;

		try {
			await onSave(transaction.id, selectedCategoryId, merchantName);
			onClose();
		} catch (e) {
			console.error('Save error:', e);
			error = 'Failed to save changes. Please try again.';
		} finally {
			isSaving = false;
		}
	}
</script>

{#if isOpen && transaction}
	<div class="modal-open modal" role="dialog" aria-modal="true">
		<div
			class="modal-box w-11/12 max-w-lg overflow-hidden p-0"
			in:scale={{ duration: 200, start: 0.95 }}
			out:scale={{ duration: 150, start: 0.95 }}
		>
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-base-300 bg-base-200 px-6 py-4">
				<h3 class="text-lg font-bold">Edit Transaction</h3>
				<button class="btn btn-circle btn-ghost btn-sm" onclick={onClose}>
					<X size={20} />
				</button>
			</div>

			<div class="flex flex-col space-y-6 p-6">
				<!-- Transaction Details Card -->
				<div class="rounded-lg border border-base-200 bg-base-100 p-4 shadow-sm">
					<div class="flex items-start justify-between">
						<div>
							<div class="text-sm opacity-70">
								{new Date(transaction.date).toLocaleDateString('nl-NL', {
									day: 'numeric',
									month: 'long',
									year: 'numeric'
								})}
							</div>
							<div class="mt-1 text-xl font-bold">{transaction.merchantName}</div>
							<div class="mt-2 text-sm opacity-70">{transaction.description}</div>
						</div>
						<div class="pl-4 text-right whitespace-nowrap">
							<Amount value={parseFloat(transaction.amount)} class="text-2xl font-bold" />
						</div>
					</div>
				</div>

				<!-- Merchant Name Input -->
				<div class="form-control w-full">
					<label class="label" for="merchant-name-input">
						<span class="label-text font-medium">Merchant Name</span>
					</label>
					<input
						id="merchant-name-input"
						type="text"
						bind:value={merchantName}
						class="input-bordered input w-full"
						placeholder="Merchant Name"
					/>
				</div>

				<!-- Category Selection -->
				<div class="form-control w-full">
					<label class="label" for="category-selector">
						<span class="label-text font-medium">Category</span>
					</label>
					<div id="category-selector">
						<CategorySelector {categories} bind:selectedCategoryId />
					</div>
				</div>

				{#if error}
					<div class="alert py-2 text-sm alert-error">
						<AlertCircle size={16} />
						<span>{error}</span>
					</div>
				{/if}

				<!-- Actions -->
				<div class="flex justify-end gap-3 pt-4">
					<button class="btn btn-ghost" onclick={onClose} disabled={isSaving}> Cancel </button>
					<button
						class="btn btn-primary"
						onclick={handleSave}
						disabled={!selectedCategoryId || isSaving}
					>
						{#if isSaving}
							<Loader2 class="animate-spin" size={18} />
							Saving...
						{:else}
							Save {transactionCount > 1 ? `(${transactionCount})` : ''}
						{/if}
					</button>
				</div>
			</div>
		</div>
		<div class="modal-backdrop bg-black/50" onclick={onClose}></div>
	</div>
{/if}
