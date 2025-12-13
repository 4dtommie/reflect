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
		Loader2,
		Store,
		Ban,
		History,
		CalendarClock
	} from 'lucide-svelte';
	import * as Icons from 'lucide-svelte';
	import Amount from '$lib/components/Amount.svelte';
	import MerchantLogo from '$lib/components/MerchantLogo.svelte';
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

		// 1. Calculate All-time stats (for average)
		const allAmounts = txs.map((t) => Math.abs(Number(t.amount)));
		// const totalPaidAllTime = allAmounts.reduce((sum, a) => sum + a, 0);

		let averageAmount = recurring.amount;
		if (allAmounts.length > 0) {
			const totalPaidAllTime = allAmounts.reduce((sum, a) => sum + a, 0);
			averageAmount = totalPaidAllTime / allAmounts.length;
		}

		// For income, show monthly equivalent for yearly/quarterly
		if (recurring.isIncome || Number(recurring.amount) > 0) {
			if (recurring.interval === 'yearly') {
				averageAmount = averageAmount / 12;
			} else if (recurring.interval === 'quarterly') {
				averageAmount = averageAmount / 3;
			}
		}

		// 2. Calculate "This Year" stats
		const currentYear = new Date().getFullYear();
		const thisYearAmounts = txs
			.filter((t) => new Date(t.date).getFullYear() === currentYear)
			.map((t) => Math.abs(Number(t.amount)));
		const totalPaidThisYear = thisYearAmounts.reduce((sum, a) => sum + a, 0);

		const sortedByDate = [...txs].sort(
			(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
		);
		const firstSeen = sortedByDate.length > 0 ? new Date(sortedByDate[0].date) : null;

		return {
			occurrences: txs.length,
			totalPaidThisYear,
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

	// Helper to get icon component from string name
	function getCategoryIcon(iconName: string | null | undefined) {
		if (!iconName) return null;
		// @ts-ignore
		return Icons[iconName] || null;
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
	function handleStop() {
		console.log('Stop: Coming soon');
	}
</script>

{#if state.isOpen && state.recurring}
	{@const rec = state.recurring}
	{@const isIncome = rec.isIncome ?? false}
	{@const CategoryIcon = getCategoryIcon(rec.categories?.icon)}
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
					<!-- 1. Header: Logo + Name -->
					<div class="mb-4 flex flex-col items-center gap-3">
						<MerchantLogo
							merchantName={rec.name}
							categoryIcon={rec.categories?.icon}
							categoryColor={rec.categories?.color}
							size="lg"
						/>
						<div class="flex flex-col items-center gap-1">
							<h3 class="text-lg font-bold">{rec.name}</h3>
							{#if rec.categories?.name}
								<span class="text-sm text-base-content/60">{rec.categories.name}</span>
							{/if}
						</div>
					</div>

					<!-- 2. Centered Amount -->
					<div class="mb-2 text-4xl font-extrabold tracking-tight">
						<Amount
							value={rec.amount}
							size="custom"
							isDebit={!isIncome}
							showDecimals={true}
							locale="NL"
						/>
					</div>

					<!-- Status Badge -->
					<div class="mb-6">
						<div class="badge {getStatusColor(rec.status)} gap-2 px-4 py-3 font-medium">
							{rec.status}
							{#if daysUntil !== null}
								<span class="border-l border-base-content/20 pl-2 opacity-70"
									>{getDaysLabel(daysUntil)}</span
								>
							{/if}
						</div>
					</div>

					<!-- 3. Stats Grid -->
					{#if stats}
						<div class="mb-6 grid w-full grid-cols-4 gap-2 text-center">
							<div class="flex flex-col items-center rounded-lg bg-base-200/50 p-2">
								<span class="mb-1 text-[10px] uppercase opacity-50">Freq</span>
								<span class="text-xs font-semibold">{getIntervalLabel(rec.interval)}</span>
							</div>
							<div class="flex flex-col items-center rounded-lg bg-base-200/50 p-2">
								<span class="mb-1 text-[10px] uppercase opacity-50">Count</span>
								<span class="text-xs font-semibold">{stats.occurrences}</span>
							</div>
							<div class="flex flex-col items-center rounded-lg bg-base-200/50 p-2">
								<span class="mb-1 text-[10px] uppercase opacity-50">Total '25</span>
								<span class="text-xs font-semibold">
									<Amount
										value={stats.totalPaidThisYear}
										size="custom"
										showDecimals={false}
										isDebit={!isIncome}
										locale="NL"
									/>
								</span>
							</div>
							<div class="flex flex-col items-center rounded-lg bg-base-200/50 p-2">
								<span class="mb-1 text-[10px] uppercase opacity-50">Avg</span>
								<span class="text-xs font-semibold">
									<Amount
										value={Math.round(stats.averageAmount)}
										size="custom"
										showDecimals={false}
										isDebit={!isIncome}
										locale="NL"
									/>
								</span>
							</div>
						</div>
					{/if}

					<!-- 4. Payment History -->
					<div class="mb-6 w-full">
						<h4 class="mb-3 text-left text-xs font-semibold tracking-wide uppercase opacity-50">
							Payment history
						</h4>
						<div class="space-y-3">
							<!-- Upcoming payment -->
							{#if rec.next_expected_date}
								<div class="flex items-center justify-between text-sm">
									<div class="flex items-center gap-3">
										<div
											class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10"
										>
											<Calendar size={14} class="text-primary" />
										</div>
										<span class="font-medium text-primary"
											>{formatDateShort(rec.next_expected_date)} (upcoming)</span
										>
									</div>
									<span class="font-semibold text-primary">
										<Amount
											value={rec.amount}
											size="small"
											showDecimals={true}
											isDebit={!isIncome}
											locale="NL"
										/>
									</span>
								</div>
							{/if}

							<!-- Past payments -->
							{#if rec.transactions && rec.transactions.length > 0}
								{#each rec.transactions.slice(0, 3) as tx (tx.id)}
									<div class="flex items-center justify-between text-sm">
										<div class="flex items-center gap-3">
											<div
												class="flex h-8 w-8 items-center justify-center rounded-full bg-base-200 text-base-content/50"
											>
												<CalendarClock size={14} />
											</div>
											<span class="font-medium text-base-content/70"
												>{formatDateShort(tx.date)}</span
											>
										</div>
										<span class="font-semibold">
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
							{:else if !rec.next_expected_date}
								<p class="py-2 text-center text-sm text-base-content/50">
									No linked payments found
								</p>
							{/if}
						</div>
					</div>

					<!-- 5. Actions Row -->
					<div class="mt-2 flex w-full flex-wrap items-center justify-center gap-4">
						<!-- Recategorize -->
						<button
							class="flex h-10 items-center gap-2 rounded-full border border-base-300 bg-base-100 px-4 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
							onclick={handleChangeCategory}
						>
							<Tag size={16} />
							<span class="text-xs font-medium">Recategorize</span>
						</button>

						<!-- Pause (if active) / Resume (if paused) -->
						{#if rec.status === 'active'}
							<button
								class="flex h-10 items-center gap-2 rounded-full border border-base-300 bg-base-100 px-4 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
								onclick={handlePause}
							>
								<Pause size={16} />
								<span class="text-xs font-medium">Pause</span>
							</button>
						{:else}
							<button
								class="flex h-10 items-center gap-2 rounded-full border border-base-300 bg-base-100 px-4 text-success shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
								onclick={handleResume}
							>
								<Play size={16} />
								<span class="text-xs font-medium">Resume</span>
							</button>
						{/if}

						<!-- Stop Subscription -->
						<button
							class="flex h-10 items-center gap-2 rounded-full border border-base-300 bg-base-100 px-4 text-error shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
							onclick={handleStop}
						>
							<Ban size={16} />
							<span class="text-xs font-medium">Stop</span>
						</button>
					</div>
				</div>
			{:else if viewMode === 'changeCategory'}
				<!-- Change Category View (Identical wrapper structure) -->
				<div class="flex items-center justify-between border-b border-base-300 px-6 py-4">
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
