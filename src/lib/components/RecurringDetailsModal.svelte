<script lang="ts">
	import { scale } from 'svelte/transition';
	import {
		X,
		CheckCircle,
		Calendar,
		Clock,
		Tag,
		TrendingUp,
		Repeat,
		Pencil,
		Pause,
		Play,
		Trash2,
		ArrowLeft,
		Loader2
	} from 'lucide-svelte';
	import Amount from '$lib/components/Amount.svelte';
	import CategorySelector from '$lib/components/CategorySelector.svelte';
	import { recurringModalStore, type RecurringData } from '$lib/stores/recurringModalStore';
	import { invalidateAll } from '$app/navigation';
	import { formatDateShort } from '$lib/utils/locale';

	// Subscribe to store
	const state = $derived($recurringModalStore);

	// View mode
	let viewMode = $state<'details' | 'changeCategory'>('details');
	let selectedCategoryId = $state<number | null>(null);
	let isSaving = $state(false);
	let categories = $state<any[]>([]);

	// Reset view mode when modal opens
	$effect(() => {
		if (state.isOpen) {
			viewMode = 'details';
			selectedCategoryId = state.recurring?.categories?.id ?? null;
			fetchCategories();
		}
	});

	async function fetchCategories() {
		try {
			const res = await fetch('/api/categories');
			if (res.ok) {
				const data = await res.json();
				categories = data.categories || [];

				// Match current category by name to find the real ID
				const currentCategoryName = state.recurring?.categories?.name;
				if (currentCategoryName && categories.length > 0) {
					const matchedCategory = categories.find(
						(c: any) => c.name.toLowerCase() === currentCategoryName.toLowerCase()
					);
					if (matchedCategory) {
						selectedCategoryId = matchedCategory.id;
					}
				}
			}
		} catch (e) {
			console.error('Failed to fetch categories:', e);
		}
	}

	// Calculate stats
	const stats = $derived.by(() => {
		const recurring = state.recurring;
		if (!recurring) return null;

		const txs = recurring.transactions || [];
		if (txs.length === 0) {
			return {
				occurrences: 0,
				totalPaid: 0,
				averageAmount: recurring.amount,
				firstSeen: null
			};
		}

		const amounts = txs.map((t) => Math.abs(Number(t.amount)));
		const totalPaid = amounts.reduce((sum, a) => sum + a, 0);
		const averageAmount = totalPaid / amounts.length;

		const sortedByDate = [...txs].sort(
			(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
		);
		const firstSeen = sortedByDate.length > 0 ? new Date(sortedByDate[0].date) : null;

		return {
			occurrences: txs.length,
			totalPaid,
			averageAmount,
			firstSeen
		};
	});

	// Days until next payment
	const daysUntil = $derived.by(() => {
		if (!state.recurring?.next_expected_date) return null;
		const nextDate = new Date(state.recurring.next_expected_date);
		const now = new Date();
		const diffMs = nextDate.getTime() - now.getTime();
		return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
	});

	function getIntervalLabel(interval: string | null): string {
		if (!interval) return 'Unknown';
		const labels: Record<string, string> = {
			monthly: 'Monthly',
			weekly: 'Weekly',
			yearly: 'Yearly',
			quarterly: 'Quarterly',
			'4-weekly': '4-weekly'
		};
		return labels[interval] || interval;
	}

	function getDaysLabel(days: number | null): string {
		if (days === null) return '';
		if (days < 0) return `${Math.abs(days)} days overdue`;
		if (days === 0) return 'Due today';
		if (days === 1) return 'Due tomorrow';
		return `Due in ${days} days`;
	}

	function getStatusColor(status: string): string {
		switch (status) {
			case 'active':
				return 'badge-success';
			case 'paused':
				return 'badge-warning';
			case 'cancelled':
				return 'badge-error';
			default:
				return 'badge-ghost';
		}
	}

	function handleClose() {
		recurringModalStore.close();
	}

	function handleChangeCategory() {
		viewMode = 'changeCategory';
	}

	function handleBackToDetails() {
		viewMode = 'details';
	}

	async function handleSaveCategory() {
		if (!state.recurring || !selectedCategoryId) return;

		isSaving = true;
		try {
			const res = await fetch(`/api/recurring/${state.recurring.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ category_id: selectedCategoryId })
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
	function handlePause() {
		console.log('Pause: Coming soon');
	}
	function handleResume() {
		console.log('Resume: Coming soon');
	}
	function handleDelete() {
		console.log('Delete: Coming soon');
	}
</script>

{#if state.isOpen && state.recurring}
	{@const rec = state.recurring}
	{@const isIncome = rec.isIncome ?? false}
	<div class="modal-open modal" role="dialog" aria-modal="true">
		<div
			class="modal-box w-11/12 max-w-lg overflow-hidden p-0"
			in:scale={{ duration: 200, start: 0.95 }}
			out:scale={{ duration: 150, start: 0.95 }}
		>
			{#if viewMode === 'details'}
				<!-- Details View -->
				<div
					class="flex items-center justify-between border-b border-base-300 bg-base-200/50 px-6 py-4"
				>
					<h3 class="text-lg font-bold">{rec.name}</h3>
					<button class="btn btn-circle btn-ghost btn-sm" onclick={handleClose} aria-label="Close">
						<X size={20} />
					</button>
				</div>

				<div class="flex flex-col space-y-6 p-6">
					<!-- Amount + Status Row -->
					<div class="flex items-start justify-between">
						<div>
							<div class="text-3xl font-bold">
								<Amount
									value={rec.amount}
									size="large"
									isDebit={!isIncome}
									showDecimals={true}
									locale="NL"
								/>
							</div>
							<div class="mt-2 flex items-center gap-2">
								<span class="badge {getStatusColor(rec.status)}">{rec.status}</span>
								{#if daysUntil !== null}
									<span class="text-sm opacity-70">{getDaysLabel(daysUntil)}</span>
								{/if}
							</div>
						</div>
						<!-- Icon placeholder -->
						<div class="flex h-14 w-14 items-center justify-center rounded-xl bg-base-200 text-2xl">
							{#if isIncome}
								💰
							{:else}
								📅
							{/if}
						</div>
					</div>

					<!-- Stats Grid -->
					{#if stats}
						<div class="grid grid-cols-2 gap-4 rounded-lg bg-base-200/50 p-4 sm:grid-cols-4">
							<div class="flex flex-col">
								<span class="text-[10px] tracking-wide uppercase opacity-50">Frequency</span>
								<span class="font-semibold">{getIntervalLabel(rec.interval)}</span>
							</div>
							<div class="flex flex-col">
								<span class="text-[10px] tracking-wide uppercase opacity-50">Occurrences</span>
								<span class="font-semibold">{stats.occurrences}</span>
							</div>
							<div class="flex flex-col">
								<span class="text-[10px] tracking-wide uppercase opacity-50">Total this year</span>
								<span class="font-semibold">
									<Amount
										value={stats.totalPaid}
										size="small"
										showDecimals={false}
										isDebit={!isIncome}
										locale="NL"
									/>
								</span>
							</div>
							<div class="flex flex-col">
								<span class="text-[10px] tracking-wide uppercase opacity-50">Average</span>
								<span class="font-semibold">
									<Amount
										value={Math.round(stats.averageAmount)}
										size="small"
										showDecimals={false}
										isDebit={!isIncome}
										locale="NL"
									/>
								</span>
							</div>
						</div>
					{/if}

					<!-- Details Section -->
					<div class="space-y-3">
						<!-- Next payment -->
						{#if rec.next_expected_date}
							<div class="flex items-center justify-between text-sm">
								<div class="flex items-center gap-3 opacity-70">
									<Calendar size={16} />
									<span>Next payment</span>
								</div>
								<span class="font-medium">{formatDateShort(rec.next_expected_date)}</span>
							</div>
						{/if}

						<!-- Category -->
						<div class="flex items-center justify-between text-sm">
							<div class="flex items-center gap-3 opacity-70">
								<Tag size={16} />
								<span>Category</span>
							</div>
							<span class="font-medium">{rec.categories?.name ?? 'Uncategorized'}</span>
						</div>

						<!-- Type -->
						{#if rec.type}
							<div class="flex items-center justify-between text-sm">
								<div class="flex items-center gap-3 opacity-70">
									<Repeat size={16} />
									<span>Type</span>
								</div>
								<span class="font-medium capitalize">{rec.type.replace('_', ' ')}</span>
							</div>
						{/if}

						<!-- First seen -->
						{#if stats?.firstSeen}
							<div class="flex items-center justify-between text-sm">
								<div class="flex items-center gap-3 opacity-70">
									<Clock size={16} />
									<span>First seen</span>
								</div>
								<span class="font-medium">{formatDateShort(stats.firstSeen)}</span>
							</div>
						{/if}
					</div>

					<!-- Recent Transactions -->
					{#if rec.transactions && rec.transactions.length > 0}
						<div>
							<h4 class="mb-3 text-sm font-semibold opacity-70">Recent transactions</h4>
							<div class="space-y-2">
								{#each rec.transactions.slice(0, 5) as tx (tx.id)}
									<div class="flex items-center justify-between text-sm">
										<span class="opacity-70">{formatDateShort(tx.date)}</span>
										<div class="mx-3 flex-1 border-t border-dotted border-base-300"></div>
										<span class="font-medium">
											<Amount
												value={tx.amount}
												size="small"
												showDecimals={true}
												isDebit={!isIncome}
												locale="NL"
											/>
										</span>
									</div>
								{/each}
								{#if rec.transactions.length > 5}
									<p class="text-xs opacity-40">+{rec.transactions.length - 5} more</p>
								{/if}
							</div>
						</div>
					{/if}

					<!-- Actions -->
					<div>
						<h4 class="mb-3 text-base font-semibold">Actions</h4>
						<div class="flex flex-wrap gap-2">
							<button class="btn gap-2 btn-outline btn-sm" onclick={handleChangeCategory}>
								<Pencil size={14} />
								Change category
							</button>
							{#if rec.status === 'active'}
								<button class="btn gap-2 btn-outline btn-sm" onclick={handlePause} disabled>
									<Pause size={14} />
									Pause
								</button>
							{:else}
								<button class="btn gap-2 btn-outline btn-sm" onclick={handleResume} disabled>
									<Play size={14} />
									Resume
								</button>
							{/if}
							<button
								class="btn gap-2 btn-outline btn-sm btn-error"
								onclick={handleDelete}
								disabled
							>
								<Trash2 size={14} />
								Delete
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
						<button
							class="btn btn-circle btn-ghost btn-sm"
							onclick={handleBackToDetails}
							aria-label="Back"
						>
							<ArrowLeft size={20} />
						</button>
						<h3 class="text-lg font-bold">Change category</h3>
					</div>
					<button class="btn btn-circle btn-ghost btn-sm" onclick={handleClose} aria-label="Close">
						<X size={20} />
					</button>
				</div>

				<div class="flex flex-col space-y-6 p-6">
					<!-- Summary -->
					<div class="rounded-lg bg-base-200/50 p-4">
						<div class="flex items-center justify-between">
							<div>
								<div class="font-semibold">{rec.name}</div>
								<div class="text-sm opacity-70">{getIntervalLabel(rec.interval)}</div>
							</div>
							<Amount
								value={rec.amount}
								size="medium"
								isDebit={!isIncome}
								showDecimals={true}
								locale="NL"
							/>
						</div>
					</div>

					<!-- Category Selector -->
					<div>
						<label class="mb-2 block text-sm font-medium" for="category-select"
							>Select a category</label
						>
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
		<button class="modal-backdrop bg-black/50" onclick={handleClose} aria-label="Close modal"
		></button>
	</div>
{/if}
