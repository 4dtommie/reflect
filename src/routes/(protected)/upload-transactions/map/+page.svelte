<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { ArrowLeft, Check } from 'lucide-svelte';
	import type { ParseResult } from '$lib/utils/csvParser';
	import {
		detectColumnMapping,
		mapCSVRowToTransaction,
		type ColumnMapping,
		type TransactionField,
		type TransactionInput,
		type MappingError
	} from '$lib/utils/transactionMapper';

	const TRANSACTION_FIELDS: { value: TransactionField; label: string; required: boolean }[] = [
		{ value: 'date', label: 'Date', required: true },
		{ value: 'merchantName', label: 'Merchant Name', required: true },
		{ value: 'iban', label: 'IBAN', required: true },
		{ value: 'amount', label: 'Amount', required: true },
		{ value: 'type', label: 'Transaction Type', required: true },
		{ value: 'description', label: 'Description', required: true },
		{ value: 'counterpartyIban', label: 'Counterparty IBAN', required: false },
		{ value: 'isDebit', label: 'Is Debit', required: false },
		{ value: 'categoryId', label: 'Category ID', required: false },
		{ value: 'skip', label: '(Skip column)', required: false }
	];

	let parseResult: ParseResult | null = $state(null);
	let mapping: ColumnMapping = $state({});
	let mappedTransactions: (TransactionInput | null)[] = $state([]);
	let mappingErrors: MappingError[][] = $state([]);
	let previewRowCount = $state(5);

	onMount(() => {
		// Retrieve parsed CSV data from sessionStorage
		const storedData = sessionStorage.getItem('csv_parse_result');
		if (!storedData) {
			// Redirect back if no parse result
			goto('/upload-transactions/parse');
			return;
		}

		try {
			parseResult = JSON.parse(storedData);
			
			// Auto-detect column mapping
			if (parseResult && parseResult.headers.length > 0) {
				mapping = detectColumnMapping(parseResult.headers);
				updateMappedTransactions();
			}
		} catch (error) {
			console.error('Failed to load parse result:', error);
			goto('/upload-transactions/parse');
		}
	});

	function updateMapping(columnIndex: number, field: TransactionField) {
		mapping[columnIndex] = field;
		updateMappedTransactions();
	}

	function updateMappedTransactions() {
		if (!parseResult) return;

		mappedTransactions = [];
		mappingErrors = [];

		// Only map preview rows for UI (first 100 rows for preview)
		// Full mapping will be done on the server during import
		const previewLimit = 100;
		const rowsToPreview = parseResult.rows.slice(0, previewLimit);

		for (let i = 0; i < rowsToPreview.length; i++) {
			const row = rowsToPreview[i];
			const result = mapCSVRowToTransaction(row, parseResult.headers, mapping);
			
			// Add row number to errors
			const errors = result.errors.map((err) => ({
				...err,
				row: i + 1 // +1 because row 0 is headers
			}));

			mappedTransactions.push(result.transaction);
			mappingErrors.push(errors);
			
			// Debug: log first row's mapping result
			if (i === 0) {
				console.log('First row mapping:', {
					row,
					mapping,
					headers: parseResult.headers,
					result,
					errors
				});
			}
		}
	}

	function getMappedColumn(field: TransactionField): number | null {
		for (const [columnIndex, mappedField] of Object.entries(mapping)) {
			if (mappedField === field) {
				return parseInt(columnIndex);
			}
		}
		return null;
	}

	function getRequiredFieldsMissing(): TransactionField[] {
		const requiredFields = TRANSACTION_FIELDS.filter((f) => f.required).map((f) => f.value);
		const mappedFields = new Set(Object.values(mapping).filter((f) => f !== 'skip'));
		return requiredFields.filter((f) => !mappedFields.has(f));
	}

	function goBack() {
		goto('/upload-transactions/parse');
	}

	function handleContinue() {
		// Store the raw CSV data and mapping for server-side processing
		// Don't send all mapped transactions - let server do the mapping for all rows
		sessionStorage.setItem('csv_column_mapping', JSON.stringify(mapping));
		
		// The parseResult is already in sessionStorage with all rows
		// Server will use the mapping to process all rows
		
		// Navigate to import/preview page (we'll create this next)
		goto('/upload-transactions/import');
	}

	const validCount = $derived(mappedTransactions.filter((t) => t !== null).length);
	const errorCount = $derived(mappingErrors.flat().length);
	const missingRequired = $derived(getRequiredFieldsMissing());
	const totalRows = $derived.by(() => {
		if (!parseResult) return 0;
		return parseResult.rows.length;
	});
	const previewRows = $derived(mappedTransactions.length);
</script>

<h1 class="text-4xl font-bold mb-6">Assign columns</h1>

{#if !parseResult}
	<div class="alert alert-warning">
		<p>No parsed data found. Please go back and parse your CSV file first.</p>
		<button class="btn btn-ghost" onclick={goBack}>Go Back</button>
	</div>
{:else}
	<div class="space-y-6">
		<!-- Mapping Summary -->
		<fieldset class="fieldset bg-base-200 border-base-300 rounded-box border p-6">
			<legend class="fieldset-legend">Mapping status</legend>
			
			<div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
				<div>
					<p class="text-sm text-base-content/70">Total rows</p>
					<p class="font-semibold">{totalRows}</p>
				</div>
				<div>
					<p class="text-sm text-base-content/70">Valid</p>
					<p class="font-semibold text-success">{validCount} / {previewRows}</p>
				</div>
				<div>
					<p class="text-sm text-base-content/70">Errors</p>
					<p class="font-semibold text-error">{errorCount}</p>
				</div>
				<div>
					<p class="text-sm text-base-content/70">Mapped</p>
					<p class="font-semibold">
						{Object.values(mapping).filter((f) => f !== 'skip').length} / {parseResult ? parseResult.headers.length : 0}
					</p>
				</div>
				<div>
					<p class="text-sm text-base-content/70">Missing</p>
					<p class="font-semibold text-warning">{missingRequired.length}</p>
				</div>
			</div>
			
			<div class="flex justify-end mt-4">
				<button
					class="btn btn-primary"
					disabled={validCount === 0 || missingRequired.length > 0}
					onclick={handleContinue}
				>
					<Check class="h-4 w-4" />
					Continue to import {totalRows} transactions
				</button>
			</div>
			
		</fieldset>

		<!-- Missing Required Fields Warning -->
		{#if missingRequired.length > 0}
			<div class="alert alert-warning">
				<p class="font-semibold">Missing required fields:</p>
				<ul class="list-disc list-inside mt-2">
					{#each missingRequired as field}
						<li>{TRANSACTION_FIELDS.find((f) => f.value === field)?.label || field}</li>
					{/each}
				</ul>
			</div>
		{/if}

		<!-- Column Mapping Table -->
		<fieldset class="fieldset bg-base-200 border-base-300 rounded-box border p-6">
			<legend class="fieldset-legend">Column mapping</legend>
			
			<div class="overflow-x-auto">
				<table class="table w-full">
					<thead>
						<tr>
							<th>CSV column</th>
							<th class="w-20">Sample value</th>
							<th>Map to field</th>
							<th>Status</th>
						</tr>
					</thead>
					<tbody>
						{#each parseResult.headers as header, index}
							{@const currentMapping = mapping[index] || 'skip'}
							{@const sampleValue = parseResult.rows[0]?.[index] || '(empty)'}
							{@const isRequired = TRANSACTION_FIELDS.find((f) => f.value === currentMapping)?.required || false}
							<tr class={currentMapping === 'skip' ? 'opacity-60' : ''}>
								<td>
									<p class="font-medium">{header || '(empty header)'}</p>
								</td>
								<td class="w-20 max-w-20">
									<p class="truncate text-sm" title={sampleValue}>{sampleValue}</p>
								</td>
								<td>
									<select
										class="select select-bordered w-full"
										value={currentMapping}
										onchange={(e) => updateMapping(index, (e.target as HTMLSelectElement).value as TransactionField)}
									>
										<option value="skip">-- (Skip column) --</option>
										{#each TRANSACTION_FIELDS as field}
											{@const alreadyMapped = getMappedColumn(field.value) !== null && getMappedColumn(field.value) !== index}
											<option
												value={field.value}
												disabled={alreadyMapped && field.value !== 'skip'}
											>
												{field.label} {field.required ? '*' : ''}
												{#if alreadyMapped && field.value !== 'skip'} (already mapped){/if}
											</option>
										{/each}
									</select>
								</td>
								<td>
									{#if currentMapping === 'skip'}
										<span class="badge badge-ghost">Skipped</span>
									{:else if isRequired}
										<span class="badge badge-success">Required</span>
									{:else}
										<span class="badge badge-info">Optional</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</fieldset>

		<!-- Error Details (if any) -->
		{#if errorCount > 0}
			<fieldset class="fieldset bg-error/10 border-error rounded-box border p-6">
				<legend class="fieldset-legend text-error">Validation errors ({errorCount})</legend>
				
				<div class="max-h-64 overflow-y-auto">
					{#each mappingErrors.slice(0, 50) as rowErrors, rowIndex}
						{#if rowErrors.length > 0}
							<div class="mb-3 p-3 bg-base-100 rounded">
								<p class="font-semibold text-error mb-2">Row {rowIndex + 1}:</p>
								<ul class="list-disc list-inside space-y-1 text-sm">
									{#each rowErrors as err}
										<li>
											<span class="font-medium">{err.field}:</span> {err.message}
										</li>
									{/each}
								</ul>
							</div>
						{/if}
					{/each}
					{#if mappingErrors.flat().length > 50}
						<p class="text-sm text-base-content/70 italic">
							... and {mappingErrors.flat().length - 50} more errors
						</p>
					{/if}
				</div>
			</fieldset>
		{/if}

		<!-- Preview Mapped Transactions -->
		{#if mappedTransactions.length > 0}
			<fieldset class="fieldset bg-base-200 border-base-300 rounded-box border p-6">
				<legend class="fieldset-legend">
					Preview (showing {previewRowCount} items from total of {totalRows} rows)
				</legend>
				
				{#if validCount === 0}
					<div class="alert alert-error">
						<p class="font-semibold mb-2">No valid transactions found.</p>
						<p class="text-sm mb-2">Please check the validation errors section above to see what needs to be fixed.</p>
						<details class="mt-2">
							<summary class="cursor-pointer text-sm font-medium">Common issues and fixes:</summary>
							<ul class="list-disc list-inside mt-2 text-sm space-y-1">
								<li><strong>Date format:</strong> Try formats like DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, or YYYY-MM-DD</li>
								<li><strong>Amount format:</strong> Ensure it's a number (can include decimal point or comma, currency symbols will be removed)</li>
								<li><strong>IBAN format:</strong> Should be 2 letters + 2 digits + up to 30 alphanumeric characters (spaces allowed)</li>
								<li><strong>Missing fields:</strong> Make sure all required fields (marked with *) are mapped to CSV columns</li>
								<li><strong>Empty values:</strong> Check that your CSV doesn't have empty cells in required columns</li>
							</ul>
						</details>
					</div>
				{:else}
					<div class="overflow-x-auto">
						<table class="table table-zebra w-full text-sm">
							<thead>
								<tr>
									<th>Row</th>
									<th>Date</th>
									<th>Merchant</th>
									<th>Amount</th>
									<th>Type</th>
									<th>IBAN</th>
									<th>Status</th>
								</tr>
							</thead>
							<tbody>
								{#each mappedTransactions.slice(0, previewRowCount) as transaction, index}
									{@const errors = mappingErrors[index] || []}
									<tr class={transaction ? '' : 'opacity-50'}>
										<td class="font-mono">{index + 1}</td>
										{#if transaction}
											<td>{transaction.date.toLocaleDateString()}</td>
											<td class="max-w-xs truncate" title={transaction.merchantName}>
												{transaction.merchantName}
											</td>
											<td class={transaction.isDebit ? 'text-error' : 'text-success'}>
												{transaction.isDebit ? '-' : '+'}
												€{transaction.amount.toFixed(2)}
											</td>
											<td>
												<span class="badge badge-sm">{transaction.type}</span>
											</td>
											<td class="font-mono text-xs">{transaction.iban}</td>
											<td>
												{#if errors.length > 0}
													<span class="badge badge-error badge-sm">{errors.length} error(s)</span>
												{:else}
													<span class="badge badge-success badge-sm">OK</span>
												{/if}
											</td>
										{:else}
											<td colspan="6" class="text-error">
												Invalid: {errors.map((e) => e.message).join(', ')}
											</td>
										{/if}
									</tr>
								{/each}
							</tbody>
						</table>
					{#if mappedTransactions.length > previewRowCount || totalRows > mappedTransactions.length}
						<p class="text-sm text-base-content/70 mt-2">
							Showing {previewRowCount} items from total of {totalRows} rows
						</p>
					{/if}
					</div>
				{/if}
			</fieldset>
		{/if}

		<!-- Actions -->
		<div class="flex gap-4">
			<button class="btn btn-ghost" onclick={goBack}>
				<ArrowLeft class="h-4 w-4" />
				Go Back
			</button>
			<button
				class="btn btn-primary"
				disabled={validCount === 0 || missingRequired.length > 0}
				onclick={handleContinue}
			>
				<Check class="h-4 w-4" />
				Continue to import {totalRows} transactions
			</button>
		</div>
	</div>
{/if}

