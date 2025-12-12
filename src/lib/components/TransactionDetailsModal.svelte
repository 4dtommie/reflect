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
		Loader2,
		Store,
		Split,
		MoreHorizontal,
		CreditCard
	} from 'lucide-svelte';
	import * as Icons from 'lucide-svelte';
	import Amount from '$lib/components/Amount.svelte';
	import MerchantLogo from '$lib/components/MerchantLogo.svelte';
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
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Helper to get icon component from string name
	function getCategoryIcon(iconName: string | null | undefined) {
		if (!iconName) return null;
		// @ts-ignore
		return Icons[iconName] || null;
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
	function handlePaymentRequest() {
		console.log('Payment request: Coming soon');
	}
</script>

{#if state.isOpen && state.transaction}
	{@const tx = state.transaction}
	{@const CategoryIcon = getCategoryIcon(tx.category?.icon)}
	<div class="modal-open modal" role="dialog" aria-modal="true">
		<div
			class="modal-box w-11/12 max-w-sm overflow-visible rounded-[2rem] p-0"
			in:scale={{ duration: 200, start: 0.95 }}
			out:scale={{ duration: 150, start: 0.95 }}
		>
			{#if viewMode === 'details'}
				<!-- Close button absolute top right -->
				<button
					class="btn absolute top-4 right-4 z-10 btn-circle btn-ghost btn-sm"
					onclick={handleClose}
				>
					<X size={20} />
				</button>

				<div class="flex flex-col items-center p-8 pt-10 pb-6 text-center">
					<!-- 1. Header: Merchant Logo + Name -->
					<div class="mb-4 flex flex-col items-center gap-3">
						<MerchantLogo
							merchantName={tx.merchant?.name ?? tx.merchantName}
							categoryIcon={tx.category?.icon}
							categoryColor={tx.category?.color}
							size="lg"
						/>
						<h3 class="text-lg font-bold">{tx.merchant?.name ?? tx.merchantName}</h3>
					</div>

					<!-- 2. Centered Amount -->
					<div class="mb-1 text-4xl font-extrabold tracking-tight">
						<Amount
							value={typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount}
							size="custom"
							isDebit={tx.is_debit}
							showDecimals={true}
							locale="NL"
						/>
					</div>

					<!-- 3. Date -->
					<div class="mb-6 text-sm text-base-content/60">
						{formatDateTime(tx.date)}
					</div>

					<!-- 4. Category Pill -->
					<button
						class="btn mb-4 rounded-full border-base-300 px-4 font-normal normal-case btn-outline btn-sm hover:border-primary hover:bg-base-200"
						onclick={handleChangeCategory}
					>
						{tx.category?.name ?? 'Uncategorized'}
					</button>

					<!-- Note/Description Input (Simplified for now, just display) -->
					{#if tx.description}
						<div class="mb-6 w-full text-left">
							<label class="px-1 text-xs font-semibold text-base-content/50">Note</label>
							<div class="w-full rounded-xl border border-base-200 bg-base-100 p-3 text-sm">
								{tx.description}
							</div>
						</div>
					{/if}

					<!-- 5. Actions Row -->
					<div class="mt-2 flex w-full items-center justify-center gap-4">
						<!-- Change Category (Alternative to pill, requested in prompt) -->
						<button class="group flex flex-col items-center gap-2" onclick={handleChangeCategory}>
							<div
								class="flex h-12 w-12 items-center justify-center rounded-full border border-base-300 bg-base-100 shadow-sm transition-all group-hover:-translate-y-1 group-hover:shadow-md"
							>
								<Tag size={20} />
							</div>
							<span class="text-xs font-medium">Change category</span>
						</button>

						<!-- Add Receipt -->
						<button class="group flex flex-col items-center gap-2" onclick={handleAddReceipt}>
							<div
								class="flex h-12 w-12 items-center justify-center rounded-full border border-base-300 bg-base-100 shadow-sm transition-all group-hover:-translate-y-1 group-hover:shadow-md"
							>
								<FileText size={20} />
							</div>
							<span class="text-xs font-medium">Add receipt</span>
						</button>

						<!-- Split -->
						<button class="group flex flex-col items-center gap-2" onclick={handleSplit}>
							<div
								class="flex h-12 w-12 items-center justify-center rounded-full border border-base-300 bg-base-100 shadow-sm transition-all group-hover:-translate-y-1 group-hover:shadow-md"
							>
								<Split size={20} />
							</div>
							<span class="text-xs font-medium">Split</span>
						</button>

						<!-- Repeat -->
						<button class="group flex flex-col items-center gap-2" onclick={handleRepeat}>
							<div
								class="flex h-12 w-12 items-center justify-center rounded-full border border-base-300 bg-base-100 shadow-sm transition-all group-hover:-translate-y-1 group-hover:shadow-md"
							>
								<Repeat size={20} />
							</div>
							<span class="text-xs font-medium">Repeat</span>
						</button>

						<!-- More Actions Dropdown -->
						<div class="dropdown dropdown-end dropdown-top">
							<div tabindex="0" role="button" class="group flex flex-col items-center gap-2">
								<div
									class="flex h-12 w-12 items-center justify-center rounded-full border border-base-300 bg-base-100 shadow-sm transition-all group-hover:-translate-y-1 group-hover:shadow-md"
								>
									<MoreHorizontal size={20} />
								</div>
								<span class="text-xs font-medium">More</span>
							</div>
							<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
							<ul
								tabindex="0"
								class="dropdown-content menu z-[1] mb-2 w-52 rounded-box bg-base-100 p-2 shadow-lg"
							>
								<li>
									<button onclick={handlePaymentRequest}>
										<CreditCard size={16} />
										Payment request
									</button>
								</li>
								<li>
									<button onclick={handleContact}>
										<MessageCircle size={16} />
										Contact support
									</button>
								</li>
								<li>
									<button onclick={handleDownloadPDF}>
										<Download size={16} />
										Download PDF
									</button>
								</li>
							</ul>
						</div>
					</div>

					<button
						class="mt-8 text-sm text-base-content/50 hover:text-base-content hover:underline"
						onclick={handleClose}
					>
						More actions
					</button>
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
