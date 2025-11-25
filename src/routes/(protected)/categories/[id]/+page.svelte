<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { ArrowLeft, Edit, Save, Trash2, X } from 'lucide-svelte';
	import * as Icons from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const categoryId = $derived(data?.categoryId);

	type Category = {
		id: number;
		name: string;
		description: string | null;
		color: string | null;
		icon: string | null;
		keywords: string[];
		parent_id: number | null;
		group: string | null;
		is_default: boolean;
		created_by: number | null;
	};

	let category = $state<Category | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let editing = $state(false);
	let submitting = $state(false);

	// Form state
	let name = $state('');
	let description = $state('');
	let color = $state('#3b82f6');
	let icon = $state<string | null>(null);
	let keywords = $state<string[]>([]);
	let keywordInput = $state('');
	let parentId = $state<number | null>(null);
	let group = $state<string>('other');

	let availableCategories: Category[] = $state([]);
	let showIconPicker = $state(false);
	let showColorPicker = $state(false);
	let transactionCount = $state(0);

	const colorPresets = [
		'#ef4444', '#f59e0b', '#eab308', '#22c55e', '#10b981', '#14b8a6',
		'#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
		'#ec4899', '#f43f5e', '#64748b', '#84cc16', '#f97316', '#f472b6'
	];

	const commonIcons = [
		'ShoppingCart', 'Home', 'Car', 'Heart', 'Briefcase', 'Plane', 'Utensils',
		'Film', 'Music', 'Book', 'GraduationCap', 'Code', 'Shield', 'CreditCard',
		'PiggyBank', 'Baby', 'Coffee', 'Wine', 'ShoppingBag', 'Shirt', 'Smartphone'
	];

	const groupOptions = [
		{ value: 'income', label: 'Income' },
		{ value: 'essential', label: 'Essential Expenses' },
		{ value: 'lifestyle', label: 'Lifestyle Expenses' },
		{ value: 'financial', label: 'Financial Management' },
		{ value: 'other', label: 'Other' }
	];

	const groupLabels: Record<string, string> = {
		income: 'Income',
		essential: 'Essential Expenses',
		lifestyle: 'Lifestyle Expenses',
		financial: 'Financial Management',
		other: 'Other'
	};

	onMount(async () => {
		if (categoryId && !isNaN(categoryId)) {
			await Promise.all([loadCategory(categoryId), loadCategories(), loadTransactionCount(categoryId)]);
		}
	});

	async function loadCategory(categoryId: number) {
		loading = true;
		error = null;
		try {
			// Fetch from individual category API
			const response = await fetch(`/api/categories/${categoryId}`);
			if (!response.ok) {
				throw new Error('Failed to fetch category');
			}
			const data = await response.json();
			const found = data.category;

			if (!found) {
				throw new Error('Category not found');
			}

			category = found;
			// Initialize form state
			name = category.name;
			description = category.description || '';
			color = category.color || '#3b82f6';
			icon = category.icon;
			keywords = [...(category.keywords || [])];
			parentId = category.parent_id;
			group = category.group || 'other';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load category';
		} finally {
			loading = false;
		}
	}

	async function loadCategories() {
		try {
			const response = await fetch('/api/categories');
			if (response.ok) {
				const data = await response.json();
				availableCategories = data.categories || [];
			}
		} catch (err) {
			console.error('Failed to load categories:', err);
		}
	}

	async function loadTransactionCount(categoryId: number) {
		try {
			// We'll need to add this to the transactions API or calculate it
			// For now, we'll skip this
			transactionCount = 0;
		} catch (err) {
			console.error('Failed to load transaction count:', err);
		}
	}

	function startEditing() {
		editing = true;
	}

	function cancelEditing() {
		if (category) {
			name = category.name;
			description = category.description || '';
			color = category.color || '#3b82f6';
			icon = category.icon;
			keywords = [...(category.keywords || [])];
			parentId = category.parent_id;
			group = category.group || 'other';
		}
		editing = false;
	}

	async function saveCategory() {
		if (!category) return;

		submitting = true;
		error = null;

		try {
			const response = await fetch(`/api/categories/${category.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name,
					description: description || null,
					color: color || null,
					icon: icon || null,
					keywords,
					parentId: parentId || null,
					group
				})
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || 'Failed to update category');
			}

			category = data.category;
			editing = false;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to update category';
		} finally {
			submitting = false;
		}
	}

	async function deleteCategory() {
		if (!category) return;

		if (!confirm(`Are you sure you want to delete "${category.name}"?`)) {
			return;
		}

		try {
			const response = await fetch(`/api/categories/${category.id}`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					reassignToCategoryId: null
				})
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.message || 'Failed to delete category');
			}

			goto('/categories');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to delete category';
		}
	}

	function addKeyword() {
		const trimmed = keywordInput.trim();
		if (trimmed && !keywords.includes(trimmed)) {
			keywords = [...keywords, trimmed];
			keywordInput = '';
		}
	}

	function removeKeyword(index: number) {
		keywords = keywords.filter((_, i) => i !== index);
	}

	function handleKeywordKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			addKeyword();
		}
	}

	function getIconComponent(iconName: string | null) {
		if (!iconName) return null;
		return (Icons as any)[iconName] || null;
	}

	const canEdit = $derived(category && !category.is_default && category.created_by !== null);
	const canDelete = $derived(canEdit && transactionCount === 0);
</script>

<div class="container mx-auto px-4 py-8 max-w-4xl">
	<div class="flex items-center gap-4 mb-6">
		<button class="btn btn-ghost btn-sm" onclick={() => goto('/categories')}>
			<ArrowLeft size={20} />
		</button>
		<h1 class="text-4xl font-bold">
			{#if editing}
				Edit category
			{:else}
				Category details
			{/if}
		</h1>
	</div>

	{#if error}
		<div class="alert alert-error mb-4">
			<span>{error}</span>
		</div>
	{/if}

	{#if loading}
		<div class="flex justify-center items-center py-12">
			<span class="loading loading-spinner loading-lg"></span>
		</div>
	{:else if category}
		<div class="card bg-base-200">
			<div class="card-body">
				{#if !editing}
					<!-- View Mode -->
					<div class="flex items-start gap-6 mb-6">
						{#if category.color}
							{@const IconComponent = getIconComponent(category.icon)}
							<div
								class="w-20 h-20 rounded-lg flex items-center justify-center flex-shrink-0"
								style="background-color: {category.color}20; color: {category.color}"
							>
								{#if IconComponent}
									<svelte:component this={IconComponent} size={40} />
								{/if}
							</div>
						{/if}
						<div class="flex-1">
							<h2 class="text-3xl font-bold mb-2">{category.name}</h2>
							{#if category.description}
								<p class="text-base-content/70 mb-4">{category.description}</p>
							{/if}
							<div class="flex flex-wrap gap-4 text-sm">
								<div>
									<span class="text-base-content/50">Group:</span>
									<span class="ml-2 font-semibold">
										{groupLabels[category.group || 'other']}
									</span>
								</div>
								<div>
									<span class="text-base-content/50">Type:</span>
									<span class="ml-2 font-semibold">
										{category.is_default ? 'System category' : 'Custom category'}
									</span>
								</div>
								{#if transactionCount > 0}
									<div>
										<span class="text-base-content/50">Transactions:</span>
										<span class="ml-2 font-semibold">{transactionCount}</span>
									</div>
								{/if}
							</div>
						</div>
						<div class="flex gap-2">
							{#if canEdit}
								<button class="btn btn-primary" onclick={startEditing}>
									<Edit size={20} />
									Edit
								</button>
							{/if}
							{#if canDelete}
								<button class="btn btn-error" onclick={deleteCategory}>
									<Trash2 size={20} />
									Delete
								</button>
							{/if}
						</div>
					</div>

					<!-- Keywords -->
					{#if category.keywords && category.keywords.length > 0}
						<div class="mb-6">
							<h3 class="text-lg font-semibold mb-2">Keywords</h3>
							<div class="flex flex-wrap gap-2">
								{#each category.keywords as keyword}
									<div class="badge badge-primary">{keyword}</div>
								{/each}
							</div>
						</div>
					{/if}
				{:else}
					<!-- Edit Mode -->
					<form onsubmit={(e) => { e.preventDefault(); saveCategory(); }} class="space-y-6">
						<!-- Name -->
						<div class="form-control">
							<label class="label">
								<span class="label-text font-semibold">Name *</span>
							</label>
							<input
								type="text"
								class="input input-bordered"
								bind:value={name}
								required
								maxlength="100"
							/>
						</div>

						<!-- Description -->
						<div class="form-control">
							<label class="label">
								<span class="label-text font-semibold">Description</span>
							</label>
							<textarea
								class="textarea textarea-bordered"
								bind:value={description}
								maxlength="500"
								rows="3"
							></textarea>
						</div>

						<!-- Color -->
						<div class="form-control">
							<label class="label">
								<span class="label-text font-semibold">Color</span>
							</label>
							<div class="flex gap-2 items-center">
								<div
									class="w-12 h-12 rounded-lg border-2 border-base-300"
									style="background-color: {color}"
								></div>
								<input
									type="text"
									class="input input-bordered flex-1"
									bind:value={color}
									pattern="^#[0-9A-Fa-f]{6}$"
								/>
								<button
									type="button"
									class="btn btn-outline"
									onclick={() => (showColorPicker = !showColorPicker)}
								>
									Pick Color
								</button>
							</div>
							{#if showColorPicker}
								<div class="mt-2 flex flex-wrap gap-2">
									{#each colorPresets as preset}
										<button
											type="button"
											class="w-8 h-8 rounded border-2 {color === preset ? 'border-primary' : 'border-base-300'}"
											style="background-color: {preset}"
											onclick={() => {
												color = preset;
												showColorPicker = false;
											}}
										></button>
									{/each}
								</div>
							{/if}
						</div>

						<!-- Icon -->
						<div class="form-control">
							<label class="label">
								<span class="label-text font-semibold">Icon</span>
							</label>
							<div class="flex gap-2 items-center">
								{#if icon}
									{@const IconComponent = getIconComponent(icon)}
									{#if IconComponent}
										<div class="w-12 h-12 rounded-lg border-2 border-base-300 flex items-center justify-center">
											<svelte:component this={IconComponent} size={24} />
										</div>
									{/if}
								{:else}
									<div class="w-12 h-12 rounded-lg border-2 border-base-300 flex items-center justify-center text-base-content/30">
										No icon
									</div>
								{/if}
								<input
									type="text"
									class="input input-bordered flex-1"
									bind:value={icon}
									placeholder="Icon name"
								/>
								<button
									type="button"
									class="btn btn-outline"
									onclick={() => (showIconPicker = !showIconPicker)}
								>
									Pick Icon
								</button>
								{#if icon}
									<button
										type="button"
										class="btn btn-ghost btn-sm"
										onclick={() => (icon = null)}
									>
										<X size={16} />
									</button>
								{/if}
							</div>
							{#if showIconPicker}
								<div class="mt-2 grid grid-cols-6 gap-2 max-h-48 overflow-y-auto p-2 border border-base-300 rounded">
									{#each commonIcons as iconName}
										{@const IconComponent = getIconComponent(iconName)}
										<button
											type="button"
											class="btn btn-sm btn-ghost {icon === iconName ? 'btn-active' : ''}"
											onclick={() => {
												icon = iconName;
												showIconPicker = false;
											}}
											title={iconName}
										>
											{#if IconComponent}
												<svelte:component this={IconComponent} size={20} />
											{/if}
										</button>
									{/each}
								</div>
							{/if}
						</div>

						<!-- Group -->
						<div class="form-control">
							<label class="label">
								<span class="label-text font-semibold">Group</span>
							</label>
							<select class="select select-bordered" bind:value={group}>
								{#each groupOptions as option}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
						</div>

						<!-- Parent Category -->
						<div class="form-control">
							<label class="label">
								<span class="label-text font-semibold">Parent category (optional)</span>
							</label>
							<select class="select select-bordered" bind:value={parentId}>
								<option value={null}>None</option>
								{#each availableCategories as cat}
									{#if !cat.parent_id && cat.id !== category.id}
										<option value={cat.id}>{cat.name}</option>
									{/if}
								{/each}
							</select>
						</div>

						<!-- Keywords -->
						<div class="form-control">
							<label class="label">
								<span class="label-text font-semibold">Keywords</span>
							</label>
							<div class="flex gap-2">
								<input
									type="text"
									class="input input-bordered flex-1"
									bind:value={keywordInput}
									onkeydown={handleKeywordKeydown}
									placeholder="Enter keyword and press Enter"
								/>
								<button type="button" class="btn btn-outline" onclick={addKeyword}>
									Add
								</button>
							</div>
							{#if keywords.length > 0}
								<div class="flex flex-wrap gap-2 mt-2">
									{#each keywords as keyword, index}
										<div class="badge badge-primary gap-2">
											{keyword}
											<button
												type="button"
												class="btn btn-xs btn-ghost"
												onclick={() => removeKeyword(index)}
											>
												<X size={12} />
											</button>
										</div>
									{/each}
								</div>
							{/if}
						</div>

						<!-- Actions -->
						<div class="flex gap-4 justify-end">
							<button type="button" class="btn btn-ghost" onclick={cancelEditing} disabled={submitting}>
								Cancel
							</button>
							<button type="submit" class="btn btn-primary" disabled={submitting}>
								{#if submitting}
									<span class="loading loading-spinner loading-sm"></span>
								{:else}
									<Save size={20} />
								{/if}
								Save Changes
							</button>
						</div>
					</form>
				{/if}
			</div>
		</div>
	{/if}
</div>

