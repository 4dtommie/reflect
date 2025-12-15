<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Plus, Pencil, Trash2, AlertCircle, ChevronRight } from 'lucide-svelte';
	import VariableInput from '$lib/components/VariableInput.svelte';

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
		name: string | null;
		description: string | null;
		category: string;
		priority: number;
		trigger: string;
		trigger_params: Record<string, unknown> | null;
		message_template: string;
		icon: string | null;
		action_label: string | null;
		action_href: string | null;
		contexts: string[];
		cooldown_hours: number;
		related_insight_id: string | null;
		is_active: boolean;
		children?: InsightDefinition[];
	}

	let { data } = $props();
	let rawInsights = $state<InsightDefinition[]>(data.insights as unknown as InsightDefinition[]);
	let triggers = $state<TriggerMeta[]>(data.triggers);

	// Filter state
	let filterScope = $state<'all' | 'global' | 'transaction'>('all');

	const categories = ['urgent', 'action', 'insight', 'celebration', 'tip', 'roast'];

	// Derived hierarchical insights (sorted by priority and filtered)
	const hierarchicalInsights = $derived.by(() => {
		let filtered = rawInsights;

		if (filterScope === 'global') {
			filtered = filtered.filter((i) => !i.contexts.includes('transaction_row'));
		} else if (filterScope === 'transaction') {
			filtered = filtered.filter((i) => i.contexts.includes('transaction_row'));
		}

		const roots = filtered.filter((i) => !i.related_insight_id);
		return roots.sort((a, b) => b.priority - a.priority);
	});

	// Category colors for left border indicator
	function getCategoryColor(category: string): string {
		switch (category) {
			case 'urgent':
				return 'border-l-error';
			case 'action':
				return 'border-l-warning';
			case 'insight':
				return 'border-l-info';
			case 'celebration':
				return 'border-l-success';
			case 'tip':
				return 'border-l-base-content/30';
			case 'roast':
				return 'border-l-secondary';
			default:
				return 'border-l-neutral';
		}
	}

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
			case 'roast':
				return 'badge-secondary';
			default:
				return 'badge-neutral';
		}
	}

	// Selected insight for detail view
	let selectedInsightId = $state<string | null>(null);
	let isCreating = $state(false);

	// Form state
	let formId = $state('');
	let formName = $state('');
	let formDescription = $state('');
	let formCategory = $state('insight');
	let formPriority = $state(50);
	let formTrigger = $state('always');
	let formTriggerParams = $state<Record<string, unknown>>({});
	let formMessageTemplate = $state('');
	let formIcon = $state('');
	let formActionLabel = $state('');
	let formActionHref = $state('');
	let formContexts = $state<string[]>(['chat', 'card']);
	let formCooldown = $state(0);
	let formRelatedInsightId = $state('');
	let formIsActive = $state(true);
	let variableInput = $state<VariableInput>();

	// Saving/deleting state
	let saving = $state(false);
	let deleting = $state<string | null>(null);
	let error = $state<string | null>(null);
	let showDeleteConfirm = $state(false);

	// Generate display name from ID if name is not set
	function getDisplayName(insight: InsightDefinition): string {
		if (insight.name) return insight.name;
		return insight.id
			.split('_')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}

	// Get description or generate from template
	function getDisplayDescription(insight: InsightDefinition): string {
		if (insight.description) return insight.description;
		return insight.message_template.replace(/\{\{[^}]+\}\}/g, '...').slice(0, 50) + '...';
	}

	// Get example data for triggers (for live preview)
	function getExampleData(triggerId: string): Record<string, string> {
		// ... (truncated helper for brevity, standard implementation)
		const examples: Record<string, Record<string, string>> = {
			payment_late: { name: 'Netflix', amount: '15.99', daysText: '2 days', daysLate: '2' },
			payment_due_soon: { name: 'Spotify', amount: '9.99', daysText: 'in 3 days', days: '3' },
			uncategorized_high: { percent: '35' },
			same_period_change: { days: '10', percent: '25' },
			complete_month_change: { lastMonth: 'November', twoMonthsAgo: 'October', percent: '15' },
			top_category: { category: 'Restaurants', percent: '32', categoryId: '5' },
			categorization_good_progress: { percent: '75' },
			savings_positive: { amount: '150.00' },
			user_streak: { days: '7' },
			spending_high_early: { percent: '85' },
			salary_detected: { amount: '2500', merchant: 'Acme Corp' },
			large_expense: { amount: '1200', merchant: 'Apple Store' },
			weekend_warrior: { day: 'Friday', merchant: 'Bar' },
			late_night: { time: '02:00', merchant: 'McDonalds' },
			round_number: { amount: '100' },
			duplicate_transaction: { amount: '50.00', merchant: 'Uber', timeAgo: '5 mins' },
			always: {},
			fresh_import: {},
			no_transactions: {},
			review_recurring: {},
			categorization_complete: {},
			user_inactive: {},
			christmas_season: {}
		};
		return examples[triggerId] || {};
	}

	// Render template with example data
	function renderPreview(template: string, triggerId: string): string {
		const data = getExampleData(triggerId);
		return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || `[${key}]`);
	}

	// Computed live preview
	const livePreview = $derived(renderPreview(formMessageTemplate, formTrigger));

	function selectInsight(insight: InsightDefinition) {
		isCreating = false;
		selectedInsightId = insight.id;
		formId = insight.id;
		formName = insight.name ?? '';
		formDescription = insight.description ?? '';
		formCategory = insight.category;
		formPriority = insight.priority;
		formTrigger = insight.trigger;
		formTriggerParams = insight.trigger_params ? { ...insight.trigger_params } : {};
		formMessageTemplate = insight.message_template;
		formIcon = insight.icon ?? '';
		formActionLabel = insight.action_label ?? '';
		formActionHref = insight.action_href ?? '';
		formContexts = [...insight.contexts];
		formCooldown = insight.cooldown_hours ?? 0;
		formRelatedInsightId = insight.related_insight_id ?? '';
		formIsActive = insight.is_active;
		error = null;
	}

	function startCreate() {
		isCreating = true;
		selectedInsightId = null;
		formId = '';
		formName = '';
		formDescription = '';
		formCategory = 'insight';
		formPriority = 50;
		formTrigger = 'always';
		formTriggerParams = {};
		formMessageTemplate = '';
		formIcon = '';
		formActionLabel = '';
		formActionHref = '';
		formContexts = ['chat', 'card'];
		formCooldown = 0;
		formRelatedInsightId = '';
		formIsActive = true;
		error = null;
	}

	function clearSelection() {
		selectedInsightId = null;
		isCreating = false;
		error = null;
	}

	async function handleSave() {
		error = null;
		saving = true;

		try {
			const payload = {
				id: formId,
				name: formName || null,
				description: formDescription || null,
				category: formCategory,
				priority: formPriority,
				trigger: formTrigger,
				trigger_params: Object.keys(formTriggerParams).length > 0 ? formTriggerParams : null,
				message_template: formMessageTemplate,
				icon: formIcon || null,
				action_label: formActionLabel || null,
				action_href: formActionHref || null,
				contexts: formContexts,
				cooldown_hours: formCooldown,
				related_insight_id: formRelatedInsightId || null,
				is_active: formIsActive
			};

			const url = isCreating ? '/api/insights' : `/api/insights/${selectedInsightId}`;
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
			rawInsights = (await (await fetch('/api/insights')).json()).insights;

			if (isCreating) {
				selectedInsightId = formId;
				isCreating = false;
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error';
		} finally {
			saving = false;
		}
	}

	async function confirmDelete() {
		if (!selectedInsightId) return;

		deleting = selectedInsightId;
		showDeleteConfirm = false;
		try {
			const response = await fetch(`/api/insights/${selectedInsightId}`, { method: 'DELETE' });
			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to delete');
			}
			rawInsights = rawInsights.filter((i) => i.id !== selectedInsightId);
			clearSelection();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Delete failed';
		} finally {
			deleting = null;
		}
	}

	async function handleToggleActive(insight: InsightDefinition, e: Event) {
		e.stopPropagation();
		try {
			const response = await fetch(`/api/insights/${insight.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ is_active: !insight.is_active })
			});
			if (!response.ok) throw new Error('Failed to toggle');
			insight.is_active = !insight.is_active;
			rawInsights = [...rawInsights];
			if (selectedInsightId === insight.id) {
				formIsActive = insight.is_active;
			}
		} catch (err) {
			alert('Failed to toggle active state');
		}
	}

	function toggleContext(context: string) {
		if (formContexts.includes(context)) {
			formContexts = formContexts.filter((c) => c !== context);
		} else {
			formContexts = [...formContexts, context];
		}
	}

	const selectedTriggerMeta = $derived(triggers.find((t) => t.id === formTrigger));
	const showDetailPanel = $derived(selectedInsightId !== null || isCreating);
</script>

<svelte:head>
	<title>Insight rules | Reflect</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4">
	<!-- Header -->
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-2xl font-bold">Insight rules</h1>
		<button class="btn gap-2 btn-sm btn-primary" onclick={startCreate}>
			<Plus size={16} />
			Add rule
		</button>
	</div>

	<!-- Master-Detail Layout -->
	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Left: Rules List (1/3) -->
		<div class="lg:col-span-1">
			<div class="rounded-xl border border-base-300 bg-base-100">
				<div class="border-b border-base-300 px-4 py-3">
					<h2 class="text-sm font-semibold text-base-content/70">
						All rules ({rawInsights.length})
					</h2>
				</div>
				<div class="max-h-[calc(100vh-200px)] overflow-y-auto">
					{#each hierarchicalInsights as insight}
						<button
							class="group flex w-full items-center gap-3 border-b border-l-4 border-base-200 px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-base-200/50 {getCategoryColor(
								insight.category
							)} {selectedInsightId === insight.id ? 'bg-primary/10' : ''} {insight.is_active
								? ''
								: 'opacity-50'}"
							onclick={() => selectInsight(insight)}
						>
							<!-- Content -->
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<span class="truncate text-sm font-medium">
										{getDisplayName(insight)}
									</span>
									<span class="badge badge-xs {getCategoryBadgeClass(insight.category)}">
										{insight.category}
									</span>
								</div>
								<div class="mt-0.5 truncate text-xs text-base-content/50">
									{getDisplayDescription(insight)}
								</div>
							</div>

							<!-- Toggle -->
							<input
								type="checkbox"
								class="toggle toggle-success toggle-xs"
								checked={insight.is_active}
								onclick={(e) => handleToggleActive(insight, e)}
							/>

							<!-- Arrow indicator -->
							<ChevronRight
								size={14}
								class="text-base-content/30 {selectedInsightId === insight.id
									? 'text-primary'
									: ''}"
							/>
						</button>
					{/each}

					{#if hierarchicalInsights.length === 0}
						<div class="py-8 text-center text-sm text-base-content/50">No rules yet</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Right: Detail Panel (2/3) -->
		<div class="lg:col-span-2">
			{#if showDetailPanel}
				{#key selectedInsightId}
					<div class="rounded-xl border border-base-300 bg-base-100 p-6">
						<!-- Header with title -->
						<div class="mb-6 flex items-center justify-between">
							<h2 class="text-lg font-bold">
								{isCreating
									? 'Create new rule'
									: getDisplayName(rawInsights.find((i) => i.id === selectedInsightId)!)}
							</h2>
							{#if isCreating}
								<button class="btn btn-ghost btn-sm" onclick={clearSelection}> Cancel </button>
							{/if}
						</div>

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
						>
							<!-- Message Template Section (Full Width at Top) -->
							<div class="space-y-4">
								<!-- Template Editor -->
								<div class="form-control">
									<VariableInput
										bind:this={variableInput}
										bind:value={formMessageTemplate}
										placeholder="Type your message here..."
										availableVariables={selectedTriggerMeta?.templateVars ?? []}
									/>
								</div>

								<!-- Available Variables -->
								{#if selectedTriggerMeta && selectedTriggerMeta.templateVars.length > 0}
									<div class="flex flex-wrap gap-1.5">
										{#each selectedTriggerMeta.templateVars as templateVar}
											<button
												type="button"
												class="badge cursor-pointer border-base-300 bg-base-200 font-mono text-xs transition-colors hover:bg-primary hover:text-primary-content"
												onclick={() => {
													variableInput?.insertVariable(templateVar);
												}}
											>
												{templateVar}
											</button>
										{/each}
									</div>
								{/if}

								<!-- Live Preview -->
								<div class="space-y-2">
									<span class="text-sm text-base-content/60">Preview</span>
									<div class="rounded-lg border border-base-300 bg-base-200/50 p-3 text-sm">
										{#if formMessageTemplate}
											{livePreview}
										{:else}
											<span class="text-base-content/40 italic"
												>Your message will appear here...</span
											>
										{/if}
									</div>
								</div>
							</div>

							<!-- Horizontal Divider -->
							<div class="divider my-6"></div>

							<!-- Main Settings Row: Priority, Category -->
							<div class="grid gap-6 md:grid-cols-2">
								<!-- Priority Slider -->
								<div class="form-control">
									<label class="label py-1" for="insight-priority">
										<span class="label-text">Priority (score)</span>
										<span class="label-text-alt font-mono">{formPriority}</span>
									</label>
									<input
										id="insight-priority"
										type="range"
										class="range range-primary range-sm"
										bind:value={formPriority}
										min="1"
										max="100"
									/>
								</div>

								<!-- Category -->
								<div class="form-control">
									<label class="label py-1" for="insight-category">
										<span class="label-text">Category</span>
									</label>
									<select
										id="insight-category"
										class="select-bordered select w-full"
										bind:value={formCategory}
									>
										{#each categories as cat}
											<option value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
										{/each}
									</select>
								</div>
							</div>

							<!-- Advanced Settings (Everything else) -->
							<div class="collapse-arrow collapse mt-6 rounded-lg bg-base-200/50">
								<input type="checkbox" />
								<div class="collapse-title text-sm font-medium">Advanced settings</div>
								<div class="collapse-content">
									<div class="grid gap-4 pt-4 lg:grid-cols-2">
										<!-- Rule Name -->
										<div class="form-control">
											<label class="label py-1" for="insight-name">
												<span class="label-text text-xs">Rule name</span>
											</label>
											<input
												id="insight-name"
												type="text"
												class="input-bordered input input-sm w-full"
												bind:value={formName}
												placeholder="e.g. Late payment alert"
											/>
										</div>

										<!-- Trigger Selection -->
										<div class="form-control">
											<label class="label py-1" for="insight-trigger">
												<span class="label-text text-xs">Trigger</span>
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
											{#if selectedTriggerMeta}
												<div class="mt-1 text-xs text-base-content/50">
													{selectedTriggerMeta.description}
												</div>
											{/if}
										</div>

										<!-- Description -->
										<div class="form-control lg:col-span-2">
											<label class="label py-1" for="insight-description">
												<span class="label-text text-xs">Description (for list view)</span>
											</label>
											<input
												id="insight-description"
												type="text"
												class="input-bordered input input-sm w-full"
												bind:value={formDescription}
												placeholder="e.g. Triggers when a recurring payment is overdue"
											/>
										</div>

										<!-- ID (only for create) -->
										{#if isCreating}
											<div class="form-control lg:col-span-2">
												<label class="label py-1" for="insight-id">
													<span class="label-text text-xs">ID (unique, snake_case)</span>
												</label>
												<input
													id="insight-id"
													type="text"
													class="input-bordered input input-sm w-full font-mono"
													bind:value={formId}
													placeholder="e.g. my_custom_insight"
													required
												/>
											</div>
										{/if}

										<!-- Trigger Parameters -->
										{#if selectedTriggerMeta && selectedTriggerMeta.params.length > 0}
											<div class="form-control lg:col-span-2">
												<label class="label py-1">
													<span class="label-text text-xs">Trigger parameters</span>
												</label>
												<div
													class="grid gap-2 rounded-lg border border-base-300 bg-base-100 p-3 md:grid-cols-2"
												>
													{#each selectedTriggerMeta.params as param}
														<div class="form-control">
															<label class="label py-0.5" for="param-{param.name}">
																<span class="label-text text-xs">{param.name}</span>
																{#if param.description}
																	<span class="label-text-alt text-xs text-base-content/50"
																		>{param.description}</span
																	>
																{/if}
															</label>
															{#if param.type === 'number'}
																<input
																	id="param-{param.name}"
																	type="number"
																	class="input-bordered input input-sm w-full"
																	bind:value={formTriggerParams[param.name]}
																	placeholder={String(param.default ?? '')}
																/>
															{:else if param.type === 'boolean'}
																<input
																	id="param-{param.name}"
																	type="checkbox"
																	class="toggle toggle-primary toggle-sm"
																	bind:checked={formTriggerParams[param.name]}
																/>
															{:else}
																<input
																	id="param-{param.name}"
																	type="text"
																	class="input-bordered input input-sm w-full"
																	bind:value={formTriggerParams[param.name]}
																	placeholder={String(param.default ?? '')}
																/>
															{/if}
														</div>
													{/each}
												</div>
											</div>
										{/if}

										<!-- Action Button -->
										<div class="form-control">
											<label class="label py-1">
												<span class="label-text text-xs">Action button label</span>
											</label>
											<input
												type="text"
												class="input-bordered input input-sm w-full"
												bind:value={formActionLabel}
												placeholder="e.g. View details"
											/>
										</div>

										<div class="form-control">
											<label class="label py-1">
												<span class="label-text text-xs">Action button link</span>
											</label>
											<input
												type="text"
												class="input-bordered input input-sm w-full"
												bind:value={formActionHref}
												placeholder="e.g. /transactions"
											/>
										</div>

										<!-- Cooldown -->
										<div class="form-control">
											<label class="label py-1" for="insight-cooldown">
												<span class="label-text text-xs">Cooldown (hours)</span>
												<span class="label-text-alt text-xs text-base-content/50"
													>0 = always show</span
												>
											</label>
											<input
												id="insight-cooldown"
												type="number"
												class="input-bordered input input-sm w-full"
												bind:value={formCooldown}
												min="0"
											/>
										</div>

										<!-- Display Contexts -->
										<div class="form-control">
											<label class="label py-1">
												<span class="label-text text-xs">Show in</span>
											</label>
											<div class="flex flex-wrap gap-4">
												{#each ['chat', 'card', 'widget'] as ctx}
													<label class="label cursor-pointer justify-start gap-2">
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

										<!-- Related Insight -->
										<div class="form-control lg:col-span-2">
											<label class="label py-1" for="insight-related">
												<span class="label-text text-xs">Related to (parent insight)</span>
											</label>
											<select
												id="insight-related"
												class="select-bordered select w-full select-sm"
												bind:value={formRelatedInsightId}
											>
												<option value="">None</option>
												{#each rawInsights as insight}
													{#if insight.id !== formId}
														<option value={insight.id}>{insight.id} ({insight.category})</option>
													{/if}
												{/each}
											</select>
										</div>
									</div>
								</div>
							</div>

							<!-- Action Buttons -->
							<div class="mt-6 flex justify-between">
								{#if !isCreating}
									<button
										type="button"
										class="btn gap-1 text-error btn-ghost"
										onclick={() => (showDeleteConfirm = true)}
									>
										<Trash2 size={16} />
										Delete
									</button>
								{:else}
									<div></div>
								{/if}
								<button type="submit" class="btn btn-primary" disabled={saving}>
									{#if saving}
										<span class="loading loading-sm loading-spinner"></span>
									{/if}
									{isCreating ? 'Create rule' : 'Save changes'}
								</button>
							</div>
						</form>
					</div>
				{/key}
			{:else}
				<!-- Empty State -->
				<div
					class="flex h-96 items-center justify-center rounded-xl border border-dashed border-base-300 bg-base-100/50"
				>
					<div class="text-center">
						<Pencil size={32} class="mx-auto mb-3 text-base-content/30" />
						<p class="text-base-content/50">Select a rule to edit</p>
						<p class="mt-1 text-sm text-base-content/30">or create a new one</p>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirm}
	<div class="modal-open modal">
		<div class="modal-box">
			<h3 class="text-lg font-bold">Delete this rule?</h3>
			<p class="py-4 text-base-content/70">
				Are you sure you want to delete <strong>{selectedInsightId}</strong>? This action cannot be
				undone.
			</p>
			<div class="modal-action">
				<button class="btn" onclick={() => (showDeleteConfirm = false)}>Cancel</button>
				<button class="btn btn-error" onclick={confirmDelete} disabled={deleting !== null}>
					{#if deleting}
						<span class="loading loading-sm loading-spinner"></span>
					{/if}
					Delete
				</button>
			</div>
		</div>
		<button
			class="modal-backdrop"
			onclick={() => (showDeleteConfirm = false)}
			aria-label="Close modal"
		></button>
	</div>
{/if}
