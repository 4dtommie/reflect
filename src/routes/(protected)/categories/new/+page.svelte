<script lang="ts">
	import { goto } from '$app/navigation';
	import { ArrowLeft, Save, X } from 'lucide-svelte';
	import * as Icons from 'lucide-svelte';

	type Category = {
		id: number;
		name: string;
		description: string | null;
		color: string | null;
		icon: string | null;
		keywords: string[];
		parent_id: number | null;
		group: string | null;
	};

	let name = $state('');
	let description = $state('');
	let color = $state('#3b82f6');
	let icon = $state<string | null>(null);
	let keywords = $state<string[]>([]);
	let keywordInput = $state('');
	let parentId = $state<number | null>(null);
	let group = $state<string>('other');
	let submitting = $state(false);
	let error = $state<string | null>(null);

	let availableCategories: Category[] = $state([]);
	let showIconPicker = $state(false);
	let showColorPicker = $state(false);

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

	async function loadCategories() {
		try {
			const response = await fetch('/api/categories');
			if (response.ok) {
				const data = await response.json();
				availableCategories = [...(data.systemCategories || []), ...(data.userCategories || [])];
			}
		} catch (err) {
			console.error('Failed to load categories:', err);
		}
	}

	onMount(() => {
		loadCategories();
	});

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

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		submitting = true;
		error = null;

		try {
			const response = await fetch('/api/categories', {
				method: 'POST',
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
				throw new Error(data.message || 'Failed to create category');
			}

			goto('/categories');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create category';
		} finally {
			submitting = false;
		}
	}

	function getIconComponent(iconName: string | null) {
		if (!iconName) return null;
		return (Icons as any)[iconName] || null;
	}
</script>

<div class="container mx-auto px-4 py-8 max-w-2xl">
	<div class="flex items-center gap-4 mb-6">
		<button class="btn btn-ghost btn-sm" onclick={() => goto('/categories')}>
			<ArrowLeft size={20} />
		</button>
		<h1 class="text-4xl font-bold">Create category</h1>
	</div>

	{#if error}
		<div class="alert alert-error mb-4">
			<span>{error}</span>
		</div>
	{/if}

	<form onsubmit={handleSubmit} class="space-y-6">
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
				placeholder="Enter category name"
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
				placeholder="Enter category description"
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
					placeholder="#3b82f6"
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
					placeholder="Icon name (e.g., ShoppingCart)"
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
					{#if !cat.parent_id}
						<option value={cat.id}>{cat.name}</option>
					{/if}
				{/each}
			</select>
		</div>

		<!-- Keywords -->
		<div class="form-control">
			<label class="label">
				<span class="label-text font-semibold">Keywords</span>
				<span class="label-text-alt">For auto-categorization</span>
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
			<button type="button" class="btn btn-ghost" onclick={() => goto('/categories')}>
				Cancel
			</button>
			<button type="submit" class="btn btn-primary" disabled={submitting}>
				{#if submitting}
					<span class="loading loading-spinner loading-sm"></span>
				{:else}
					<Save size={20} />
				{/if}
					Create category
			</button>
		</div>
	</form>
</div>

