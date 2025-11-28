<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { LoaderCircle, CheckCircle, XCircle, ArrowLeft, RefreshCw } from 'lucide-svelte';
	import type { ParseResult } from '$lib/utils/csvParser';
	import type { ColumnMapping } from '$lib/utils/transactionMapper';

	interface ImportResult {
		success: boolean;
		imported: number;
		skipped: number;
		errors: Array<{
			row: number;
			field?: string;
			message: string;
		}>;
		duplicates: number;
		fuzzyMatchingJobId?: string;
	}

	interface FuzzyMatchingProgress {
		jobId: string;
		userId: number;
		status: 'pending' | 'processing' | 'completed' | 'failed';
		total: number;
		processed: number;
		matched: number;
		startedAt: string | null;
		completedAt: string | null;
		error?: string;
	}

	let parseResult: ParseResult | null = $state(null);
	let mapping: ColumnMapping | null = $state(null);
	let importing = $state(false);
	let importResult: ImportResult | null = $state(null);
	let error: string | null = $state(null);
	let fuzzyProgress: FuzzyMatchingProgress | null = $state(null);
	let fuzzyProgressInterval: ReturnType<typeof setInterval> | null = $state(null);

	onMount(() => {
		// Retrieve parsed CSV data and mapping from sessionStorage
		const storedParseResult = sessionStorage.getItem('csv_parse_result');
		const storedMapping = sessionStorage.getItem('csv_column_mapping');

		if (!storedParseResult || !storedMapping) {
			error = 'No CSV data or mapping found. Please go back and complete the mapping.';
			return;
		}

		try {
			parseResult = JSON.parse(storedParseResult);
			mapping = JSON.parse(storedMapping);

			// Start import automatically
			handleImport();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load CSV data';
		}
	});

	async function handleImport() {
		if (!parseResult || !mapping) return;

		importing = true;
		error = null;
		importResult = null;

		try {
			const response = await fetch('/api/transactions', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					rows: parseResult.rows,
					headers: parseResult.headers,
					mapping: mapping,
					options: {
						skipDuplicates: true
					}
				})
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to import transactions');
			}

			importResult = data;

			// Start polling fuzzy matching progress if job ID is provided
			if (data.fuzzyMatchingJobId) {
				startFuzzyProgressPolling(data.fuzzyMatchingJobId);
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to import transactions';
		} finally {
			importing = false;
		}
	}

	async function fetchFuzzyProgress(jobId: string) {
		try {
			const response = await fetch(`/api/fuzzy-matching/${jobId}`);
			if (!response.ok) {
				throw new Error('Failed to fetch progress');
			}
			const progress = await response.json();
			fuzzyProgress = progress;

			// Stop polling if completed or failed
			if (progress.status === 'completed' || progress.status === 'failed') {
				if (fuzzyProgressInterval) {
					clearInterval(fuzzyProgressInterval);
					fuzzyProgressInterval = null;
				}
			}
		} catch (err) {
			console.error('Failed to fetch fuzzy matching progress:', err);
		}
	}

	function startFuzzyProgressPolling(jobId: string) {
		// Fetch immediately
		fetchFuzzyProgress(jobId);

		// Then poll every 2 seconds
		fuzzyProgressInterval = setInterval(() => {
			fetchFuzzyProgress(jobId);
		}, 2000);
	}

	function stopFuzzyProgressPolling() {
		if (fuzzyProgressInterval) {
			clearInterval(fuzzyProgressInterval);
			fuzzyProgressInterval = null;
		}
	}

	function goBack() {
		goto('/upload-transactions/map');
	}

	function startOver() {
		// Clear all stored data
		sessionStorage.removeItem('csv_upload_file');
		sessionStorage.removeItem('csv_upload_filename');
		sessionStorage.removeItem('csv_parse_result');
		sessionStorage.removeItem('csv_column_mapping');
		goto('/upload-transactions');
	}
</script>

<h1 class="text-4xl font-bold mb-6">Import transactions</h1>

{#if error}
	<div class="alert alert-error mb-6">
		<XCircle class="h-6 w-6" />
		<span>{error}</span>
	</div>
	<div class="flex gap-4">
		<button class="btn btn-ghost" onclick={goBack}>
			<ArrowLeft class="h-4 w-4" />
			Go Back
		</button>
		<button class="btn btn-primary" onclick={startOver}>Start Over</button>
	</div>
{:else if importing}
	<div class="flex flex-col items-center justify-center py-12">
		<LoaderCircle class="h-12 w-12 animate-spin text-primary mb-4" />
		<p class="text-lg font-medium mb-2">Importing transactions...</p>
		<p class="text-sm text-base-content/70">
			{parseResult?.rows.length || 0} transactions being processed
		</p>
	</div>
{:else if importResult}
	<div class="space-y-6">
		<!-- Import Summary -->
		<fieldset class="fieldset bg-base-100 border-base-300 rounded-box border p-6">
			<legend class="fieldset-legend">
				{#if importResult.success}
					<span class="text-success">Import Complete</span>
				{:else}
					<span class="text-error">Import Failed</span>
				{/if}
			</legend>

			<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
				<div>
					<p class="text-sm text-base-content/70">Imported</p>
					<p class="font-semibold text-success text-2xl">{importResult.imported}</p>
				</div>
				<div>
					<p class="text-sm text-base-content/70">Skipped (duplicates)</p>
					<p class="font-semibold text-warning text-2xl">{importResult.duplicates}</p>
				</div>
				<div>
					<p class="text-sm text-base-content/70">Errors</p>
					<p class="font-semibold text-error text-2xl">{importResult.errors.length}</p>
				</div>
				<div>
					<p class="text-sm text-base-content/70">Total processed</p>
					<p class="font-semibold text-2xl">
						{importResult.imported + importResult.skipped + importResult.errors.length}
					</p>
				</div>
			</div>
		</fieldset>

		<!-- Success Message -->
		{#if importResult.success && importResult.imported > 0}
			<div class="alert alert-success">
				<CheckCircle class="h-6 w-6" />
				<div>
					<p class="font-semibold">Successfully imported {importResult.imported} transaction(s)!</p>
					{#if importResult.duplicates > 0}
						<p class="text-sm mt-1">
							{importResult.duplicates} duplicate transaction(s) were skipped.
						</p>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Fuzzy Matching Progress -->
		{#if importResult.fuzzyMatchingJobId && fuzzyProgress}
			<fieldset class="fieldset bg-base-100 border-base-300 rounded-box border p-6">
				<legend class="fieldset-legend">Fuzzy matching progress</legend>
				
				{#if fuzzyProgress.status === 'processing' || fuzzyProgress.status === 'pending'}
					<div class="space-y-4">
						<div class="flex items-center gap-4">
							<LoaderCircle class="h-6 w-6 animate-spin text-primary" />
							<div class="flex-1">
								<p class="font-semibold">Matching merchant names...</p>
								<p class="text-sm text-base-content/70">
									Processed {fuzzyProgress.processed} of {fuzzyProgress.total} transactions
								</p>
							</div>
						</div>
						<div class="w-full bg-base-200 rounded-full h-2">
							<div
								class="bg-primary h-2 rounded-full transition-all duration-300"
								style="width: {fuzzyProgress.total > 0 ? (fuzzyProgress.processed / fuzzyProgress.total) * 100 : 0}%"
							></div>
						</div>
						<div class="flex gap-6 text-sm">
							<div>
								<span class="text-base-content/70">Matched:</span>
								<span class="font-semibold ml-2">{fuzzyProgress.matched}</span>
							</div>
							<div>
								<span class="text-base-content/70">Remaining:</span>
								<span class="font-semibold ml-2">{fuzzyProgress.total - fuzzyProgress.processed}</span>
							</div>
						</div>
					</div>
				{:else if fuzzyProgress.status === 'completed'}
					<div class="alert alert-success">
						<CheckCircle class="h-6 w-6" />
						<div>
							<p class="font-semibold">Fuzzy matching completed!</p>
							<p class="text-sm mt-1">
								Matched {fuzzyProgress.matched} of {fuzzyProgress.total} merchant names.
							</p>
						</div>
					</div>
				{:else if fuzzyProgress.status === 'failed'}
					<div class="alert alert-error">
						<XCircle class="h-6 w-6" />
						<div>
							<p class="font-semibold">Fuzzy matching failed</p>
							{#if fuzzyProgress.error}
								<p class="text-sm mt-1">{fuzzyProgress.error}</p>
							{/if}
						</div>
					</div>
				{/if}
			</fieldset>
		{/if}

		<!-- Errors -->
		{#if importResult.errors.length > 0}
			<fieldset class="fieldset bg-error/10 border-error rounded-box border p-6">
				<legend class="fieldset-legend text-error">Errors ({importResult.errors.length})</legend>
				
				<div class="max-h-96 overflow-y-auto">
					<table class="table table-zebra w-full text-sm">
						<thead>
							<tr>
								<th>Row</th>
								<th>Field</th>
								<th>Error</th>
							</tr>
						</thead>
						<tbody>
							{#each importResult.errors.slice(0, 100) as err}
								<tr>
									<td class="font-mono">{err.row || 'N/A'}</td>
									<td>{err.field || '—'}</td>
									<td class="text-error">{err.message}</td>
								</tr>
							{/each}
						</tbody>
					</table>
					{#if importResult.errors.length > 100}
						<p class="text-sm text-base-content/70 mt-2">
							Showing first 100 of {importResult.errors.length} errors
						</p>
					{/if}
				</div>
			</fieldset>
		{/if}

		<!-- Actions -->
		<div class="flex gap-4">
			{#if importResult.success}
				<a href="/transactions" class="btn btn-primary">
					View Transactions
				</a>
				<button class="btn btn-ghost" onclick={startOver}>
					<RefreshCw class="h-4 w-4" />
					Upload Another File
				</button>
			{:else}
				<button class="btn btn-ghost" onclick={goBack}>
					<ArrowLeft class="h-4 w-4" />
					Go Back to Mapping
				</button>
				<button class="btn btn-primary" onclick={handleImport}>
					<RefreshCw class="h-4 w-4" />
					Retry Import
				</button>
			{/if}
		</div>
	</div>
{:else}
	<div class="alert alert-info">
		<p>Preparing to import transactions...</p>
	</div>
{/if}

