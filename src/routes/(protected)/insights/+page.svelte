<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import {
		Plus,
		Play,
		Pencil,
		Trash2,
		X,
		Info,
		ChevronDown,
		ChevronRight,
		Check,
		AlertCircle
	} from 'lucide-svelte';
	import DashboardWidget from '$lib/components/DashboardWidget.svelte';

	interface TriggerParam {
		name: string;
		type: 'number' | 'string' | 'boolean';
		description: string;
		default?: unknown;
	}

	interface TriggerMeta {
		id: string;
		description: string;
		params: TriggerParam[];
		templateVars: string[];
	}

	interface InsightDefinition {
		id: string;
		category: string;
		priority: number;
		trigger: string;
		trigger_params: Record<string, unknown> | null;
		message_template: string;
		icon: string | null;
		action_label: string | null;
		action_href: string | null;
		contexts: string[];
		is_active: boolean;
	}

	let { data } = $props();
	let insights = $state<InsightDefinition[]>(data.insights as unknown as InsightDefinition[]);
	let triggers = $state<TriggerMeta[]>(data.triggers);

	// Modal state
	let showEditor = $state(false);
	let editingInsight = $state<InsightDefinition | null>(null);
	let isCreating = $state(false);

	// Form state
	let formId = $state('');
	let formCategory = $state('insight');
	let formPriority = $state(50);
	let formTrigger = $state('always');
	let formTriggerParams = $state('{}');
	let formMessageTemplate = $state('');
	let formIcon = $state('');
	let formActionLabel = $state('');
	let formActionHref = $state('');
	let formContexts = $state<string[]>(['chat', 'card']);
	let formIsActive = $state(true);

	// Test state
	let testingId = $state<string | null>(null);
	let testResult = $state<{
		triggered: boolean;
		message: string;
		triggerData: Record<string, unknown>;
	} | null>(null);

	// Trigger info expanded
	let showTriggerInfo = $state(false);

	// Saving/deleting state
	let saving = $state(false);
	let deleting = $state<string | null>(null);
	let error = $state<string | null>(null);

	const categories = ['urgent', 'action', 'insight', 'celebration', 'tip'];

	function getCategoryBadgeClass(category: string): string {
		switch (category) {
			case 'urgent':
				return 'badge-error';
			case 'action':
				return 'badge-warning';
			case 'insight':
				return 'badge-info';
			case 'celebration':
				return 'badge-success';
			case 'tip':
				return 'badge-ghost';
			default:
				return 'badge-neutral';
		}
	}

	// Parse message and split into text and variable parts
	function parseMessageParts(template: string): Array<{ type: 'text' | 'var'; value: string }> {
		const parts: Array<{ type: 'text' | 'var'; value: string }> = [];
		const regex = /\{\{(\w+)\}\}/g;
		let lastIndex = 0;
		let match;

		while ((match = regex.exec(template)) !== null) {
			if (match.index > lastIndex) {
				parts.push({ type: 'text', value: template.slice(lastIndex, match.index) });
			}
			parts.push({ type: 'var', value: match[1] });
			lastIndex = regex.lastIndex;
		}

		if (lastIndex < template.length) {
			parts.push({ type: 'text', value: template.slice(lastIndex) });
		}

		return parts;
	}

	function openCreateModal() {
		isCreating = true;
		editingInsight = null;
		formId = '';
		formCategory = 'insight';
		formPriority = 50;
		formTrigger = 'always';
		formTriggerParams = '{}';
		formMessageTemplate = '';
		formIcon = '';
		formActionLabel = '';
		formActionHref = '';
		formContexts = ['chat', 'card'];
		formIsActive = true;
		showEditor = true;
	}

	function openEditModal(insight: InsightDefinition) {
		isCreating = false;
		editingInsight = insight;
		formId = insight.id;
		formCategory = insight.category;
		formPriority = insight.priority;
		formTrigger = insight.trigger;
		formTriggerParams = JSON.stringify(insight.trigger_params ?? {}, null, 2);
		formMessageTemplate = insight.message_template;
		formIcon = insight.icon ?? '';
		formActionLabel = insight.action_label ?? '';
		formActionHref = insight.action_href ?? '';
		formContexts = [...insight.contexts];
		formIsActive = insight.is_active;
		showEditor = true;
	}

	function closeEditor() {
		showEditor = false;
		editingInsight = null;
		error = null;
	}

	async function handleSave() {
		error = null;
		saving = true;

		try {
			let triggerParams: Record<string, unknown> | null = null;
			try {
				const parsed = JSON.parse(formTriggerParams);
				triggerParams = Object.keys(parsed).length > 0 ? parsed : null;
			} catch {
				error = 'Invalid JSON in trigger params';
				saving = false;
				return;
			}

			const payload = {
				id: formId,
				category: formCategory,
				priority: formPriority,
				trigger: formTrigger,
				trigger_params: triggerParams,
				message_template: formMessageTemplate,
				icon: formIcon || null,
				action_label: formActionLabel || null,
				action_href: formActionHref || null,
				contexts: formContexts,
				is_active: formIsActive
			};

			const url = isCreating ? '/api/insights' : `/api/insights/${editingInsight!.id}`;
			const method = isCreating ? 'POST' : 'PUT';

			const response = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to save');
			}

			await invalidateAll();
			insights = (await (await fetch('/api/insights')).json()).insights;
			closeEditor();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error';
		} finally {
			saving = false;
		}
	}

	async function handleDelete(id: string) {
		if (!confirm(`Delete insight "${id}"?`)) return;

		deleting = id;
		try {
			const response = await fetch(`/api/insights/${id}`, { method: 'DELETE' });
			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to delete');
			}
			insights = insights.filter((i) => i.id !== id);
		} catch (err) {
			alert(err instanceof Error ? err.message : 'Delete failed');
		} finally {
			deleting = null;
		}
	}

	async function handleToggleActive(insight: InsightDefinition) {
		try {
			const response = await fetch(`/api/insights/${insight.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ is_active: !insight.is_active })
			});
			if (!response.ok) throw new Error('Failed to toggle');
			insight.is_active = !insight.is_active;
			insights = [...insights];
		} catch (err) {
			alert('Failed to toggle active state');
		}
	}

	async function handleTest(id: string) {
		testingId = id;
		testResult = null;

		try {
			const response = await fetch(`/api/insights/${id}/test`, { method: 'POST' });
			if (!response.ok) throw new Error('Test failed');
			testResult = await response.json();
		} catch (err) {
			testResult = {
				triggered: false,
				message: 'Test failed: ' + (err instanceof Error ? err.message : 'Unknown error'),
				triggerData: {}
			};
		} finally {
			testingId = null;
		}
	}

	function closeTestResult() {
		testResult = null;
	}

	function toggleContext(context: string) {
		if (formContexts.includes(context)) {
			formContexts = formContexts.filter((c) => c !== context);
		} else {
			formContexts = [...formContexts, context];
		}
	}

	const selectedTriggerMeta = $derived(triggers.find((t) => t.id === formTrigger));
</script>

<svelte:head>
	<title>Insight rules | Reflect</title>
</svelte:head>

<div class="mx-auto max-w-6xl px-4">
	<!-- Header -->
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-2xl font-bold">Insight rules</h1>
		<button class="btn gap-2 btn-primary" onclick={openCreateModal}>
			<Plus size={18} />
			Add insight
		</button>
	</div>

	<!-- Two-column layout -->
	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Insights List (2/3) -->
		<div class="lg:col-span-2">
			<DashboardWidget title="All insights ({insights.length})" enableHover={false}>
				<div class="space-y-3">
					{#each insights as insight}
						<div
							class="group flex items-start gap-3 rounded-xl border border-base-300 p-3 {insight.is_active
								? 'bg-base-100'
								: 'bg-base-200/50 opacity-60'}"
						>
							<!-- Left: Category + Priority -->
							<div class="flex min-w-20 flex-col items-center gap-1 pr-2">
								<span class="badge badge-sm {getCategoryBadgeClass(insight.category)}">
									{insight.category}
								</span>
								<span class="text-xs font-medium text-base-content/50">p{insight.priority}</span>
							</div>

							<!-- Center: Message content -->
							<div class="min-w-0 flex-1">
								<div class="flex flex-wrap items-center gap-1 text-sm">
									{#each parseMessageParts(insight.message_template) as part}
										{#if part.type === 'var'}
											<span
												class="rounded bg-base-300 px-1.5 py-0.5 font-mono text-xs text-base-content/80"
												>{part.value}</span
											>
										{:else}
											<span>{part.value}</span>
										{/if}
									{/each}
								</div>
								<div class="mt-1 flex items-center gap-2 text-xs text-base-content/50">
									<span class="font-mono">{insight.id}</span>
									<span>•</span>
									<span class="font-mono">{insight.trigger}</span>
									{#if insight.action_label}
										<span>•</span>
										<span class="text-primary">{insight.action_label}</span>
									{/if}
								</div>
							</div>

							<!-- Right: Actions (hidden on hover) + Toggle (always visible) -->
							<div class="flex items-center gap-1">
								<div class="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
									<button
										class="btn btn-square btn-ghost btn-sm"
										title="Test"
										onclick={() => handleTest(insight.id)}
										disabled={testingId === insight.id}
									>
										{#if testingId === insight.id}
											<span class="loading loading-xs loading-spinner"></span>
										{:else}
											<Play size={16} />
										{/if}
									</button>
									<button
										class="btn btn-square btn-ghost btn-sm"
										title="Edit"
										onclick={() => openEditModal(insight)}
									>
										<Pencil size={16} />
									</button>
									<button
										class="btn btn-square text-error btn-ghost btn-sm"
										title="Delete"
										onclick={() => handleDelete(insight.id)}
										disabled={deleting === insight.id}
									>
										{#if deleting === insight.id}
											<span class="loading loading-xs loading-spinner"></span>
										{:else}
											<Trash2 size={16} />
										{/if}
									</button>
								</div>
								<input
									type="checkbox"
									class="toggle toggle-sm toggle-success"
									checked={insight.is_active}
									onchange={() => handleToggleActive(insight)}
								/>
							</div>
						</div>
					{/each}
				</div>
			</DashboardWidget>
		</div>

		<!-- Trigger Reference (1/3) -->
		<div class="lg:col-span-1">
			<DashboardWidget title="Trigger reference" enableHover={false}>
				<div class="space-y-3 text-sm">
					{#each triggers as trigger}
						<div class="rounded-lg border border-base-300 p-2">
							<div class="font-mono text-xs font-semibold">{trigger.id}</div>
							<div class="mt-0.5 text-xs text-base-content/70">{trigger.description}</div>
							{#if trigger.templateVars.length > 0}
								<div class="mt-1 flex flex-wrap gap-1">
									{#each trigger.templateVars as templateVar}
										<span class="rounded bg-base-300 px-1 py-0.5 font-mono text-xs"
											>{templateVar}</span
										>
									{/each}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</DashboardWidget>
		</div>
	</div>
</div>

<!-- Editor Modal -->
{#if showEditor}
	<div class="modal-open modal">
		<div class="modal-box max-w-2xl">
			<button class="btn absolute top-2 right-2 btn-circle btn-ghost btn-sm" onclick={closeEditor}>
				<X size={18} />
			</button>

			<h3 class="mb-4 text-lg font-bold">
				{isCreating ? 'Create insight' : `Edit: ${editingInsight?.id}`}
			</h3>

			{#if error}
				<div class="mb-4 alert alert-error">
					<AlertCircle size={18} />
					<span>{error}</span>
				</div>
			{/if}

			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleSave();
				}}
				class="space-y-4"
			>
				<!-- Section: Basics -->
				<div class="space-y-3">
					<h4 class="text-sm font-semibold text-base-content/70">Basics</h4>

					<!-- ID (only for create) -->
					{#if isCreating}
						<div class="form-control">
							<label class="label py-1" for="insight-id">
								<span class="label-text">ID (unique)</span>
							</label>
							<input
								id="insight-id"
								type="text"
								class="input-bordered input input-sm w-full"
								bind:value={formId}
								placeholder="e.g. my_custom_insight"
								required
							/>
						</div>
					{/if}

					<!-- Category, Priority, Active in one row -->
					<div class="grid grid-cols-3 gap-3">
						<div class="form-control">
							<label class="label py-1" for="insight-category">
								<span class="label-text text-xs">Category</span>
							</label>
							<select
								id="insight-category"
								class="select-bordered select w-full select-sm"
								bind:value={formCategory}
							>
								{#each categories as cat}
									<option value={cat}>{cat}</option>
								{/each}
							</select>
						</div>
						<div class="form-control">
							<label class="label py-1" for="insight-priority">
								<span class="label-text text-xs">Priority (1-100)</span>
							</label>
							<input
								id="insight-priority"
								type="number"
								class="input-bordered input input-sm w-full"
								bind:value={formPriority}
								min="1"
								max="100"
							/>
						</div>
						<div class="form-control">
							<label class="label py-1">
								<span class="label-text text-xs">Status</span>
							</label>
							<label class="label cursor-pointer justify-start gap-2 py-1">
								<input
									type="checkbox"
									class="toggle toggle-sm toggle-success"
									bind:checked={formIsActive}
								/>
								<span class="text-sm">{formIsActive ? 'Active' : 'Inactive'}</span>
							</label>
						</div>
					</div>
				</div>

				<div class="divider my-2"></div>

				<!-- Section: Trigger -->
				<div class="space-y-3">
					<h4 class="text-sm font-semibold text-base-content/70">Trigger</h4>

					<div class="grid grid-cols-2 gap-3">
						<div class="form-control">
							<label class="label py-1" for="insight-trigger">
								<span class="label-text text-xs">Trigger type</span>
							</label>
							<select
								id="insight-trigger"
								class="select-bordered select w-full select-sm"
								bind:value={formTrigger}
							>
								{#each triggers as t}
									<option value={t.id}>{t.id}</option>
								{/each}
							</select>
						</div>
						<div class="form-control">
							<label class="label py-1" for="insight-params">
								<span class="label-text text-xs">Parameters (JSON)</span>
							</label>
							<input
								id="insight-params"
								type="text"
								class="input-bordered input input-sm w-full font-mono text-xs"
								bind:value={formTriggerParams}
								placeholder="JSON"
							/>
						</div>
					</div>
					{#if selectedTriggerMeta}
						<div class="rounded-lg bg-base-200 p-2 text-xs">
							<span class="text-base-content/60">{selectedTriggerMeta.description}</span>
							{#if selectedTriggerMeta.params.length > 0}
								<div class="mt-1 text-base-content/50">
									Params: {#each selectedTriggerMeta.params as p}<code
											class="ml-1 rounded bg-base-300 px-1">{p.name}</code
										>{/each}
								</div>
							{/if}
						</div>
					{/if}
				</div>

				<div class="divider my-2"></div>

				<!-- Section: Message -->
				<div class="space-y-3">
					<h4 class="text-sm font-semibold text-base-content/70">Message</h4>

					<div class="form-control">
						<label class="label py-1" for="insight-message">
							<span class="label-text text-xs">Message template</span>
						</label>
						<textarea
							id="insight-message"
							class="textarea-bordered textarea text-sm"
							bind:value={formMessageTemplate}
							rows="2"
							placeholder="Use &#123;&#123;variable&#125;&#125; for placeholders"
							required
						></textarea>
						{#if selectedTriggerMeta && selectedTriggerMeta.templateVars.length > 0}
							<div class="mt-2 flex flex-wrap items-center gap-1">
								<span class="text-xs text-base-content/50">Click to insert:</span>
								{#each selectedTriggerMeta.templateVars as templateVar}
									<button
										type="button"
										class="badge cursor-pointer bg-base-300 badge-sm font-mono transition-colors hover:bg-primary hover:text-primary-content"
										onclick={() => {
											formMessageTemplate += `{{${templateVar}}}`;
										}}
									>
										{templateVar}
									</button>
								{/each}
							</div>
						{/if}
						<!-- Preview -->
						{#if formMessageTemplate}
							<div class="mt-2 rounded-lg border border-base-300 bg-base-200/50 p-2">
								<div class="mb-1 text-xs text-base-content/50">Preview:</div>
								<div class="flex flex-wrap items-center gap-1 text-sm">
									{#each parseMessageParts(formMessageTemplate) as part}
										{#if part.type === 'var'}
											<span
												class="rounded bg-primary/20 px-1.5 py-0.5 font-mono text-xs text-primary"
												>{part.value}</span
											>
										{:else}
											<span>{part.value}</span>
										{/if}
									{/each}
								</div>
							</div>
						{/if}
					</div>
				</div>

				<div class="divider my-2"></div>

				<!-- Section: Action Button -->
				<div class="space-y-3">
					<h4 class="text-sm font-semibold text-base-content/70">Action button (optional)</h4>

					<div class="grid grid-cols-2 gap-3">
						<div class="form-control">
							<label class="label py-1" for="insight-action-label">
								<span class="label-text text-xs">Button label</span>
							</label>
							<input
								id="insight-action-label"
								type="text"
								class="input-bordered input input-sm w-full"
								bind:value={formActionLabel}
								placeholder="e.g. View details"
							/>
						</div>
						<div class="form-control">
							<label class="label py-1" for="insight-action-href">
								<span class="label-text text-xs">Button link</span>
							</label>
							<input
								id="insight-action-href"
								type="text"
								class="input-bordered input input-sm w-full"
								bind:value={formActionHref}
								placeholder="e.g. /transactions"
							/>
						</div>
					</div>
				</div>

				<div class="divider my-2"></div>

				<!-- Section: Display Contexts -->
				<div class="space-y-3">
					<h4 class="text-sm font-semibold text-base-content/70">Display contexts</h4>

					<div class="flex gap-4">
						{#each ['chat', 'card', 'widget'] as ctx}
							<label class="label cursor-pointer gap-2 py-0">
								<input
									type="checkbox"
									class="checkbox checkbox-sm"
									checked={formContexts.includes(ctx)}
									onchange={() => toggleContext(ctx)}
								/>
								<span class="text-sm capitalize">{ctx}</span>
							</label>
						{/each}
					</div>
				</div>

				<!-- Actions -->
				<div class="modal-action pt-2">
					<button type="button" class="btn btn-sm" onclick={closeEditor}>Cancel</button>
					<button type="submit" class="btn btn-sm btn-primary" disabled={saving}>
						{#if saving}
							<span class="loading loading-sm loading-spinner"></span>
						{/if}
						{isCreating ? 'Create' : 'Save'}
					</button>
				</div>
			</form>
		</div>
		<button class="modal-backdrop" onclick={closeEditor} aria-label="Close modal"></button>
	</div>
{/if}

<!-- Test Result Modal -->
{#if testResult}
	<div class="modal-open modal">
		<div class="modal-box">
			<button
				class="btn absolute top-2 right-2 btn-circle btn-ghost btn-sm"
				onclick={closeTestResult}
			>
				<X size={18} />
			</button>

			<h3 class="mb-4 text-lg font-bold">Test result</h3>

			<div class="space-y-4">
				<div class="flex items-center gap-2">
					{#if testResult.triggered}
						<Check class="text-success" size={20} />
						<span class="font-medium text-success">Triggered</span>
					{:else}
						<X class="text-error" size={20} />
						<span class="font-medium text-error">Not triggered</span>
					{/if}
				</div>

				<div class="rounded-lg bg-base-200 p-4">
					<div class="text-sm font-medium text-base-content/70">Message</div>
					<div class="mt-1">{testResult.message}</div>
				</div>

				{#if Object.keys(testResult.triggerData).length > 0}
					<div class="rounded-lg bg-base-200 p-4">
						<div class="text-sm font-medium text-base-content/70">Trigger data</div>
						<pre class="mt-1 text-xs">{JSON.stringify(testResult.triggerData, null, 2)}</pre>
					</div>
				{/if}
			</div>

			<div class="modal-action">
				<button class="btn" onclick={closeTestResult}>Close</button>
			</div>
		</div>
		<button class="modal-backdrop" onclick={closeTestResult} aria-label="Close modal"></button>
	</div>
{/if}
