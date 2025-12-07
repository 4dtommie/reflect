<script lang="ts">
	import DashboardWidget from '$lib/components/DashboardWidget.svelte';
	import Amount from '$lib/components/Amount.svelte';
	import { fade } from 'svelte/transition';
	import { Settings, List, Activity, Play, ShoppingCart, Check } from 'lucide-svelte';
	import RecurringExpenseItem from './RecurringExpenseItem.svelte';
	import VariableSpendingItem from '$lib/components/VariableSpendingItem.svelte';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	const subtitles = [
		'Elementary, my dear user.',
		'Searching for clues in your bank statement...',
		'The game is afoot!',
		'Unmasking those hidden subscriptions.',
		'Investigating your recurring payments.',
		'Sherlock Holmes would be proud.',
		'Tracking down those pesky monthly charges.',
		'Magnifying glass ready!',
		'No subscription can hide from us.',
		'Solving the mystery of where your money goes.'
	];

	const randomSubtitle = subtitles[Math.floor(Math.random() * subtitles.length)];

	let candidates: any[] = $state([]);
	let variablePatterns: any[] = $state([]);
	let variableStats: any = $state(null);
	let loading = $state(false);
	let savingVariable = $state(false);
	let variableSaved = $state(false);
	let hasSearched = $state(false);

	const incomeCandidates = $derived.by(() =>
		candidates.filter((candidate) => ['salary', 'tax', 'transfer'].includes(candidate.type))
	);
	const expenseCandidates = $derived.by(() =>
		candidates.filter((candidate) => !['salary', 'tax', 'transfer'].includes(candidate.type))
	);

	async function startDetection() {
		loading = true;
		hasSearched = true;
		variableSaved = false;
		try {
			// Run both detection in parallel
			const [recurringRes, variableRes] = await Promise.all([
				fetch('/api/recurring/detect', { method: 'POST' }),
				fetch('/api/variable-spending/detect', { method: 'POST' })
			]);

			if (recurringRes.ok) {
				const data = await recurringRes.json();
				candidates = data.candidates;
			}

			if (variableRes.ok) {
				const data = await variableRes.json();
				variablePatterns = data.patterns || [];
				variableStats = data.stats || null;

				// Auto-save variable spending patterns
				if (variablePatterns.length > 0) {
					await saveVariableSpending();
				}
			}
		} catch (e) {
			console.error(e);
		} finally {
			loading = false;
		}
	}

	async function saveVariableSpending() {
		if (variablePatterns.length === 0) return;

		savingVariable = true;
		console.log('[DetectPage] Saving variable spending patterns:', variablePatterns.length);
		try {
			const res = await fetch('/api/variable-spending', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ patterns: variablePatterns })
			});

			const data = await res.json();
			console.log('[DetectPage] Save response:', data);

			if (res.ok) {
				variableSaved = true;
			} else {
				console.error('[DetectPage] Save failed:', data);
			}
		} catch (e) {
			console.error('[DetectPage] Save error:', e);
		} finally {
			savingVariable = false;
		}
	}

	// Auto-start detection if ?autostart=true
	onMount(() => {
		console.log('[DetectPage] onMount, autostart:', $page.url.searchParams.get('autostart'));
		if ($page.url.searchParams.get('autostart') === 'true') {
			startDetection();
		}
	});
</script>

<div class="flex flex-col gap-8 p-4">
	<div class={`grid grid-cols-1 gap-8 ${candidates.length > 0 ? 'lg:grid-cols-[2fr_1fr]' : ''}`}>
		<DashboardWidget size="small">
			<div class="flex h-full flex-col justify-center px-6 pt-3 pb-6">
				<h1 class="mb-4 text-7xl font-bold">Spending pattern detective 🕵️</h1>
				<p class="text-2xl opacity-70">
					{randomSubtitle}
				</p>
			</div>
		</DashboardWidget>
		{#if candidates.length > 0}
			<DashboardWidget size="small" title="Detection summary">
				<div class="flex h-full flex-col justify-center gap-4">
					<div class="grid grid-cols-2 gap-4">
						<div class="stat p-0">
							<div class="stat-title">Monthly Fixed</div>
							<div class="stat-value text-error">
								{Math.abs(
									expenseCandidates.reduce(
										(sum, c) => sum + (c.interval === 'monthly' ? Number(c.amount) : 0),
										0
									)
								).toFixed(0)}
							</div>
							<div class="stat-desc">Estimated costs</div>
						</div>
						<div class="stat p-0">
							<div class="stat-title">Monthly Income</div>
							<div class="stat-value text-success">
								{incomeCandidates
									.reduce((sum, c) => sum + (c.interval === 'monthly' ? Number(c.amount) : 0), 0)
									.toFixed(0)}
							</div>
							<div class="stat-desc">Estimated income</div>
						</div>
					</div>
				</div>
			</DashboardWidget>
		{/if}
	</div>

	{#if !hasSearched}
		<DashboardWidget size="wide">
			<div class="flex h-full flex-col items-center justify-center py-12 text-center">
				<div class="mb-6 rounded-full bg-primary/10 p-6">
					<Settings size={48} class="text-primary" />
				</div>
				<h2 class="mb-2 text-2xl font-bold">Ready to investigate?</h2>
				<p class="mb-8 max-w-md opacity-70">
					We'll scan your transaction history for subscriptions, bills, and salary patterns.
				</p>
				<button class="btn btn-lg btn-primary" onclick={startDetection}>
					<Play class="mr-2 h-5 w-5" />
					Start Investigation
				</button>
			</div>
		</DashboardWidget>
	{:else if loading}
		<DashboardWidget size="wide">
			<div class="flex h-full flex-col items-center justify-center py-12 text-center">
				<span class="loading mb-4 loading-lg loading-spinner text-primary"></span>
				<h2 class="animate-pulse text-xl font-semibold">Scanning transactions...</h2>
				<p class="opacity-70">Looking for patterns and known providers</p>
			</div>
		</DashboardWidget>
	{:else if candidates.length > 0 || variablePatterns.length > 0}
		<div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
			<div class="flex flex-col gap-8">
				<DashboardWidget size="large" title="Recurring expenses">
					<div class="flex h-full flex-col justify-start">
						{#if expenseCandidates.length > 0}
							<div class="space-y-3">
								{#each expenseCandidates as candidate (candidate.name)}
									<RecurringExpenseItem {candidate} />
								{/each}
							</div>
						{:else}
							<p class="text-center text-sm opacity-70">
								No expense-like recurring payments yet. Run detection again later.
							</p>
						{/if}
					</div>
				</DashboardWidget>
			</div>
			<div class="flex flex-col gap-8">
				<DashboardWidget size="large" title="Recurring income">
					<div class="flex h-full flex-col justify-start">
						{#if incomeCandidates.length > 0}
							<div class="space-y-3">
								{#each incomeCandidates as income (income.name)}
									<RecurringExpenseItem candidate={income} />
								{/each}
							</div>
						{:else}
							<p class="text-center text-sm opacity-70">
								No recurring income detected yet. Upload more income transactions to see them here.
							</p>
						{/if}
					</div>
				</DashboardWidget>
			</div>
		</div>

		<!-- Variable spending section -->
		{#if variablePatterns.length > 0}
			<DashboardWidget size="wide" enableHover={false}>
				<div class="mb-4 flex items-center justify-between">
					<div class="flex items-center gap-3">
						<div class="rounded-full bg-warning/10 p-2">
							<ShoppingCart size={20} class="text-warning" />
						</div>
						<div>
							<h2 class="text-xl font-bold">Variable spending</h2>
							<p class="text-sm opacity-60">
								{variablePatterns.length} spending categor{variablePatterns.length !== 1
									? 'ies'
									: 'y'}
							</p>
						</div>
					</div>
					<div class="flex items-center gap-4">
						<div class="text-right">
							<p class="text-xs tracking-wide uppercase opacity-50">Monthly avg</p>
							<p class="text-xl font-bold text-warning">
								<Amount
									value={variableStats?.totalMonthlyAverage || 0}
									size="large"
									showDecimals={false}
									isDebit={true}
								/>
							</p>
						</div>
						{#if variableSaved}
							<div class="flex items-center gap-2 text-success">
								<Check size={18} />
								<span class="text-sm font-medium">Saved</span>
							</div>
						{:else if savingVariable}
							<span class="loading loading-sm loading-spinner text-primary"></span>
						{/if}
					</div>
				</div>

				<div class="space-y-3">
					{#each variablePatterns as pattern (pattern.categoryName)}
						<VariableSpendingItem {pattern} />
					{/each}
				</div>
			</DashboardWidget>
		{/if}
	{:else}
		<DashboardWidget size="wide">
			<div class="flex h-full flex-col items-center justify-center py-12 text-center">
				<h2 class="text-xl font-semibold">No recurring transactions found</h2>
				<p class="opacity-70">We couldn't find any clear patterns in your history.</p>
				<button class="btn mt-4 btn-ghost" onclick={() => (hasSearched = false)}>Try Again</button>
			</div>
		</DashboardWidget>
	{/if}
</div>
