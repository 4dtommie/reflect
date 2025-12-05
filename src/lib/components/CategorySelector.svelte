<script lang="ts">
	import { fade } from 'svelte/transition';
	import { Search, X, Check, ChevronDown } from 'lucide-svelte';
	import { portal } from '$lib/actions/portal';

	interface Category {
		id: number;
		name: string;
		icon?: string | null;
		color?: string | null;
		parentId?: number | null;
		isHeader?: boolean;
	}

	let {
		categories = [],
		selectedCategoryId = $bindable(null),
		placeholder = 'Select category...'
	}: {
		categories: Category[];
		selectedCategoryId: number | null;
		placeholder?: string;
	} = $props();

	let searchQuery = $state('');
	let isCategoryDropdownOpen = $state(false);
	let triggerButton: HTMLElement | undefined = $state();
	let dropdownPosition = $state({ top: 0, left: 0, width: 0 });

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

	function selectCategory(category: Category) {
		selectedCategoryId = category.id;
		isCategoryDropdownOpen = false;
	}
</script>

<svelte:window onscroll={handleScroll} onresize={handleScroll} />

<div class="relative w-full">
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
				{placeholder}
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

<!-- Fixed Dropdown Portal -->
{#if isCategoryDropdownOpen}
	<!-- Backdrop to close -->
	<div
		use:portal
		class="fixed inset-0 z-[9998]"
		onclick={() => (isCategoryDropdownOpen = false)}
		role="button"
		tabindex="-1"
	></div>

	<div
		use:portal
		class="pointer-events-auto fixed z-[9999] rounded-lg border border-base-300 bg-base-100 p-2 shadow-xl"
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
						onclick={() => selectCategory(category)}
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
