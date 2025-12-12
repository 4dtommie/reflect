<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import { X, Search, Sparkles, Check, AlertCircle, Loader2, ChevronDown } from 'lucide-svelte';
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
		merchant?: {
			id: number;
			name: string;
		} | null;
		amount: string;
		description: string;
		category_confidence: number | null;
		category: Category | null;
	}

	interface AIResult {
		categoryId: number | null;
		categoryName?: string;
		confidence: number;
		cleanedMerchantName?: string;
		merchantNameOptions?: string[];
		reasoning?: string;
	}

	let {
		transaction,
		isOpen,
		categories = [],
		onClose,
		onSave,
		preloadedResult,
		similarCount = 0
	}: {
		transaction: Transaction | null;
		isOpen: boolean;
		categories: Category[];
		onClose: () => void;
		onSave: (
			transactionId: number,
			categoryId: number,
			merchantName: string,
			applyToAllSimilar?: boolean
		) => Promise<void>;
		preloadedResult?: AIResult | null;
		similarCount?: number;
	} = $props();

	let isLoading = $state(false);
	let isSaving = $state(false);
	let error = $state<string | null>(null);

	// Form state
	let selectedCategoryId = $state<number | null>(null);
	let merchantName = $state('');
	let applyToAllSimilar = $state(false);

	// AI state
	let aiResult = $state<AIResult | null>(null);
	let isAiLoading = $state(false);

	// Reset state when transaction changes or modal opens
	$effect(() => {
		if (isOpen && transaction) {
			merchantName = transaction.merchantName;
			selectedCategoryId = transaction.category?.id || null;
			aiResult = null;
			error = null;
			applyToAllSimilar = similarCount > 1; // Default to true if multiple exist

			// Use preloaded result if available, otherwise fetch
			if (preloadedResult) {
				applyAIResult(preloadedResult);
			} else if (!transaction.category_confidence || transaction.category_confidence < 0.9) {
				fetchAISuggestion();
			}
		}

		if (isOpen && categories.length > 0) {
			console.log('🔍 [CategorizeModal] Categories received:', categories.length);
			const withParent = categories.filter((c) => c.parentId);
			console.log('   - With parentId:', withParent.length);
			if (withParent.length > 0) {
				console.log('   - Sample with parent:', withParent[0]);
			} else {
				console.log('   - Sample category:', categories[0]);
			}
		}
	});

	function applyAIResult(result: AIResult) {
		aiResult = result;
		if (result.cleanedMerchantName) {
			merchantName = result.cleanedMerchantName;
		}
		if (result.categoryId) {
			selectedCategoryId = result.categoryId;
		}
	}

	async function fetchAISuggestion() {
		if (!transaction) return;

		isAiLoading = true;
		try {
			const response = await fetch('/api/transactions/categorize-single', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ transactionId: transaction.id })
			});

			if (!response.ok) throw new Error('Failed to fetch AI suggestion');

			const data = await response.json();
			applyAIResult(data);
		} catch (e) {
			console.error('AI Suggestion error:', e);
			// Don't show error to user, just fail silently for AI part
		} finally {
			isAiLoading = false;
		}
	}

	async function handleSave() {
		if (!transaction || !selectedCategoryId) return;

		isSaving = true;
		error = null;

		try {
			await onSave(transaction.id, selectedCategoryId, merchantName, applyToAllSimilar);
			onClose();
		} catch (e) {
			console.error('Save error:', e);
			error = 'Failed to save changes. Please try again.';
		} finally {
			isSaving = false;
		}
	}

	function selectCategory(category: Category) {
		selectedCategoryId = category.id;
	}
</script>

{#if isOpen && transaction}
	<div class="modal-open modal" role="dialog" aria-modal="true">
		<div
			class="modal-box flex h-[600px] w-11/12 max-w-5xl flex-col overflow-hidden p-0"
			in:scale={{ duration: 200, start: 0.95 }}
			out:scale={{ duration: 150, start: 0.95 }}
		>
			<!-- Header -->
			<div
				class="flex flex-none items-center justify-between border-b border-base-300 bg-base-200 px-6 py-4"
			>
				<h3 class="text-lg font-bold">Categorize Transaction</h3>
				<button class="btn btn-circle btn-ghost btn-sm" onclick={onClose}>
					<X size={20} />
				</button>
			</div>

			<div class="grid min-h-0 flex-1 grid-cols-1 gap-0 md:grid-cols-2">
				<!-- Left Column: Transaction & AI -->
				<div class="space-y-6 overflow-y-auto border-r border-base-300 bg-base-200/30 p-6">
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
								<div class="mt-1 text-xl font-bold" title={transaction.merchantName}>
									{transaction.merchant?.name ?? transaction.merchantName}
								</div>
								<div class="mt-2 text-sm opacity-70">{transaction.description}</div>
							</div>
							<div class="pl-4 text-right whitespace-nowrap">
								<Amount value={parseFloat(transaction.amount)} class="text-2xl font-bold" />
							</div>
						</div>
					</div>

					<!-- AI Analysis Section -->
					{#if isAiLoading}
						<div class="alert flex items-center gap-3 border-none bg-base-100 shadow-sm">
							<Loader2 class="animate-spin text-primary" size={20} />
							<span class="text-sm opacity-70">AI is analyzing this transaction...</span>
						</div>
					{:else if aiResult}
						<div class="space-y-3 rounded-lg border border-primary/10 bg-primary/5 p-4">
							<div class="flex items-center gap-2 font-medium text-primary">
								<Sparkles size={16} />
								<span>AI Suggestion Applied</span>
								<span class="badge badge-outline badge-sm badge-primary">
									{Math.round(aiResult.confidence * 100)}% confidence
								</span>
							</div>

							{#if aiResult.reasoning}
								<p class="text-sm leading-relaxed opacity-80">
									{aiResult.reasoning}
								</p>
							{/if}
						</div>
					{/if}
				</div>

				<!-- Right Column: Inputs & Actions -->
				<div class="flex h-full flex-col p-6">
					<!-- Scrollable content area -->
					<div class="flex-1 space-y-6 overflow-y-auto">
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
							{#if aiResult?.merchantNameOptions && aiResult.merchantNameOptions.length > 0}
								<div class="mt-2 flex flex-wrap gap-2">
									{#each aiResult.merchantNameOptions as option}
										<button
											class="badge cursor-pointer badge-outline transition-colors hover:badge-primary"
											onclick={() => (merchantName = option)}
											type="button"
										>
											{option}
										</button>
									{/each}
								</div>
							{/if}
						</div>

						<!-- Category Selection (Search Select) -->
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
					</div>

					<!-- Actions -->
					<div class="mt-auto flex justify-end gap-3 border-t border-base-200 pt-4">
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
								Save {similarCount > 1 ? `(${similarCount})` : ''}
							{/if}
						</button>
					</div>
				</div>
			</div>
		</div>
		<div class="modal-backdrop bg-black/50" onclick={onClose}></div>
	</div>
{/if}
