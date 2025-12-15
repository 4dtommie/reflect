<script lang="ts">
	import { scale } from 'svelte/transition';
	import {
		X,
		CheckCircle,
		Search,
		Loader2,
		ReceiptEuro,
		CalendarDays,
		RefreshCw,
		ArrowRight,
		Merge
	} from 'lucide-svelte';
	import Amount from '$lib/components/Amount.svelte';
	import MerchantLogo from '$lib/components/MerchantLogo.svelte';
	import { formatDateShort } from '$lib/utils/locale';
	import { createSubscriptionModalStore } from '$lib/stores/createSubscriptionModalStore';
	import { invalidateAll } from '$app/navigation';

	const modalState = $derived($createSubscriptionModalStore);
	let step = $state(1); // 1: Details, 2: Related Transactions
	let isLoadingRelated = $state(false);
	let isSaving = $state(false);

	// Form Data
	let subscriptionName = $state('');
	let amount = $state(0);
	let interval = $state('monthly');
	let relatedTransactions = $state<any[]>([]);
	let selectedTransactionIds = $state<Set<number>>(new Set());
	let detectedInterval = $state<{ interval: string; avgDays: number; confidence: string } | null>(
		null
	);

	// Interval detection based on transaction dates
	function detectInterval(
		transactions: any[]
	): { interval: string; avgDays: number; confidence: string } | null {
		if (transactions.length < 2) return null;

		// Sort by date (oldest first)
		const sorted = [...transactions].sort(
			(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
		);

		// Calculate intervals between consecutive transactions
		const intervals: number[] = [];
		for (let i = 1; i < sorted.length; i++) {
			const prev = new Date(sorted[i - 1].date);
			const curr = new Date(sorted[i].date);
			const daysDiff = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
			if (daysDiff > 0) intervals.push(daysDiff);
		}

		if (intervals.length === 0) return null;

		// Calculate average and standard deviation
		const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
		const variance =
			intervals.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / intervals.length;
		const stdDev = Math.sqrt(variance);

		// Define interval thresholds with tolerance
		const intervalMappings = [
			{ name: 'weekly', days: 7, tolerance: 2 },
			{ name: '4-weekly', days: 28, tolerance: 5 },
			{ name: 'monthly', days: 30, tolerance: 7 },
			{ name: 'quarterly', days: 90, tolerance: 15 },
			{ name: 'yearly', days: 365, tolerance: 30 }
		];

		// Find the best matching interval
		let bestMatch = intervalMappings[2]; // default to monthly
		let bestDiff = Infinity;

		for (const mapping of intervalMappings) {
			const diff = Math.abs(avg - mapping.days);
			if (diff < bestDiff && diff <= mapping.tolerance * 2) {
				bestDiff = diff;
				bestMatch = mapping;
			}
		}

		// Determine confidence based on standard deviation relative to average
		const coefficientOfVariation = stdDev / avg;
		let confidence: string;
		if (coefficientOfVariation < 0.15) {
			confidence = 'high';
		} else if (coefficientOfVariation < 0.3) {
			confidence = 'medium';
		} else {
			confidence = 'low';
		}

		return {
			interval: bestMatch.name,
			avgDays: Math.round(avg),
			confidence
		};
	}

	$effect(() => {
		if (modalState.isOpen && modalState.transaction) {
			step = 1;
			subscriptionName =
				modalState.transaction.cleaned_merchant_name ||
				modalState.transaction.merchantName ||
				'Subscription';
			amount = Number(modalState.transaction.amount);
			selectedTransactionIds = new Set([modalState.transaction.id]);
			fetchRelatedTransactions();
		}
	});

	async function fetchRelatedTransactions() {
		if (!modalState.transaction?.merchantName) return;

		isLoadingRelated = true;
		detectedInterval = null;
		try {
			// Search for transactions with similar merchant name
			// This endpoint needs to exist or we use the general search
			const query = encodeURIComponent(
				modalState.transaction.cleaned_merchant_name || modalState.transaction.merchantName
			);
			// We'll use the existing transactions API with search (but might need a better one for exact merchant matches or partials)
			// For now, let's assume we can filter by merchant_id if it exists, or description search
			let url = `/api/transactions?pageSize=50`; // Get distinct list
			if (modalState.transaction.merchant?.id) {
				// If we have an ID, great, but let's assume we want to find OTHERS too that might not be linked yet
				// But the user request implies finding related.
				// Let's rely on simple search if no dedicated endpoint
			}

			// Actually, we can just fetch recent transactions and filter client side for now to prototype,
			// OR safer: use the existing search functionality of the transactions page?
			// Let's try searching by the merchant name string
			url += `&search=${query}`;

			const res = await fetch(url);
			if (res.ok) {
				const data = await res.json();
				// Filter out the current transaction to avoid duplicates if API returns it
				// And filter for Debits only usually?
				relatedTransactions = data.transactions.filter(
					(t: any) =>
						t.id !== modalState.transaction!.id && t.is_debit === modalState.transaction!.is_debit
				);

				// Analyze interval from ALL related transactions (including current one)
				const allTransactions = [modalState.transaction, ...relatedTransactions];
				const detected = detectInterval(allTransactions);
				if (detected) {
					detectedInterval = detected;
					interval = detected.interval; // Auto-set the interval
				}
			}
		} catch (e) {
			console.error('Failed to fetch related transactions:', e);
		} finally {
			isLoadingRelated = false;
		}
	}

	function toggleTransaction(id: number) {
		const newSet = new Set(selectedTransactionIds);
		if (newSet.has(id)) {
			newSet.delete(id);
		} else {
			newSet.add(id);
		}
		selectedTransactionIds = newSet;
	}

	function toggleAll() {
		if (selectedTransactionIds.size === relatedTransactions.length + 1) {
			// Unselect all except current
			selectedTransactionIds = new Set([modalState.transaction!.id]);
		} else {
			// Select all
			const newSet = new Set([modalState.transaction!.id]);
			relatedTransactions.forEach((t) => newSet.add(t.id));
			selectedTransactionIds = newSet;
		}
	}

	const groupedTransactions = $derived.by(() => {
		const groups = new Map<string, any[]>();
		relatedTransactions.forEach((tx) => {
			const amount = Number(tx.amount).toFixed(2);
			const name = tx.cleaned_merchant_name || tx.merchantName || 'Unknown';
			const key = `${amount}|${name}`;

			if (!groups.has(key)) groups.set(key, []);
			groups.get(key)!.push(tx);
		});

		return Array.from(groups.values())
			.map((txs) => ({
				amount: Number(txs[0].amount).toFixed(2),
				name: txs[0].cleaned_merchant_name || txs[0].merchantName,
				txs
			}))
			.sort((a, b) => b.txs.length - a.txs.length);
	});

	function toggleGroup(txs: any[]) {
		const allSelected = txs.every((t) => selectedTransactionIds.has(t.id));
		const newSet = new Set(selectedTransactionIds);
		txs.forEach((t) => {
			if (allSelected) newSet.delete(t.id);
			else newSet.add(t.id);
		});
		selectedTransactionIds = newSet;
	}

	async function handleCreate() {
		if (!modalState.transaction) return;

		isSaving = true;
		try {
			const selectedIds = Array.from(selectedTransactionIds);

			const res = await fetch('/api/recurring/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					transactionId: modalState.transaction.id,
					name: subscriptionName,
					amount: amount,
					interval: interval,
					linkedTransactionIds: selectedIds,
					mergeMerchant: true // Always merge for now if selected
				})
			});

			if (res.ok) {
				await invalidateAll();
				createSubscriptionModalStore.close();
			} else {
				// error handling
			}
		} catch (e) {
			console.error('Failed to create subscription:', e);
		} finally {
			isSaving = false;
		}
	}

	function handleClose() {
		createSubscriptionModalStore.close();
	}
</script>

{#if modalState.isOpen && modalState.transaction}
	<div class="modal-open modal" role="dialog" aria-modal="true">
		<div
			class="modal-box w-11/12 max-w-lg overflow-hidden rounded-[2rem] p-0 transition-all"
			in:scale={{ duration: 200, start: 0.95 }}
			out:scale={{ duration: 150, start: 0.95 }}
		>
			<!-- Header -->
			<div class="relative bg-base-100 p-6 pb-0">
				<button
					class="btn absolute top-4 right-4 z-10 btn-circle btn-ghost btn-sm"
					onclick={handleClose}
				>
					<X size={20} />
				</button>
				<h3 class="text-xl font-bold">Track Subscription</h3>
				<p class="text-sm opacity-60">Set up recursion for this payment.</p>
			</div>

			<div class="p-6 pt-4">
				<!-- Step 1: Configuration -->
				<div class="mb-6 space-y-4">
					<!-- Name Input -->
					<div class="form-control">
						<label class="label">
							<span class="label-text font-medium">Name</span>
						</label>
						<input
							type="text"
							bind:value={subscriptionName}
							class="input-bordered input w-full rounded-xl"
							placeholder="Netflix, Spotify, etc."
						/>
					</div>

					<!-- Amount & Interval Row -->
					<div class="flex gap-4">
						<div class="form-control flex-1">
							<label class="label">
								<span class="label-text font-medium">Amount</span>
							</label>
							<label class="input-bordered input flex items-center gap-2 rounded-xl">
								€
								<input type="number" bind:value={amount} step="0.01" class="grow" />
							</label>
						</div>
						<div class="form-control flex-1">
							<label class="label">
								<span class="label-text font-medium">Interval</span>
							</label>
							<select bind:value={interval} class="select-bordered select w-full rounded-xl">
								<option value="weekly">Weekly</option>
								<option value="4-weekly">Every 4 weeks</option>
								<option value="monthly">Monthly</option>
								<option value="quarterly">Quarterly</option>
								<option value="yearly">Yearly</option>
							</select>
						</div>
					</div>

					{#if detectedInterval}
						<div class="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs">
							<span class="text-primary">✨</span>
							<span class="opacity-80">
								Detected
								<strong class="text-primary">{detectedInterval.interval}</strong>
								based on ~{detectedInterval.avgDays} days between payments
								<span class="opacity-50">({detectedInterval.confidence} confidence)</span>
							</span>
						</div>
					{/if}
				</div>

				<!-- Step 2: Related Transactions -->
				<div class="rounded-2xl bg-base-200/50 p-4">
					<div class="mb-3 flex items-center justify-between">
						<h4
							class="flex items-center gap-2 text-sm font-bold tracking-wide uppercase opacity-70"
						>
							<ReceiptEuro size={14} />
							Link History
						</h4>
						{#if relatedTransactions.length > 0}
							<button class="btn text-primary btn-ghost btn-xs" onclick={toggleAll}>
								{selectedTransactionIds.size === relatedTransactions.length + 1
									? 'Deselect all'
									: 'Select all'}
							</button>
						{/if}
					</div>

					{#if isLoadingRelated}
						<div class="flex justify-center py-4">
							<Loader2 class="animate-spin opacity-50" />
						</div>
					{:else if relatedTransactions.length === 0}
						<p class="py-2 text-center text-sm opacity-50">No other related transactions found.</p>
					{:else}
						<div class="max-h-48 space-y-2 overflow-y-auto pr-1">
							<!-- Show Current Transaction (Fixed) -->
							<div class="flex items-center justify-between rounded-lg bg-base-100 p-2 opacity-50">
								<div class="flex items-center gap-3">
									<CheckCircle size={16} class="text-primary" />
									<div class="flex flex-col">
										<span class="text-sm font-medium">{modalState.transaction.merchantName}</span>
										<span class="text-xs opacity-60"
											>{formatDateShort(modalState.transaction.date)}</span
										>
									</div>
								</div>
								<span class="text-sm font-bold"
									>€{Number(modalState.transaction.amount).toFixed(2)}</span
								>
							</div>

							<!-- List Related -->
							<!-- List Related Groups -->
							{#each groupedTransactions as group}
								<button
									class="flex w-full items-center justify-between rounded-lg border p-3 text-left transition-all hover:bg-base-100 {group.txs.every(
										(t) => selectedTransactionIds.has(t.id)
									)
										? 'border-primary bg-primary/5'
										: 'border-transparent'}"
									onclick={() => toggleGroup(group.txs)}
								>
									<div class="flex items-center gap-3">
										<div
											class={`flex h-4 w-4 items-center justify-center rounded-full border ${group.txs.every((t) => selectedTransactionIds.has(t.id)) ? 'border-primary bg-primary text-white' : 'border-base-300'}`}
										>
											{#if group.txs.every((t) => selectedTransactionIds.has(t.id))}
												<CheckCircle size={10} />
											{/if}
										</div>
										<div class="flex flex-col">
											<span class="line-clamp-1 text-sm font-medium"
												>{group.name}
												<span class="ml-1 text-xs opacity-50">x{group.txs.length}</span></span
											>
											<!-- Maybe show date range? -->
										</div>
									</div>
									<span class="text-sm font-bold">€{group.amount}</span>
								</button>
							{/each}
						</div>
						<div class="mt-2 flex items-center gap-2 px-1">
							<Merge size={12} class="opacity-50" />
							<span class="text-xs opacity-50"
								>Selected transactions will be renamed to "{subscriptionName}"</span
							>
						</div>
					{/if}
				</div>

				<!-- Actions -->
				<div class="mt-6 flex justify-end gap-3">
					<button class="btn rounded-full btn-ghost" onclick={handleClose}>Cancel</button>
					<button
						class="btn rounded-full px-8 btn-primary"
						onclick={handleCreate}
						disabled={isSaving}
					>
						{#if isSaving}
							<Loader2 size={16} class="animate-spin" />
						{:else}
							<CheckCircle size={18} />
						{/if}
						Create Subscription
					</button>
				</div>
			</div>
		</div>
		<button class="modal-backdrop bg-black/50" onclick={handleClose}></button>
	</div>
{/if}
