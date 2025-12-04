<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import { X, Search, Sparkles, Check, AlertCircle, Loader2, ChevronDown } from 'lucide-svelte';
	import Amount from '$lib/components/Amount.svelte';

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
	let searchQuery = $state('');
	let isCategoryDropdownOpen = $state(false);
	let applyToAllSimilar = $state(false);

	// AI state
	let aiResult = $state<AIResult | null>(null);
	let isAiLoading = $state(false);

	// Derived state
	let filteredCategories = $derived.by(() => {
		const filtered = searchQuery
			? categories.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
			: categories;

		if (searchQuery) return filtered;

		// Group by parent for display
		const parents = filtered.filter((c) => !c.parentId);
		const children = filtered.filter((c) => c.parentId);

		const result: (Category & { isHeader?: boolean })[] = [];

		for (const parent of parents) {
			const myChildren = children.filter((c) => c.parentId === parent.id);

			if (myChildren.length > 0) {
				// Parent is a header because it has children
				result.push({ ...parent, isHeader: true });
				result.push(...myChildren);
			} else {
				// Parent has no children, so it's a selectable category
				result.push(parent);
			}
		}

		// Add any orphans (shouldn't happen ideally but good for safety)
		const orphans = children.filter((c) => !parents.find((p) => p.id === c.parentId));
		result.push(...orphans);

		return result;
	});

	let selectedCategory = $derived(
		selectedCategoryId ? categories.find((c) => c.id === selectedCategoryId) : null
	);

	// Reset state when transaction changes or modal opens
	$effect(() => {
		if (isOpen && transaction) {
			merchantName = transaction.merchantName;
			selectedCategoryId = transaction.category?.id || null;
			searchQuery = '';
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

	let triggerButton: HTMLButtonElement;
	let dropdownPosition = $state({ top: 0, left: 0, width: 0 });

	function toggleDropdown() {
		if (isCategoryDropdownOpen) {
			isCategoryDropdownOpen = false;
		} else {
			if (triggerButton) {
				const rect = triggerButton.getBoundingClientRect();
				dropdownPosition = {
					top: rect.bottom + 4, // 4px gap
					left: rect.left,
					width: rect.width
				};
			}
			isCategoryDropdownOpen = true;
			searchQuery = '';
			setTimeout(() => document.getElementById('category-search-input')?.focus(), 0);
		}
	}

	function handleScroll() {
		if (isCategoryDropdownOpen && triggerButton) {
			// Update position on scroll to keep it attached
			const rect = triggerButton.getBoundingClientRect();
			dropdownPosition = {
				top: rect.bottom + 4,
				left: rect.left,
				width: rect.width
			};
		}
	}
</script>

<svelte:window on:scroll={handleScroll} on:resize={handleScroll} />

{#if isOpen && transaction}
	<div class="modal-open modal" role="dialog" aria-modal="true">
		<div
			class="modal-box h-[600px] w-11/12 max-w-5xl p-0"
			in:scale={{ duration: 200, start: 0.95 }}
			out:scale={{ duration: 150, start: 0.95 }}
		>
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-base-300 bg-base-200 px-6 py-4">
				<h3 class="text-lg font-bold">Categorize Transaction</h3>
				<button class="btn btn-circle btn-ghost btn-sm" onclick={onClose}>
					<X size={20} />
				</button>
			</div>

			<div class="grid h-[calc(600px-64px)] grid-cols-1 gap-0 md:grid-cols-2">
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
								<div class="mt-1 text-xl font-bold">{transaction.merchantName}</div>
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
					<div class="flex-1 space-y-6 overflow-y-auto" onscroll={handleScroll}>
						<!-- Merchant Name Input -->
						<div class="form-control w-full">
							<label class="label">
								<span class="label-text font-medium">Merchant Name</span>
							</label>
							<input
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
							<label class="label">
								<span class="label-text font-medium">Category</span>
							</label>

							<div class="relative">
								{#if !isCategoryDropdownOpen && selectedCategory}
									<!-- Display Mode (Selected) -->
									<button
										bind:this={triggerButton}
										class="input-bordered input flex w-full items-center justify-between px-3 text-left focus:border-primary focus:outline-none"
										onclick={toggleDropdown}
										type="button"
									>
										<div class="flex items-center gap-2">
											<div
												class="flex h-6 w-6 items-center justify-center rounded-full text-[10px] text-white"
												style="background-color: {selectedCategory.color || 'hsl(var(--p))'}"
											>
												{#if selectedCategory.icon && selectedCategory.icon.length <= 2}
													{selectedCategory.icon}
												{:else}
													{selectedCategory.name[0]}
												{/if}
											</div>
											<span class="font-medium">{selectedCategory.name}</span>
										</div>
										<ChevronDown size={16} class="opacity-50" />
									</button>
								{:else}
									<!-- Search Mode (Input) -->
									<div class="relative">
										<Search class="absolute top-3 left-3 opacity-50" size={18} />
										<input
											bind:this={triggerButton}
											id="category-search-input"
											type="text"
											class="input-bordered input w-full pl-10"
											placeholder={selectedCategory ? 'Change category...' : 'Select category...'}
											bind:value={searchQuery}
											onfocus={() => {
												if (!isCategoryDropdownOpen) toggleDropdown();
											}}
											onclick={() => {
												if (!isCategoryDropdownOpen) toggleDropdown();
											}}
										/>
										{#if isCategoryDropdownOpen}
											<button
												class="absolute top-3 right-3 opacity-50 hover:opacity-100"
												onclick={(e) => {
													e.stopPropagation();
													isCategoryDropdownOpen = false;
													searchQuery = '';
												}}
											>
												<X size={18} />
											</button>
										{/if}
									</div>
								{/if}
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

		<!-- Fixed Dropdown Portal -->
		{#if isCategoryDropdownOpen}
			<!-- Backdrop to close -->
			<div
				class="fixed inset-0 z-[9998]"
				onclick={() => (isCategoryDropdownOpen = false)}
				role="button"
				tabindex="-1"
			></div>

			<div
				class="fixed z-[9999] rounded-lg border border-base-300 bg-base-100 p-2 shadow-xl"
				style="top: {dropdownPosition.top}px; left: {dropdownPosition.left}px; width: {dropdownPosition.width}px;"
				transition:fade={{ duration: 100 }}
			>
				<div class="max-h-60 divide-y divide-base-200 overflow-y-auto">
					{#each filteredCategories as category}
						{#if category.isHeader}
							<div
								class="bg-base-200/50 px-3 py-1.5 text-xs font-bold tracking-wider uppercase opacity-50"
							>
								{category.name}
							</div>
						{:else}
							<button
								class="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-base-200 {selectedCategoryId ===
								category.id
									? 'bg-base-200'
									: ''} {category.parentId ? 'pl-6' : ''}"
								onclick={() => {
									selectCategory(category);
									isCategoryDropdownOpen = false;
								}}
								type="button"
							>
								<div
									class="flex h-6 w-6 items-center justify-center rounded-full text-[10px] text-white"
									style="background-color: {category.color || 'hsl(var(--p))'}"
								>
									{#if category.icon && category.icon.length <= 2}
										{category.icon}
									{:else}
										{category.name[0]}
									{/if}
								</div>
								<span class="flex-1 text-sm">{category.name}</span>
								{#if selectedCategoryId === category.id}
									<Check size={14} class="text-primary" />
								{/if}
							</button>
						{/if}
					{/each}

					{#if filteredCategories.length === 0}
						<div class="p-3 text-center text-sm opacity-50">No categories found</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
{/if}
