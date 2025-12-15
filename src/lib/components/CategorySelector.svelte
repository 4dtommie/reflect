<script lang="ts">
	import { fade } from 'svelte/transition';
	import { Search, X, Check, ChevronDown, LayoutGrid } from 'lucide-svelte';
	import { portal } from '$lib/actions/portal';

	interface Category {
		id: number;
		name: string;
		icon?: string | null;
		color?: string | null;
		parent_id?: number | null;
		isParentWithChildren?: boolean;
	}

	let {
		categories = [],
		selectedCategoryId = $bindable(null),
		placeholder = 'Select category...',
		size = 'md'
	}: {
		categories: Category[];
		selectedCategoryId: number | null;
		placeholder?: string;
		size?: 'sm' | 'md';
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

		// Group by parent for display with hierarchy
		const parents = filtered.filter((c) => !c.parent_id);
		const children = filtered.filter((c) => c.parent_id);

		const result: (Category & { isParentWithChildren?: boolean })[] = [];

		for (const parent of parents) {
			const myChildren = children.filter((c) => c.parent_id === parent.id);

			if (myChildren.length > 0) {
				// Parent has children - mark it for styling but still selectable
				result.push({ ...parent, isParentWithChildren: true });
				result.push(...myChildren);
			} else {
				// Parent has no children
				result.push(parent);
			}
		}

		// Add any orphans (shouldn't happen ideally but good for safety)
		const orphans = children.filter((c) => !parents.find((p) => p.id === c.parent_id));
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
	{#if !isCategoryDropdownOpen}
		<!-- Closed State - Show as dropdown button -->
		<button
			bind:this={triggerButton}
			class="input-bordered input flex h-12 w-full items-center justify-between rounded-xl border-base-content/30 bg-base-100 px-3 pl-11 text-left focus:border-primary focus:outline-none {size ===
			'sm'
				? 'input-sm'
				: ''}"
			onclick={toggleDropdown}
			type="button"
		>
			{#if selectedCategory}
				<div
					class="absolute top-1/2 left-2.5 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-[8px] text-white"
					style="background-color: {selectedCategory.color || 'hsl(var(--p))'}"
				>
					{#if selectedCategory.icon && selectedCategory.icon.length <= 2}
						{selectedCategory.icon}
					{:else}
						{selectedCategory.name[0]}
					{/if}
				</div>
				<span class="text-sm">{selectedCategory.name}</span>
			{:else}
				<LayoutGrid class="absolute top-1/2 left-3 -translate-y-1/2 opacity-40" size={16} />
				<span class="text-sm opacity-50">{placeholder}</span>
			{/if}
			<ChevronDown size={14} class="opacity-50" />
		</button>
	{:else}
		<!-- Open State - Show search input -->
		<div class="relative">
			<Search class="absolute top-1/2 left-3 -translate-y-1/2 opacity-50" size={16} />
			<input
				bind:this={triggerButton}
				id="category-search-input"
				type="text"
				class="input-bordered input h-12 w-full rounded-xl border-base-content/30 bg-base-100 focus:border-primary {size ===
				'sm'
					? 'pl-11'
					: 'pl-11'}"
				autocomplete="off"
				placeholder="Search categories..."
				bind:value={searchQuery}
			/>
			<button
				class="absolute top-1/2 right-3 -translate-y-1/2 opacity-50 hover:opacity-100"
				onclick={(e) => {
					e.stopPropagation();
					isCategoryDropdownOpen = false;
					searchQuery = '';
				}}
			>
				<X size={16} />
			</button>
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
				<button
					class="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-base-200 {selectedCategoryId ===
					category.id
						? 'bg-base-200'
						: ''} {category.parent_id ? 'pl-6' : ''} {category.isParentWithChildren
						? 'font-semibold'
						: ''}"
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
			{/each}

			{#if filteredCategories.length === 0}
				<div class="p-3 text-center text-sm opacity-50">No categories found</div>
			{/if}
		</div>
	</div>
{/if}
