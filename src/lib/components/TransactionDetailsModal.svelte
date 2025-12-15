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
		FileText,
		MessageCircle,
		Download,
		ArrowLeft,
		Loader2,
		Store,
		MoreHorizontal,
		CreditCard,
		RefreshCw
	} from 'lucide-svelte';
	import * as Icons from 'lucide-svelte';
	import Amount from '$lib/components/Amount.svelte';
	import MerchantLogo from '$lib/components/MerchantLogo.svelte';
	import CategorySelector from '$lib/components/CategorySelector.svelte';
	import { transactionModalStore, type TransactionData } from '$lib/stores/transactionModalStore';
	import { createSubscriptionModalStore } from '$lib/stores/createSubscriptionModalStore';
	import { recurringModalStore } from '$lib/stores/recurringModalStore';
	import { invalidateAll } from '$app/navigation';

	// Subscribe to store
	const modalState = $derived($transactionModalStore);

	// View mode: 'details' or 'changeCategory'
	let viewMode = $state<'details' | 'changeCategory'>('details');
	let selectedCategoryId = $state<number | null>(null);
	let isSaving = $state(false);
	let categories = $state<any[]>([]);

	// Merchant renaming state
	let isRenaming = $state(false);
	let tempMerchantName = $state('');

	// Reset view mode when modal opens
	$effect(() => {
		if (modalState.isOpen) {
			viewMode = 'details';
			selectedCategoryId = modalState.transaction?.category?.id ?? null;
			isRenaming = false;
			tempMerchantName =
				modalState.transaction?.merchant?.name ?? modalState.transaction?.merchantName ?? '';
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
				const currentCategoryName = modalState.transaction?.category?.name;
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
		if (!modalState.transaction || !selectedCategoryId) return;

		isSaving = true;
		try {
			const res = await fetch(`/api/transactions/${modalState.transaction.id}/categorize`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					categoryId: selectedCategoryId,
					merchantName: modalState.transaction.merchantName
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

	// Handle recurring/subscription actions
	async function handleToggleRecurring() {
		if (!modalState.transaction) return;

		// If already a subscription, open the recurring details modal
		if (modalState.transaction.recurring_transaction_id) {
			await openRecurringDetails();
			return;
		}

		// Otherwise, open creation modal
		createSubscriptionModalStore.open(modalState.transaction);
		transactionModalStore.close();
	}

	async function openRecurringDetails() {
		if (!modalState.transaction?.recurring_transaction_id) return;

		try {
			// Fetch the recurring data
			const res = await fetch('/api/recurring');
			if (res.ok) {
				const data = await res.json();
				const recurring = data.subscriptions.find(
					(s: any) => s.id === modalState.transaction?.recurring_transaction_id
				);
				if (recurring) {
					transactionModalStore.close();
					recurringModalStore.open(recurring);
				}
			}
		} catch (e) {
			console.error('Failed to fetch recurring details:', e);
		}
	}

	function handleAddReceipt() {
		console.log('Add receipt: Coming soon');
	}
	function handlePaymentRequest() {
		console.log('Payment request: Coming soon');
	}
	function handleContact() {
		console.log('Contact: Coming soon');
	}
	async function handleRenameMerchant() {
		if (!modalState.transaction?.merchant?.id || !tempMerchantName.trim()) return;

		isSaving = true;
		try {
			const res = await fetch(`/api/merchants/${modalState.transaction.merchant.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: tempMerchantName.trim()
				})
			});

			if (res.ok) {
				// Update local store state immediately
				const updatedName = tempMerchantName.trim();
				if (modalState.transaction.merchant) {
					modalState.transaction.merchant.name = updatedName;
				}
				// Also update fallback/display name on transaction if needed
				modalState.transaction.merchantName = updatedName;

				await invalidateAll();
				isRenaming = false;
			} else {
				console.error('Failed to rename merchant');
			}
		} catch (e) {
			console.error('Failed to rename merchant:', e);
		} finally {
			isSaving = false;
		}
	}

	function startRenaming() {
		tempMerchantName =
			modalState.transaction?.merchant?.name ?? modalState.transaction?.merchantName ?? '';
		isRenaming = true;
	}

	function cancelRenaming() {
		isRenaming = false;
	}

	function handleDownloadPDF() {
		console.log('Download PDF: Coming soon');
	}
</script>

{#if modalState.isOpen && modalState.transaction}
	{@const tx = modalState.transaction}
	{@const CategoryIcon = getCategoryIcon(tx.category?.icon)}
	<div class="modal-open modal" role="dialog" aria-modal="true">
		<div
			class="modal-box w-11/12 max-w-md overflow-visible rounded-[2rem] p-0"
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
						{#if isRenaming}
							<div class="flex items-center gap-2">
								<input
									type="text"
									class="input-bordered input input-sm w-full min-w-[200px] text-center font-bold"
									bind:value={tempMerchantName}
									autofocus
								/>
								<button
									class="btn btn-circle text-white btn-xs btn-success"
									onclick={handleRenameMerchant}
									disabled={isSaving}
								>
									<CheckCircle size={14} />
								</button>
								<button class="btn btn-circle btn-ghost btn-xs" onclick={cancelRenaming}>
									<X size={14} />
								</button>
							</div>
						{:else}
							<div class="group flex items-center justify-center gap-2">
								<h3 class="text-lg font-bold">{tx.merchant?.name ?? tx.merchantName}</h3>
								{#if tx.merchant}
									<button
										class="btn btn-circle btn-ghost btn-xs"
										onclick={startRenaming}
										title="Rename global merchant"
									>
										<Pencil size={12} />
									</button>
								{/if}
							</div>
						{/if}
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

					<!-- Subscription Indicator (Clickable) -->
					{#if tx.recurring_transaction}
						<button
							onclick={openRecurringDetails}
							class="mb-6 flex w-full max-w-[240px] cursor-pointer items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
						>
							<div
								class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-content shadow-sm"
							>
								<RefreshCw size={18} />
							</div>
							<div class="flex flex-col">
								<span class="text-[10px] font-bold tracking-wider text-primary uppercase opacity-60"
									>Subscription</span
								>
								<div class="flex items-center gap-2">
									<span class="text-sm font-bold"
										>{tx.recurring_transaction.interval.charAt(0).toUpperCase() +
											tx.recurring_transaction.interval.slice(1)}</span
									>
									<!-- <span class="text-xs opacity-50">• Next: ?</span> -->
								</div>
							</div>
						</button>
					{/if}

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
							<div
								class="w-full rounded-xl border border-base-content/20 bg-base-100 p-3 text-sm shadow-[0_1px_2px_0_rgba(0,0,0,0.05),-4px_6px_15px_-3px_rgba(105,125,155,0.05),4px_6px_15px_-3px_rgba(145,120,175,0.05)]"
							>
								{tx.description}
							</div>
						</div>
					{/if}

					<!-- 5. Actions Row -->
					<div class="mt-2 flex w-full items-center justify-center gap-4">
						<!-- Change Category (Pill button) -->
						<button
							class="group flex h-10 items-center gap-2 rounded-full border border-base-300 bg-base-100 px-4 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
							onclick={handleChangeCategory}
						>
							<Tag size={16} />
							<span class="text-xs font-medium">Change category</span>
						</button>

						<!-- Recurring / Subscription -->
						<button
							class="group flex h-10 items-center gap-2 rounded-full border {modalState.transaction
								.recurring_transaction_id
								? 'border-primary bg-primary/5 text-primary'
								: 'border-base-300 bg-base-100'} px-4 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
							onclick={handleToggleRecurring}
							disabled={isSaving}
						>
							{#if isSaving}
								<Loader2 size={16} class="animate-spin" />
							{:else}
								<RefreshCw size={16} />
							{/if}
							<span class="text-xs font-medium"
								>{modalState.transaction.recurring_transaction_id
									? 'View Sub'
									: 'Make recurring'}</span
							>
						</button>

						<!-- More Actions Dropdown -->
						<div class="dropdown dropdown-end dropdown-top">
							<div
								tabindex="0"
								role="button"
								class="flex h-10 w-10 items-center justify-center rounded-full border border-base-300 bg-base-100 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
							>
								<MoreHorizontal size={18} />
							</div>
							<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
							<ul
								tabindex="0"
								class="dropdown-content menu z-[1] mb-2 w-52 rounded-box bg-base-100 p-2 shadow-lg"
							>
								<li>
									<button onclick={handleAddReceipt}>
										<FileText size={16} />
										Add receipt
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
				</div>
			{:else if viewMode === 'changeCategory'}
				<!-- Change Category View -->
				<div class="flex items-center justify-between border-b border-base-300 px-6 py-4">
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
