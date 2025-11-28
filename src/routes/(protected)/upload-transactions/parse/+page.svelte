<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { parseCSVFile, type ParseResult } from '$lib/utils/csvParser';
	import { LoaderCircle, ArrowLeft } from 'lucide-svelte';

	let file: File | null = $state(null);
	let parseResult: ParseResult | null = $state(null);
	let parsing = $state(false);
	let error = $state<string | null>(null);

	onMount(() => {
		// Retrieve file from sessionStorage
		const fileData = sessionStorage.getItem('csv_upload_file');
		const fileName = sessionStorage.getItem('csv_upload_filename');
		
		if (!fileData || !fileName) {
			error = 'No file found. Please go back and select a file.';
			return;
		}

		// Reconstruct File object from stored data
		// Note: For large files, we'd need a different approach
		// For now, we'll read the text directly
		try {
			// Parse the stored data
			const text = fileData;
			
			// Create a Blob and then File from it
			const blob = new Blob([text], { type: 'text/csv' });
			file = new File([blob], fileName, { type: 'text/csv' });
			
			// Start parsing
			handleParse();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load file';
		}
	});

	async function handleParse() {
		if (!file) return;
		
		parsing = true;
		error = null;
		parseResult = null;

		try {
			const result = await parseCSVFile(file);
			parseResult = result;
			
			// Store parse result in sessionStorage for mapping page
			sessionStorage.setItem('csv_parse_result', JSON.stringify(result));
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to parse CSV file';
		} finally {
			parsing = false;
		}
	}

	function goBack() {
		sessionStorage.removeItem('csv_upload_file');
		sessionStorage.removeItem('csv_upload_filename');
		sessionStorage.removeItem('csv_parse_result');
		goto('/upload-transactions');
	}

	function handleContinue() {
		if (parseResult && parseResult.errors.length === 0 && parseResult.rows.length > 0) {
			goto('/upload-transactions/map');
		}
	}
</script>

<h1 class="text-4xl font-bold mb-6">Parsing CSV file</h1>

{#if error}
	<div class="alert alert-error mb-6">
		<span>{error}</span>
	</div>
	<button class="btn btn-primary" onclick={goBack}>Go Back</button>
{:else if parsing}
	<div class="flex flex-col items-center justify-center py-12">
		<LoaderCircle class="h-12 w-12 animate-spin text-primary mb-4" />
		<p class="text-lg">Parsing CSV file...</p>
	</div>
{:else if parseResult}
	<div class="space-y-6">
		<!-- Summary Card -->
		<fieldset class="fieldset bg-base-100 border-base-300 rounded-box border p-6">
			<legend class="fieldset-legend">Parse results</legend>
			
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
				<div>
					<p class="text-sm text-base-content/70">File name</p>
					<p class="font-semibold">{file?.name || 'Unknown'}</p>
				</div>
				<div>
					<p class="text-sm text-base-content/70">Delimiter</p>
					<p class="font-semibold">{parseResult.delimiter === ',' ? 'Comma (,)' : parseResult.delimiter === ';' ? 'Semicolon (;)' : 'Tab'}</p>
				</div>
				<div>
					<p class="text-sm text-base-content/70">Columns</p>
					<p class="font-semibold">{parseResult.headers.length}</p>
				</div>
				<div>
					<p class="text-sm text-base-content/70">Rows</p>
					<p class="font-semibold">{parseResult.rows.length}</p>
				</div>
			</div>
		</fieldset>

		<!-- Errors -->
		{#if parseResult.errors.length > 0}
			<fieldset class="fieldset bg-error/10 border-error rounded-box border p-6">
				<legend class="fieldset-legend text-error">Errors ({parseResult.errors.length})</legend>
				<div class="max-h-64 overflow-y-auto">
					<ul class="list-disc list-inside space-y-1">
						{#each parseResult.errors as err}
							<li class="text-error">
								Row {err.row}{err.column ? `, Column ${err.column}` : ''}: {err.message}
							</li>
						{/each}
					</ul>
				</div>
			</fieldset>
		{/if}

		<!-- Warnings -->
		{#if parseResult.warnings.length > 0}
			<fieldset class="fieldset bg-warning/10 border-warning rounded-box border p-6">
				<legend class="fieldset-legend text-warning">Warnings ({parseResult.warnings.length})</legend>
				<ul class="list-disc list-inside space-y-1 max-h-48 overflow-y-auto">
					{#each parseResult.warnings.slice(0, 20) as warn}
						<li class="text-warning">
							Row {warn.row}{warn.column ? `, Column ${warn.column}` : ''}: {warn.message}
						</li>
					{/each}
					{#if parseResult.warnings.length > 20}
						<li class="text-warning/70 italic">
							... and {parseResult.warnings.length - 20} more warnings
						</li>
					{/if}
				</ul>
			</fieldset>
		{/if}

		<!-- Headers -->
		<fieldset class="fieldset bg-base-100 border-base-300 rounded-box border p-6">
			<legend class="fieldset-legend">Headers</legend>
			<div class="flex flex-wrap gap-2">
				{#each parseResult.headers as header, index}
					<span class="badge badge-primary badge-lg">
						{index + 1}. {header || '(empty)'}
					</span>
				{/each}
			</div>
		</fieldset>

		<!-- Sample Data (First 10 rows) -->
		<fieldset class="fieldset bg-base-100 border-base-300 rounded-box border p-6">
			<legend class="fieldset-legend">Sample Data (First 10 rows)</legend>
			
			{#if parseResult.rows.length === 0}
				<p class="text-base-content/70">No data rows found.</p>
			{:else}
				<div class="overflow-x-auto">
					<table class="table table-zebra w-full">
						<thead>
							<tr>
								<th>Row</th>
								{#each parseResult.headers as header}
									<th>{header || '(empty)'}</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each parseResult.rows.slice(0, 10) as row, rowIndex}
								<tr>
									<td class="font-mono text-sm">{rowIndex + 1}</td>
									{#each row as cell, cellIndex}
										<td class="max-w-xs truncate" title={cell}>
											{cell || '(empty)'}
										</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
					{#if parseResult.rows.length > 10}
						<p class="text-sm text-base-content/70 mt-2">
							Showing first 10 of {parseResult.rows.length} rows
						</p>
					{/if}
				</div>
			{/if}
		</fieldset>

		<!-- Actions -->
		<div class="flex gap-4">
			<button class="btn btn-ghost" onclick={goBack}>
				<ArrowLeft class="h-4 w-4" />
				Go Back
			</button>
			{#if parseResult.errors.length === 0 && parseResult.rows.length > 0}
				<button class="btn btn-primary" onclick={handleContinue}>
					Continue to column mapping
				</button>
			{/if}
		</div>
	</div>
{/if}

