<script lang="ts">
	import { Plus, ChevronRight, ChevronDown, X, ArrowRight, Circle } from 'lucide-svelte';
	import * as Icons from 'lucide-svelte';
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';

	type Category = {
		id: number;
		name: string;
		description: string | null;
		is_default: boolean;
		created_by: number | null;
		parent_id: number | null;
		group: string | null;
		color: string | null;
		icon: string | null;
		keywords: string[];
	};

	let { data }: { data: PageData } = $props();
	let categories = $state<Category[]>(data?.categories || []);
	let error = $state<string | null>(null);
	let showCreateForm = $state(false);
	let newCategoryName = $state('');
	let creating = $state(false);
	let expandedCategories = $state<Set<number>>(new Set());
	let showCategoryModal = $state(false);
	let selectedCategory = $state<Category | null>(null);
	let loadingCategory = $state(false);

	// Update categories when data changes
	$effect(() => {
		if (data?.categories) {
			categories = data.categories;
		}
	});

	// Separate main categories (no parent) from subcategories
	function getMainCategories(): Category[] {
		if (!categories || categories.length === 0) return [];
		// Filter for categories where parent_id is null or undefined
		return categories.filter(cat => cat.parent_id === null || cat.parent_id === undefined);
	}

	// Group labels
	const groupLabels: Record<string, string> = {
		income: 'Income',
		essential: 'Essential expenses',
		lifestyle: 'Lifestyle expenses',
		financial: 'Financial management',
		other: 'Other'
	};

	// Group main categories by their group field
	function getCategoriesByGroup(): Record<string, Category[]> {
		const mainCats = getMainCategories();
		const grouped: Record<string, Category[]> = {};
		
		for (const category of mainCats) {
			const group = category.group || 'other';
			if (!grouped[group]) {
				grouped[group] = [];
			}
			grouped[group].push(category);
		}
		
		return grouped;
	}

	// Group order for display
	const groupOrder = ['income', 'essential', 'lifestyle', 'financial', 'other'];

	// Get subcategories for a given parent category ID
	function getSubcategories(parentId: number): Category[] {
		return categories.filter(cat => cat.parent_id === parentId);
	}

	function toggleCategory(categoryId: number) {
		if (expandedCategories.has(categoryId)) {
			expandedCategories.delete(categoryId);
		} else {
			expandedCategories.add(categoryId);
		}
		expandedCategories = new Set(expandedCategories);
	}

	async function fetchCategories() {
		try {
			const response = await fetch('/api/categories');
			if (!response.ok) {
				throw new Error('Failed to fetch categories');
			}
			const data = await response.json();
			categories = data.categories || [];
			await invalidateAll();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load categories';
		}
	}

	async function createCategory() {
		if (!newCategoryName.trim()) {
			error = 'Category name is required';
			return;
		}

		creating = true;
		error = null;

		try {
			const response = await fetch('/api/categories', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: newCategoryName.trim() })
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.message || 'Failed to create category');
			}

			newCategoryName = '';
			showCreateForm = false;
			await fetchCategories();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create category';
		} finally {
			creating = false;
		}
	}

	async function openCategoryModal(categoryId: number) {
		loadingCategory = true;
		showCategoryModal = true;
		error = null;

		try {
			const response = await fetch('/api/categories');
			if (!response.ok) {
				throw new Error('Failed to fetch categories');
			}
			const data = await response.json();
			const allCategories = data.categories || [];
			const found = allCategories.find((cat: Category) => cat.id === categoryId);

			if (!found) {
				throw new Error('Category not found');
			}

			selectedCategory = found;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load category';
			showCategoryModal = false;
		} finally {
			loadingCategory = false;
		}
	}

	function closeCategoryModal() {
		showCategoryModal = false;
		selectedCategory = null;
	}

	function getCategoryIcon(iconName: string | null) {
		if (!iconName) return null;
		return (Icons as any)[iconName] || null;
	}
</script>

<div style="width: 100%; max-width: 100%; box-sizing: border-box;">
	<div class="flex justify-between items-center mb-6">
		<h1 class="text-4xl font-bold">Categories</h1>
		<button class="btn btn-primary" onclick={() => (showCreateForm = !showCreateForm)}>
			<Plus size={20} />
			Create category
		</button>
	</div>

	{#if error}
		<div class="alert alert-error mb-4">
			<span>{error}</span>
			<button class="btn btn-sm btn-ghost" onclick={() => (error = null)}>✕</button>
		</div>
	{/if}

	{#if showCreateForm}
		<div class="card bg-base-200 mb-6">
			<div class="card-body">
				<h2 class="card-title">Create New Category</h2>
				<div class="form-control">
					<label class="label">
						<span class="label-text">Category name</span>
					</label>
					<input
						type="text"
						class="input input-bordered"
						bind:value={newCategoryName}
						placeholder="Enter category name"
						onkeydown={(e) => {
							if (e.key === 'Enter') {
								createCategory();
							}
						}}
					/>
				</div>
				<div class="card-actions justify-end mt-4">
					<button class="btn btn-ghost" onclick={() => {
						showCreateForm = false;
						newCategoryName = '';
					}}>
						Cancel
					</button>
					<button class="btn btn-primary" onclick={createCategory} disabled={creating}>
						{#if creating}
							<span class="loading loading-spinner loading-sm"></span>
						{:else}
							Create
						{/if}
					</button>
				</div>
			</div>
		</div>
	{/if}

	<div class="card bg-base-200">
		<div class="card-body">
			<h2 class="card-title">All categories</h2>
			{#if categories.length === 0}
				<p class="text-base-content/60">No categories found. Create your first category above.</p>
			{:else}
				{@const mainCats = getMainCategories()}
				{@const categoriesByGroup = getCategoriesByGroup()}
				<p class="text-sm text-base-content/60 mb-4">
					Total: {categories.length} | Main: {mainCats.length}
				</p>
				{#if mainCats.length === 0}
					<p class="text-base-content/60">No main categories found (all have parent_id).</p>
				{:else}
				<div class="columns-1 md:columns-2 gap-6">
					{#each groupOrder as groupKey}
						{@const groupCategories = categoriesByGroup[groupKey] || []}
						{#if groupCategories.length > 0}
							<div class="break-inside-avoid mb-6">
								<h3 class="text-lg font-semibold mb-2 text-base-content/90">
									{groupLabels[groupKey] || groupKey}
								</h3>
								<div class="space-y-1">
									{#each groupCategories as category}
										{@const subcategories = getSubcategories(category.id)}
										{@const hasSubcategories = subcategories.length > 0}
										{@const isExpanded = expandedCategories.has(category.id)}
										
										<div class="border border-base-300 rounded">
											<!-- Main Category -->
											<div 
												class="flex items-center justify-between px-1.5 py-1 hover:bg-base-300 {hasSubcategories ? 'cursor-pointer' : ''} {hasSubcategories ? '' : 'rounded'}"
												onclick={() => hasSubcategories && toggleCategory(category.id)}
											>
												<div class="flex items-center gap-1.5 flex-1 min-w-0">
													<div class="flex-shrink-0">
														{#if hasSubcategories}
															{#if isExpanded}
																<ChevronDown size={14} class="text-base-content/60" />
															{:else}
																<ChevronRight size={14} class="text-base-content/60" />
															{/if}
														{:else}
															{@const CategoryIcon = getCategoryIcon(category.icon)}
															{#if CategoryIcon}
																<CategoryIcon size={14} class="text-base-content/60" />
															{:else}
																<Circle size={8} class="text-base-content/40" fill="currentColor" />
															{/if}
														{/if}
													</div>
													<div class="flex-1 min-w-0">
														<div class="text-xs truncate">{category.name}</div>
													</div>
													{#if !category.is_default}
														<span class="badge badge-secondary badge-sm">Custom</span>
													{/if}
												</div>
												<div class="flex items-center gap-2 ml-2 flex-shrink-0">
													<button
														type="button"
														class="btn btn-xs btn-ghost"
														onclick={(e) => {
															e.stopPropagation();
															openCategoryModal(category.id);
														}}
														title="View category"
													>
														<ArrowRight size={14} />
													</button>
												</div>
											</div>
											
											<!-- Subcategories -->
											{#if hasSubcategories && isExpanded}
												<div class="border-t border-base-300 bg-base-100">
													{#each subcategories as subcategory}
														{@const SubcategoryIcon = getCategoryIcon(subcategory.icon)}
														<div class="flex items-center justify-between px-1.5 py-1 pl-6 hover:bg-base-200">
															<div class="flex items-center gap-1.5 flex-1 min-w-0">
																<div class="flex-shrink-0">
																	{#if SubcategoryIcon}
																		<SubcategoryIcon size={14} class="text-base-content/60" />
																	{:else}
																		<Circle size={8} class="text-base-content/40" fill="currentColor" />
																	{/if}
																</div>
																<div class="flex-1 min-w-0">
																	<div class="text-xs text-base-content/80 truncate">{subcategory.name}</div>
																</div>
															</div>
															<div class="flex items-center gap-2 flex-shrink-0">
																{#if !subcategory.is_default}
																	<span class="badge badge-secondary badge-sm">Custom</span>
																{/if}
																<button
																	type="button"
																	class="btn btn-xs btn-ghost"
																	onclick={() => openCategoryModal(subcategory.id)}
																	title="View category"
																>
																	<ArrowRight size={14} />
																</button>
															</div>
														</div>
													{/each}
												</div>
											{/if}
										</div>
									{/each}
								</div>
							</div>
						{/if}
					{/each}
				</div>
				{/if}
			{/if}
		</div>
	</div>

	<!-- Category Details Modal -->
	{#if showCategoryModal}
		<div class="modal modal-open">
			<div class="modal-box max-w-2xl">
				<div class="flex items-center justify-between mb-4">
					<h3 class="text-2xl font-bold">Category details</h3>
					<button class="btn btn-sm btn-circle btn-ghost" onclick={closeCategoryModal}>
						<X size={20} />
					</button>
				</div>

				{#if loadingCategory}
					<div class="flex justify-center items-center py-8">
						<span class="loading loading-spinner loading-lg"></span>
					</div>
				{:else if selectedCategory}
					<div class="space-y-4">
						<div class="flex items-start gap-4">
							{#if selectedCategory.color}
								{@const IconComponent = getCategoryIcon(selectedCategory.icon)}
								<div
									class="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0"
									style="background-color: {selectedCategory.color}20; color: {selectedCategory.color}"
								>
									{#if IconComponent}
										{@const Icon = IconComponent}
										<Icon size={32} />
									{/if}
								</div>
							{/if}
							<div class="flex-1">
								<h4 class="text-2xl font-bold mb-2">{selectedCategory.name}</h4>
								{#if selectedCategory.description}
									<p class="text-base-content/70 mb-3">{selectedCategory.description}</p>
								{/if}
								<div class="flex flex-wrap gap-4 text-sm">
									<div>
										<span class="text-base-content/50">Group:</span>
										<span class="ml-2 font-semibold">
											{groupLabels[selectedCategory.group || 'other']}
										</span>
									</div>
									<div>
										<span class="text-base-content/50">Type:</span>
										<span class="ml-2 font-semibold">
											{selectedCategory.is_default ? 'System category' : 'Custom category'}
										</span>
									</div>
								</div>
							</div>
						</div>

						{#if selectedCategory.keywords && selectedCategory.keywords.length > 0}
							<div>
								<h5 class="text-lg font-semibold mb-2">Keywords</h5>
								<div class="flex flex-wrap gap-2">
									{#each selectedCategory.keywords as keyword}
										<div class="badge badge-primary">{keyword}</div>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				{/if}

				<div class="modal-action">
					<button class="btn" onclick={closeCategoryModal}>Close</button>
				</div>
			</div>
			<div class="modal-backdrop" onclick={closeCategoryModal}></div>
		</div>
	{/if}
</div>
