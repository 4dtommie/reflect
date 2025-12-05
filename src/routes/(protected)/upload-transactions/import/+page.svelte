<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { LoaderCircle, CheckCircle, XCircle, ArrowLeft, RefreshCw } from 'lucide-svelte';
	import type { ParseResult } from '$lib/utils/csvParser';
	import type { ColumnMapping } from '$lib/utils/transactionMapper';
	import DashboardWidget from '$lib/components/DashboardWidget.svelte';
	import StatItem from '$lib/components/StatItem.svelte';

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
	}

	let parseResult: ParseResult | null = $state(null);
	let mapping: ColumnMapping | null = $state(null);
	let importing = $state(false);
	let importResult: ImportResult | null = $state(null);
	let error: string | null = $state(null);

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

			// On success, redirect to dashboard with import message
			if (data.success && data.imported > 0) {
				// Clear upload session data
				sessionStorage.removeItem('csv_upload_file');
				sessionStorage.removeItem('csv_upload_filename');
				sessionStorage.removeItem('csv_parse_result');
				sessionStorage.removeItem('csv_column_mapping');

				// Redirect to dashboard - insight engine will show fresh_import message
				await goto('/');
				return;
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to import transactions';
		} finally {
			importing = false;
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

	const totalProcessed = $derived.by(() => {
		if (!importResult) return 0;
		return importResult.imported + importResult.skipped + importResult.errors.length;
	});
</script>

<div class="grid grid-cols-1 gap-8 p-4 md:grid-cols-2 lg:grid-cols-3">
	<!-- Title Widget -->
	<DashboardWidget size="wide">
		<div class="flex h-full flex-col justify-center px-6 pt-3 pb-6">
			<h1 class="mb-4 text-7xl font-bold">Import transactions</h1>
			<p class="text-2xl opacity-70">
				{#if importing}
					Importing your transactions...
				{:else if importResult}
					{#if importResult.success}
						Import completed successfully!
					{:else}
						Import completed with errors.
					{/if}
				{:else}
					Processing your CSV file.
				{/if}
			</p>
		</div>
	</DashboardWidget>

	{#if error}
		<DashboardWidget size="wide">
			<div class="flex h-full flex-col justify-center px-6 pt-3 pb-6">
				<div class="alert alert-error">
					<XCircle class="h-6 w-6" />
					<span>{error}</span>
				</div>
				<div class="mt-4 flex gap-4">
					<button class="btn btn-ghost" onclick={goBack}>
						<ArrowLeft class="h-4 w-4" />
						Go Back
					</button>
					<button class="btn btn-primary" onclick={startOver}>Start Over</button>
				</div>
			</div>
		</DashboardWidget>
	{:else if importing}
		<DashboardWidget size="wide">
			<div class="flex h-full flex-col items-center justify-center px-6 pt-3 pb-6">
				<LoaderCircle class="mb-4 h-12 w-12 animate-spin text-primary" />
				<p class="mb-2 text-lg font-medium">Importing transactions...</p>
				<p class="text-sm text-base-content/70">
					{parseResult?.rows.length || 0} transactions being processed
				</p>
			</div>
		</DashboardWidget>
	{:else if importResult}
		<!-- Import Summary -->
		<DashboardWidget size="small" title="Import summary">
			<div class="flex h-full flex-col justify-center">
				<div class="mb-4 grid grid-cols-2 gap-4">
					<StatItem label="Imported" value={importResult.imported} color="text-success" />
					<StatItem
						label="Skipped (duplicates)"
						value={importResult.duplicates}
						color="text-warning"
					/>
					<StatItem label="Errors" value={importResult.errors.length} color="text-error" />
					<StatItem label="Total processed" value={totalProcessed} />
				</div>

				{#if importResult.success}
					<a href="/transactions" class="btn btn-primary">
						<CheckCircle class="h-4 w-4" />
						View Transactions
					</a>
				{:else}
					<button class="btn btn-primary" onclick={handleImport}>
						<RefreshCw class="h-4 w-4" />
						Retry Import
					</button>
				{/if}
			</div>
		</DashboardWidget>

		<!-- Success Message -->
		{#if importResult.success && importResult.imported > 0}
			<DashboardWidget size="fullB" title="Success">
				<div class="flex h-full flex-col justify-center">
					<div class="alert alert-success">
						<CheckCircle class="h-6 w-6" />
						<div>
							<p class="font-semibold">
								Successfully imported {importResult.imported} transaction(s)!
							</p>
							{#if importResult.duplicates > 0}
								<p class="mt-1 text-sm">
									{importResult.duplicates} duplicate transaction(s) were skipped.
								</p>
							{/if}
						</div>
					</div>
					<button class="btn mt-4 btn-ghost" onclick={startOver}>
						<RefreshCw class="h-4 w-4" />
						Upload Another File
					</button>
				</div>
			</DashboardWidget>
		{/if}

		<!-- Errors -->
		{#if importResult.errors.length > 0}
			<DashboardWidget size="full" title="Errors ({importResult.errors.length})">
				<div class="flex h-full flex-col justify-center">
					<div class="max-h-96 overflow-y-auto">
						<table class="table w-full table-zebra text-sm">
							<thead>
								<tr>
									<th>Row</th>
									<th>Field</th>
									<th>Error</th>
								</tr>
							</thead>
							<tbody>
								{#each importResult.errors.slice(0, 100) as err, index}
									<tr>
										<td>{err.row || 'N/A'}</td>
										<td>{err.field || '—'}</td>
										<td class="text-error">{err.message}</td>
									</tr>
								{/each}
							</tbody>
						</table>
						{#if importResult.errors.length > 100}
							<p class="mt-2 text-sm text-base-content/70">
								Showing first 100 of {importResult.errors.length} errors
							</p>
						{/if}
					</div>
					{#if !importResult.success}
						<div class="mt-4 flex gap-4">
							<button class="btn btn-ghost" onclick={goBack}>
								<ArrowLeft class="h-4 w-4" />
								Go Back to Mapping
							</button>
						</div>
					{/if}
				</div>
			</DashboardWidget>
		{/if}
	{:else}
		<DashboardWidget size="wide">
			<div class="flex h-full flex-col justify-center px-6 pt-3 pb-6">
				<div class="alert alert-info">
					<p>Preparing to import transactions...</p>
				</div>
			</div>
		</DashboardWidget>
	{/if}
</div>
