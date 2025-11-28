<script lang="ts">
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';
	import { Loader2, AlertCircle, CheckCircle } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	let processing = $state(false);
	let error = $state<string | null>(null);
	let progress = $state<{
		processed: number;
		total: number;
		categorized: number;
		skipped: number;
		notCategorized: number;
		message?: string;
	} | null>(null);
	let completed = $state(false);
	let eventSource: EventSource | null = $state(null);
	let startTime = $state<number | null>(null);
	let duration = $state<number | null>(null);

	async function startCategorization() {
		processing = true;
		error = null;
		progress = null;
		completed = false;
		startTime = Date.now();
		duration = null;

		try {
			console.log('🚀 Starting categorization...');

			// Use fetch with streaming for SSE
			const response = await fetch('/api/transactions/categorize/stream', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({})
			});

			if (!response.ok) {
				throw new Error('Failed to start categorization');
			}

			const reader = response.body?.getReader();
			const decoder = new TextDecoder();

			if (!reader) {
				throw new Error('No response body');
			}

			let buffer = '';

			while (true) {
				const { done, value } = await reader.read();

				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n');
				buffer = lines.pop() || '';

				for (const line of lines) {
					if (line.startsWith('data: ')) {
						try {
							const data = JSON.parse(line.slice(6));

							if (data.type === 'progress') {
								progress = {
									processed: data.processed,
									total: data.total,
									categorized: data.categorized,
									skipped: data.skipped,
									notCategorized: data.notCategorized,
									message: data.message
								};
							} else if (data.type === 'complete') {
								progress = {
									processed: data.processed,
									total: data.total,
									categorized: data.categorized,
									skipped: data.skipped,
									notCategorized: data.notCategorized,
									message: data.message
								};
								completed = true;
								if (startTime) {
									duration = Date.now() - startTime;
								}
								// Invalidate transactions to refresh the list
								await invalidateAll();
							} else if (data.type === 'error') {
								throw new Error(data.error || 'Categorization failed');
							}
						} catch (err) {
							console.error('Error parsing SSE message:', err);
						}
					}
				}
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to categorize transactions';
			console.error('❌ Categorization error:', err);
		} finally {
			processing = false;
		}
	}
</script>

<h1 class="text-4xl font-bold mb-6">Categorize transactions</h1>

<p class="text-lg mb-8">
	Automatically categorize your transactions using keyword matching and AI classification. 
	You can manage categories and keywords in the <a href="/categories" class="link link-primary">category settings</a>.
</p>

{#if error}
	<div class="alert alert-error mb-6">
		<AlertCircle size={20} />
		<span>{error}</span>
	</div>
{/if}

{#if progress}
	<div class="card bg-base-100 mb-6">
		<div class="card-body p-0">
			<h2 class="card-title px-0 pt-6">Progress</h2>
			
			{#if progress.message}
				<p class="text-base-content/70 mb-4 px-0">{progress.message}</p>
			{/if}

			<!-- Progress bar -->
			<div class="w-full px-0 mb-4">
				<div class="flex justify-between text-sm mb-2">
					<span>Processing transactions...</span>
					<span>{progress.processed} / {progress.total}</span>
				</div>
				<progress
					class="progress progress-primary w-full"
					value={progress.processed}
					max={progress.total}
				></progress>
			</div>

			<!-- Stats -->
			<div class="stats stats-horizontal shadow w-full my-0">
				<div class="stat py-0 px-4">
					<div class="stat-title">Categorized</div>
					<div class="stat-value text-success text-2xl">{progress.categorized}</div>
				</div>
				<div class="stat py-0 px-4">
					<div class="stat-title">AI categorized</div>
					<div class="stat-value text-primary text-2xl">0</div>
				</div>
				<div class="stat py-0 px-4">
					<div class="stat-title">Skipped</div>
					<div class="stat-value text-warning text-2xl">{progress.skipped}</div>
				</div>
				<div class="stat py-0 px-4">
					<div class="stat-title">Not categorized</div>
					<div class="stat-value text-error text-2xl">{progress.notCategorized}</div>
				</div>
			</div>

			{#if completed}
				<div class="alert alert-success mx-0 mb-6 mt-4">
					<CheckCircle size={20} />
					<span>
						Categorization complete!
						{#if duration !== null}
							{@const seconds = (duration / 1000).toFixed(1)}
							{@const minutes = Math.floor(duration / 60000)}
							{@const remainingSeconds = ((duration % 60000) / 1000).toFixed(1)}
							{@const timeText = minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${seconds}s`}
							<span class="ml-2 opacity-80">(took {timeText})</span>
						{/if}
					</span>
				</div>
			{/if}
		</div>
	</div>
{/if}

<button
	class="btn btn-primary"
	onclick={startCategorization}
	disabled={processing}
>
	{#if processing}
		<Loader2 size={20} class="animate-spin" />
		Processing...
	{:else}
		Start categorization
	{/if}
</button>
