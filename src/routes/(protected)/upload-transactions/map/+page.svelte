<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { ArrowLeft, Check } from 'lucide-svelte';
	import type { ParseResult } from '$lib/utils/csvParser';
	import StatItem from '$lib/components/StatItem.svelte';
	import {
		detectColumnMapping,
		mapCSVRowToTransaction,
		type ColumnMapping,
		type TransactionField,
		type TransactionInput,
		type MappingError
	} from '$lib/utils/transactionMapper';
	import DashboardWidget from '$lib/components/DashboardWidget.svelte';

	const TRANSACTION_FIELDS: { value: TransactionField; label: string; required: boolean }[] = [
		{ value: 'date', label: 'Date', required: true },
		{ value: 'merchantName', label: 'Merchant Name', required: true },
		{ value: 'iban', label: 'IBAN', required: true },
		{ value: 'amount', label: 'Amount', required: true },
		{ value: 'type', label: 'Transaction Type', required: false },
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
	let previewRowCount = $state(3);
	let previewTransactions: Array<{
		transaction: TransactionInput;
		cleaned_merchant_name: string;
		normalized_description: string;
	} | null> = $state([]);
	let loadingPreview = $state(false);

	// Account naming
	let uniqueIbans: string[] = $derived.by(() => {
		const ibans = new Set<string>();
		for (const t of mappedTransactions) {
			if (t && t.iban) {
				ibans.add(t.iban);
			}
		}
		return Array.from(ibans);
	});
	let accountNames = $state<Record<string, string>>({});

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

	async function updateMappedTransactions() {
		if (!parseResult) return;

		mappedTransactions = [];
		mappingErrors = [];
		previewTransactions = [];
		loadingPreview = false;

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

		// Fetch cleaned preview data from server
		await fetchPreviewData();
	}

	async function fetchPreviewData() {
		const validTransactions = mappedTransactions.filter((t): t is TransactionInput => t !== null);

		if (validTransactions.length === 0) {
			previewTransactions = [];
			return;
		}

		loadingPreview = true;
		try {
			// Serialize transactions for API (convert Date to ISO string)
			const serializedTransactions = validTransactions.map((t) => ({
				...t,
				date: t.date instanceof Date ? t.date.toISOString() : t.date
			}));

			console.log('Fetching preview for', serializedTransactions.length, 'transactions');

			const response = await fetch('/api/transactions/preview', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					transactions: serializedTransactions
				})
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.error('Preview API error:', response.status, errorText);
				throw new Error(`Failed to fetch preview data: ${response.status}`);
			}

			const data = await response.json();
			console.log('Preview data received:', data.transactions?.length, 'transactions');

			// Map preview transactions back to original array structure (including nulls)
			// Since we send valid transactions in order, we can map by index
			let previewIndex = 0;
			previewTransactions = mappedTransactions.map((t) => {
				if (!t) return null;
				const preview = data.transactions[previewIndex++];
				if (preview) {
					console.log('Mapped preview:', {
						original_desc: t.description,
						normalized_desc: preview.normalized_description,
						different: preview.normalized_description !== t.description
					});
				}
				return preview
					? {
							transaction: t,
							cleaned_merchant_name: preview.cleaned_merchant_name,
							normalized_description: preview.normalized_description
						}
					: null;
			});
		} catch (err) {
			console.error('Failed to fetch preview data:', err);
			// Fallback: use original data without cleaning
			previewTransactions = mappedTransactions.map((t) =>
				t
					? {
							transaction: t,
							cleaned_merchant_name: t.merchantName,
							normalized_description: t.description
						}
					: null
			);
		} finally {
			loadingPreview = false;
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
		sessionStorage.setItem('csv_account_mapping', JSON.stringify(accountNames));

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

<div class="grid grid-cols-1 gap-8 p-4 md:grid-cols-2 lg:grid-cols-3">
	{#if !parseResult}
		<DashboardWidget size="wide">
			<div class="flex h-full flex-col justify-center px-6 pt-3 pb-6">
				<div class="alert alert-warning">
					<p>No parsed data found. Please go back and parse your CSV file first.</p>
					<button class="btn btn-ghost" onclick={goBack}>Go Back</button>
				</div>
			</div>
		</DashboardWidget>
	{:else}
		<!-- Two-column layout: Title + Column mapping on left, widgets on right -->
		<div class="col-span-full grid grid-cols-1 gap-8 lg:grid-cols-3">
			<!-- Left Column: Title + Column Mapping -->
			<div class="flex flex-col gap-8 lg:col-span-2">
				<!-- Title Widget -->
				<DashboardWidget size="wide">
					<div class="flex h-full flex-col justify-center px-6 pt-3 pb-6">
						<h1 class="mb-4 text-7xl font-bold">Assign columns</h1>
						<p class="text-2xl opacity-70">
							Assign the columns from your CSV file to the corresponding fields in your
							transactions.
						</p>
					</div>
				</DashboardWidget>

				<!-- Account Identification Widget -->
				{#if uniqueIbans.length > 0}
					<DashboardWidget size="wide" title="Account identification">
						<div class="p-4">
							<p class="mb-4 text-base-content/70">
								We found the following accounts in your file. Give them a name (e.g., "Personal",
								"Joint") to easily identify them later.
							</p>
							<div class="space-y-4">
								{#each uniqueIbans as iban}
									<div class="flex items-center gap-4 rounded-lg bg-base-200/50 p-4">
										<div class="flex-1">
											<p class="font-mono text-sm">{iban}</p>
											<p class="text-xs text-base-content/60">
												{mappedTransactions.filter((t) => t?.iban === iban).length} transactions
											</p>
										</div>
										<div class="w-1/2">
											<input
												type="text"
												placeholder="Account Name (e.g. Joint)"
												class="input-bordered input w-full"
												bind:value={accountNames[iban]}
											/>
										</div>
									</div>
								{/each}
							</div>
						</div>
					</DashboardWidget>
				{/if}

				<!-- Column Mapping Widget -->
				<DashboardWidget size="wide" title="Column mapping">
					<div class="flex h-full flex-col justify-center">
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
										{@const isRequired =
											TRANSACTION_FIELDS.find((f) => f.value === currentMapping)?.required || false}
										<tr class={currentMapping === 'skip' ? 'opacity-60' : ''}>
											<td>
												<p class="font-medium">{header || '(empty header)'}</p>
											</td>
											<td class="w-20 max-w-20">
												<p class="truncate text-sm" title={sampleValue}>{sampleValue}</p>
											</td>
											<td>
												<select
													class="select-bordered select w-full"
													value={currentMapping}
													onchange={(e) =>
														updateMapping(
															index,
															(e.target as HTMLSelectElement).value as TransactionField
														)}
												>
													<option value="skip">-- (Skip column) --</option>
													{#each TRANSACTION_FIELDS as field}
														{@const alreadyMapped =
															getMappedColumn(field.value) !== null &&
															getMappedColumn(field.value) !== index}
														<option
															value={field.value}
															disabled={alreadyMapped && field.value !== 'skip'}
														>
															{field.label}
															{field.required ? '*' : ''}
															{#if alreadyMapped && field.value !== 'skip'}
																(already mapped){/if}
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
					</div>
				</DashboardWidget>
			</div>

			<!-- Right Column: Summary and Status Widgets (starts at top) -->
			<div class="flex flex-col gap-8">
				<!-- Mapping Summary -->
				<DashboardWidget size="small" title="Mapping summary">
					<div class="flex h-full flex-col justify-center">
						<div class="mb-4 grid grid-cols-2 gap-4">
							<StatItem label="Total rows" value={totalRows} />
							<StatItem label="Valid" value={validCount} color="text-success" />
							<StatItem label="Errors" value={errorCount} color="text-error" />
							<StatItem label="Missing" value={missingRequired.length} color="text-warning" />
						</div>

						{#if missingRequired.length === 0 && validCount > 1}
							<button class="btn btn-primary" onclick={handleContinue}>
								<Check class="h-4 w-4" />
								Ready to import {totalRows} transactions
							</button>
						{/if}
					</div>
				</DashboardWidget>

				<!-- Missing Required Fields Widget -->
				{#if missingRequired.length > 0}
					<DashboardWidget size="small" title="Missing required fields">
						<div class="flex h-full flex-col justify-center">
							<div class="alert flex flex-row alert-warning">
								<div class="full-width mb-2 font-semibold">
									Please map the following required fields:
								</div>
								<div class="">
									{#each missingRequired as field}
										<div>{TRANSACTION_FIELDS.find((f) => f.value === field)?.label || field}</div>
									{/each}
								</div>
							</div>
						</div>
					</DashboardWidget>
				{/if}

				<!-- Validation Errors Widget -->
				{#if errorCount > 0}
					<DashboardWidget size="small" title="Validation errors ({errorCount})">
						<div class="flex h-full flex-col justify-center">
							<div class="max-h-64 overflow-y-auto">
								{#each mappingErrors.slice(0, 50) as rowErrors, rowIndex}
									{#if rowErrors.length > 0}
										<div class="mb-3 rounded bg-base-200 p-3">
											<p class="mb-2 font-semibold text-error">Row {rowIndex + 1}:</p>
											<ul class="list-inside list-disc space-y-1 text-sm">
												{#each rowErrors as err}
													<li>
														<span class="font-medium">{err.field}:</span>
														{err.message}
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
						</div>
					</DashboardWidget>
				{/if}

				<!-- Preview Mapped Transactions -->
				{#if mappedTransactions.length > 0}
					<DashboardWidget size="small" title="Preview">
						<div class="flex h-full flex-col justify-start">
							<div class="flex h-full flex-col justify-start">
								{#if validCount === 0}
									<div class="alert flex flex-col items-start alert-error">
										<p class="mb-2 font-semibold">No valid transactions found.</p>
										<p class="mb-2 text-sm">
											Please check the validation errors section above to see what needs to be
											fixed.
										</p>
										<details class="mt-2">
											<summary class="cursor-pointer text-sm font-medium"
												>Common issues and fixes:</summary
											>
											<ul class="mt-2 list-inside list-disc space-y-1 text-sm">
												<li>
													<strong>Date format:</strong> Try formats like DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY,
													or YYYY-MM-DD
												</li>
												<li>
													<strong>Amount format:</strong> Ensure it's a number (can include decimal point
													or comma, currency symbols will be removed)
												</li>
												<li>
													<strong>IBAN format:</strong> Should be 2 letters + 2 digits + up to 30 alphanumeric
													characters (spaces allowed)
												</li>
												<li>
													<strong>Missing fields:</strong> Make sure all required fields (marked with
													*) are mapped to CSV columns
												</li>
												<li>
													<strong>Empty values:</strong> Check that your CSV doesn't have empty cells
													in required columns
												</li>
											</ul>
										</details>
									</div>
								{:else}
									<div class="space-y-4">
										{#each mappedTransactions.slice(0, previewRowCount) as transaction, index}
											{@const errors = mappingErrors[index] || []}
											{@const preview = previewTransactions[index]}
											<div class="card relative bg-base-200 shadow-sm">
												<div class="card-body p-4">
													<div class="absolute top-4 right-4">
														{#if errors.length > 0}
															<span class="badge badge-error">{errors.length} error(s)</span>
														{:else}
															<span class="badge badge-success">OK</span>
														{/if}
													</div>

													{#if transaction}
														<div class="grid grid-cols-1 gap-2">
															<div>
																<span class="font-semibold opacity-70">Date:</span>
																<span>{transaction.date.toLocaleDateString()}</span>
															</div>
															<div>
																<span class="font-semibold opacity-70">Amount:</span>
																<span class={transaction.isDebit ? 'text-error' : 'text-success'}>
																	{transaction.isDebit ? '-' : '+'}
																	€{transaction.amount.toFixed(2)}
																</span>
															</div>
															<div>
																<span class="font-semibold opacity-70">Merchant:</span>
																{#if preview && preview.cleaned_merchant_name}
																	<span>{preview.cleaned_merchant_name}</span>
																{:else}
																	<span>{transaction.merchantName}</span>
																{/if}
															</div>
															<div>
																<span class="font-semibold opacity-70">Description:</span>
																{#if preview}
																	<span>{preview.normalized_description}</span>
																{:else if loadingPreview}
																	<span class="loading loading-xs loading-spinner"></span>
																{:else}
																	<span>{transaction.description}</span>
																{/if}
															</div>
															<div>
																<span class="font-semibold opacity-70">Type:</span>
																<span class="badge badge-sm">{transaction.type}</span>
															</div>
														</div>
													{:else}
														<div class="text-error">
															Invalid: {errors.map((e) => e.message).join(', ')}
														</div>
													{/if}
												</div>
											</div>
										{/each}

										{#if mappedTransactions.length > previewRowCount || totalRows > mappedTransactions.length}
											<p class="mt-2 text-center text-sm text-base-content/70">
												Showing {previewRowCount} items from total of {totalRows} rows
											</p>
										{/if}
									</div>
								{/if}
							</div>
						</div></DashboardWidget
					>
				{/if}
			</div>
		</div>
	{/if}
</div>
