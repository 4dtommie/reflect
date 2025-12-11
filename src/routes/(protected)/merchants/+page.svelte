<script lang="ts">
	import { Edit2, X, Plus, Trash2, Link, ChevronDown, ChevronUp } from 'lucide-svelte';
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import * as Icons from 'lucide-svelte';

	type Merchant = {
		id: number;
		name: string;
		ibans: string[];
		default_category_id: number | null;
		default_category: {
			id: number;
			name: string;
			color: string | null;
			icon: string | null;
		} | null;
		transaction_count: number;
	};

	type Category = {
		id: number;
		name: string;
		color: string | null;
		icon: string | null;
	};

	let { data }: { data: PageData } = $props();
	let merchants = $state<Merchant[]>(data?.merchants || []);
	let categories = $state<Category[]>(data?.categories || []);
	let error = $state<string | null>(null);
	let editingMerchant = $state<Merchant | null>(null);
	let editingIbans = $state<string[]>([]);
	let newIban = $state('');
	let saving = $state(false);
	let selectedCategoryId = $state<number | null>(null);

	// Merge suggestions
	type MergeSuggestion = {
		merchant1: { id: number; name: string; transactionCount: number };
		merchant2: { id: number; name: string; transactionCount: number };
		similarity: number;
		similarityPercent: number;
	};
	let mergeSuggestions = $state<MergeSuggestion[]>([]);
	let loadingSuggestions = $state(false);
	let showSuggestions = $state(false);
	let merging = $state(false);

	$effect(() => {
		if (data?.merchants) {
			merchants = data.merchants;
		}
		if (data?.categories) {
			categories = data.categories;
		}
	});

	onMount(() => {
		fetchMergeSuggestions();
	});

	async function fetchMergeSuggestions() {
		loadingSuggestions = true;
		try {
			const res = await fetch('/api/merchants/merge?threshold=0.6');
			if (res.ok) {
				const data = await res.json();
				mergeSuggestions = data.suggestions || [];
			}
		} catch (err) {
			console.error('Failed to fetch merge suggestions:', err);
		} finally {
			loadingSuggestions = false;
		}
	}

	async function executeMerge(suggestion: MergeSuggestion) {
		merging = true;
		error = null;
		try {
			// Keep the one with more transactions as target
			const target =
				suggestion.merchant1.transactionCount >= suggestion.merchant2.transactionCount
					? suggestion.merchant1
					: suggestion.merchant2;
			const source = target === suggestion.merchant1 ? suggestion.merchant2 : suggestion.merchant1;

			const res = await fetch('/api/merchants/merge', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ targetId: target.id, sourceId: source.id })
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.message || 'Merge failed');
			}

			// Refresh data
			await invalidateAll();
			await fetchMergeSuggestions();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to merge';
		} finally {
			merging = false;
		}
	}

	function dismissSuggestion(suggestion: MergeSuggestion) {
		mergeSuggestions = mergeSuggestions.filter(
			(s) =>
				!(s.merchant1.id === suggestion.merchant1.id && s.merchant2.id === suggestion.merchant2.id)
		);
	}

	function getCategoryIcon(iconName: string | null | undefined) {
		if (!iconName) return null;
		return (Icons as any)[iconName] || null;
	}

	function startEdit(merchant: Merchant) {
		editingMerchant = merchant;
		editingIbans = [...merchant.ibans];
		selectedCategoryId = merchant.default_category_id;
		newIban = '';
		error = null;
	}

	function cancelEdit() {
		editingMerchant = null;
		editingIbans = [];
		newIban = '';
		selectedCategoryId = null;
		error = null;
	}

	function addIban() {
		if (newIban.trim()) {
			const normalized = newIban.trim().replace(/\s/g, '').toUpperCase();
			if (normalized && !editingIbans.includes(normalized)) {
				editingIbans = [...editingIbans, normalized];
				newIban = '';
			}
		}
	}

	function removeIban(iban: string) {
		editingIbans = editingIbans.filter((i) => i !== iban);
	}

	async function saveMerchant() {
		if (!editingMerchant) return;

		saving = true;
		error = null;

		try {
			const response = await fetch(`/api/merchants/${editingMerchant.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					default_category_id: selectedCategoryId,
					ibans: editingIbans
				})
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || data.message || 'Failed to update merchant');
			}

			await invalidateAll();
			cancelEdit();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to update merchant';
		} finally {
			saving = false;
		}
	}

	// Format IBAN for display (add spaces every 4 characters)
	function formatIban(iban: string): string {
		return iban.replace(/(.{4})/g, '$1 ').trim();
	}
</script>

<h1 class="mb-6 text-4xl font-bold">Merchant management</h1>

{#if error}
	<div class="mb-4 alert alert-error">
		<span>{error}</span>
	</div>
{/if}

<!-- Merge Suggestions Widget -->
{#if mergeSuggestions.length > 0 || loadingSuggestions}
	<div class="collapse-arrow collapse mb-6 bg-base-200">
		<input type="checkbox" bind:checked={showSuggestions} />
		<div class="collapse-title flex items-center gap-2 text-lg font-medium">
			<Link size={20} />
			{mergeSuggestions.length} possible duplicate merchants, do you want to merge them?
		</div>
		<div class="collapse-content">
			{#if loadingSuggestions}
				<p class="text-base-content/70">Scanning for duplicates...</p>
			{:else}
				<ul class="space-y-2">
					{#each mergeSuggestions as suggestion}
						<li class="flex items-center justify-between gap-4 rounded-lg bg-base-100 p-3">
							<div class="flex-1">
								<span class="font-medium">"{suggestion.merchant1.name}"</span>
								<span class="text-base-content/50"> ↔ </span>
								<span class="font-medium">"{suggestion.merchant2.name}"</span>
								<span class="ml-2 badge badge-sm">{suggestion.similarityPercent}% similar</span>
							</div>
							<div class="flex gap-2">
								<button
									class="btn btn-sm btn-primary"
									onclick={() => executeMerge(suggestion)}
									disabled={merging}
								>
									{#if merging}
										<span class="loading loading-xs loading-spinner"></span>
									{:else}
										Merge
									{/if}
								</button>
								<button class="btn btn-ghost btn-sm" onclick={() => dismissSuggestion(suggestion)}>
									<X size={16} />
								</button>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>
{/if}

<div class="overflow-x-auto">
	<table class="table table-zebra">
		<thead>
			<tr>
				<th>Name</th>
				<th>Default category</th>
				<th>IBANs</th>
				<th>Transactions</th>
				<th>Actions</th>
			</tr>
		</thead>
		<tbody>
			{#each merchants as merchant}
				<tr>
					<td class="font-medium">{merchant.name}</td>
					<td>
						{#if merchant.default_category}
							{@const CategoryIcon = getCategoryIcon(merchant.default_category.icon)}
							<div class="flex items-center gap-2">
								{#if CategoryIcon}
									<CategoryIcon
										size={16}
										style="color: {merchant.default_category.color || '#94a3b8'};"
									/>
								{/if}
								<span>{merchant.default_category.name}</span>
							</div>
						{:else}
							<span class="text-base-content/50">None</span>
						{/if}
					</td>
					<td>
						{#if merchant.ibans.length > 0}
							<div class="flex flex-wrap gap-1">
								{#each merchant.ibans as iban}
									<span class="badge badge-outline text-xs">
										{formatIban(iban)}
									</span>
								{/each}
							</div>
						{:else}
							<span class="text-base-content/50">None</span>
						{/if}
					</td>
					<td>{merchant.transaction_count}</td>
					<td>
						<button class="btn btn-ghost btn-sm" onclick={() => startEdit(merchant)}>
							<Edit2 size={16} />
						</button>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

{#if merchants.length === 0}
	<p class="mt-4 text-base-content/70">No merchants found.</p>
{/if}

<!-- Edit Modal -->
{#if editingMerchant}
	<div class="modal-open modal">
		<div class="modal-box">
			<h3 class="mb-4 text-2xl font-bold">Edit merchant: {editingMerchant.name}</h3>

			<div class="form-control mb-4">
				<label class="label">
					<span class="label-text">Default category</span>
				</label>
				<select class="select-bordered select w-full" bind:value={selectedCategoryId}>
					<option value={null}>None</option>
					{#each categories as category}
						<option value={category.id}>{category.name}</option>
					{/each}
				</select>
			</div>

			<div class="form-control mb-4">
				<label class="label">
					<span class="label-text">IBANs</span>
				</label>
				<div class="mb-2 flex gap-2">
					<input
						type="text"
						class="input-bordered input flex-1"
						placeholder="NL91ABNA0417164300"
						bind:value={newIban}
						onkeydown={(e) => {
							if (e.key === 'Enter') {
								e.preventDefault();
								addIban();
							}
						}}
					/>
					<button class="btn btn-primary" onclick={addIban}>
						<Plus size={16} />
					</button>
				</div>
				{#if editingIbans.length > 0}
					<div class="flex flex-wrap gap-2">
						{#each editingIbans as iban}
							<div class="badge gap-2 badge-outline">
								{formatIban(iban)}
								<button
									class="btn h-auto min-h-0 p-0 btn-ghost btn-xs"
									onclick={() => removeIban(iban)}
								>
									<X size={12} />
								</button>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-sm text-base-content/50">No IBANs added</p>
				{/if}
			</div>

			<div class="modal-action">
				<button class="btn btn-ghost" onclick={cancelEdit} disabled={saving}> Cancel </button>
				<button class="btn btn-primary" onclick={saveMerchant} disabled={saving}>
					{#if saving}
						<span class="loading loading-sm loading-spinner"></span>
						Saving...
					{:else}
						Save
					{/if}
				</button>
			</div>
		</div>
		<div
			class="modal-backdrop"
			role="button"
			tabindex="0"
			onclick={() => {
				if (!saving) {
					cancelEdit();
				}
			}}
			onkeydown={(e) => {
				if ((e.key === 'Enter' || e.key === ' ') && !saving) {
					cancelEdit();
				}
			}}
		></div>
	</div>
{/if}
