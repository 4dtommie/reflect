<script lang="ts">
	import {
		Upload as UploadIcon,
		FileText,
		X,
		LoaderCircle,
		FileSpreadsheet,
		CheckCircle,
		AlertCircle
	} from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { parseCSVFile, type ParseResult } from '$lib/utils/csvParser';
	import DashboardWidget from '$lib/components/DashboardWidget.svelte';
	import PlaceholderWidget from '$lib/components/PlaceholderWidget.svelte';

	let selectedFile = $state<File | null>(null);
	let fileInput = $state<HTMLInputElement | undefined>(undefined);
	let dragActive = $state(false);
	let parsing = $state(false);
	let usingBuiltInFile = $state(false);
	let uploadComplete = $state(false);

	const uploadMessages = [
		'Time to feed the data monster! 🍔',
		'Your transactions are ready for their close-up!',
		'CSV files: the unsung heroes of finance.',
		"Let's turn those rows into insights!",
		'Upload now, thank yourself later!',
		'Your spreadsheet deserves a better home.',
		"Data migration: it's like moving, but less boxes.",
		'Ready to make those numbers dance?',
		'From CSV chaos to financial clarity!',
		"Your bank statement's next adventure starts here.",
		'Time to give your transactions a makeover!',
		'Upload: because manual entry is so last century.',
		"Let's get this data party started! 🎉",
		'Your financial story, one upload away.',
		'CSV: Comma Separated Victory!'
	];

	const randomMessage = uploadMessages[Math.floor(Math.random() * uploadMessages.length)];

	function handleFileSelect(file: File) {
		// Validate file type
		if (!file.name.endsWith('.csv')) {
			alert('Please select a CSV file');
			return;
		}
		selectedFile = file;
	}

	function handleFileInputChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			handleFileSelect(file);
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		dragActive = true;
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault();
		dragActive = false;
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragActive = false;

		const file = event.dataTransfer?.files[0];
		if (file) {
			handleFileSelect(file);
		}
	}

	function formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
	}

	function removeFile() {
		selectedFile = null;
		if (fileInput !== undefined) {
			fileInput.value = '';
		}
	}

	async function handleUpload() {
		if (!selectedFile) return;

		parsing = true;
		try {
			// Parse CSV directly
			const parseResult = await parseCSVFile(selectedFile);

			// Store file content and parse result for the map page
			const fileContent = await selectedFile.text();
			sessionStorage.setItem('csv_upload_file', fileContent);
			sessionStorage.setItem('csv_upload_filename', selectedFile.name);
			sessionStorage.setItem('csv_parse_result', JSON.stringify(parseResult));

			uploadComplete = true;

			// Small delay to show the "complete" state before navigating
			setTimeout(async () => {
				await goto('/upload-transactions/map');
			}, 1500);
		} catch (error) {
			alert('Failed to parse file: ' + (error instanceof Error ? error.message : 'Unknown error'));
			parsing = false;
		}
	}

	async function useBuiltInFile() {
		parsing = true;
		usingBuiltInFile = true;
		try {
			// Fetch the built-in CSV file from static folder
			const response = await fetch('/transaction-example.csv');
			if (!response.ok) {
				throw new Error('Failed to fetch built-in transaction file');
			}

			const fileContent = await response.text();

			// Create a File object from the content
			const blob = new Blob([fileContent], { type: 'text/csv' });
			const file = new File([blob], 'transaction-example.csv', { type: 'text/csv' });

			// Parse CSV
			const parseResult = await parseCSVFile(file);

			// Store file content and parse result for the map page
			sessionStorage.setItem('csv_upload_file', fileContent);
			sessionStorage.setItem('csv_upload_filename', 'transaction-example.csv');
			sessionStorage.setItem('csv_parse_result', JSON.stringify(parseResult));

			uploadComplete = true;

			// Small delay to show the "complete" state before navigating
			setTimeout(async () => {
				await goto('/upload-transactions/map');
			}, 1500);
		} catch (error) {
			alert(
				'Failed to load built-in file: ' +
					(error instanceof Error ? error.message : 'Unknown error')
			);
			parsing = false;
			usingBuiltInFile = false;
		}
	}
</script>

<div class="grid grid-cols-1 gap-8 p-4 md:grid-cols-2 lg:grid-cols-3">
	<!-- Title Widget -->
	<DashboardWidget size="wide">
		<div class="flex h-full flex-col justify-center px-6 pt-3 pb-6">
			<h1 class="mb-4 text-7xl font-bold">Upload transactions</h1>
			<p class="text-2xl opacity-70">
				{randomMessage}
			</p>
		</div>
	</DashboardWidget>

	{#if !uploadComplete}
		<!-- Built-in File Widget -->
		<DashboardWidget size="small" title="Quick start">
			<div class="flex h-full flex-col justify-between">
				<div>
					<p class="mb-2 font-medium">Use built-in transaction file</p>
					<p class="mb-4 text-sm text-base-content/70">
						Load the example CSV file to test the upload process
					</p>
				</div>
				<button
					type="button"
					class="btn w-full btn-primary"
					onclick={useBuiltInFile}
					disabled={parsing}
				>
					{#if parsing && usingBuiltInFile}
						<LoaderCircle class="h-4 w-4 animate-spin" />
						Loading...
					{:else}
						Use example file
					{/if}
				</button>
			</div>
		</DashboardWidget>

		<!-- Upload File Widget -->
		<DashboardWidget size="full" title="Upload file">
			<div class="h-full">
				{#if !selectedFile}
					<div
						class="flex h-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center transition-all duration-200 hover:bg-base-200"
						class:border-primary={dragActive}
						class:border-base-content={!dragActive}
						class:bg-base-200={dragActive}
						role="button"
						tabindex="0"
						ondragover={handleDragOver}
						ondragleave={handleDragLeave}
						ondrop={handleDrop}
						onclick={() => fileInput?.click()}
						onkeydown={(e) => e.key === 'Enter' && fileInput?.click()}
					>
						<UploadIcon class="mx-auto mb-4 h-12 w-12 text-base-content/50" />
						<p class="mb-2 text-lg font-medium">Drop your CSV file here</p>
						<p class="mb-4 text-sm text-base-content/70">or</p>
						<span class="btn btn-primary">Browse files</span>
						<input
							type="file"
							bind:this={fileInput}
							accept=".csv"
							class="hidden"
							onchange={handleFileInputChange}
						/>
					</div>
				{:else}
					<div class="flex h-full flex-col justify-between">
						<div class="flex items-center justify-between rounded-lg bg-base-200 p-4">
							<div class="flex items-center gap-4">
								<FileText class="h-8 w-8 text-primary" />
								<div>
									<p class="font-medium">{selectedFile.name}</p>
									<p class="text-sm text-base-content/70">{formatFileSize(selectedFile.size)}</p>
								</div>
							</div>
							<button
								type="button"
								class="btn btn-ghost btn-sm"
								onclick={removeFile}
								aria-label="Remove file"
							>
								<X class="h-5 w-5" />
							</button>
						</div>

						<div class="mt-6 flex justify-end gap-4">
							<button type="button" class="btn btn-ghost" onclick={removeFile}> Cancel </button>
							<button
								type="button"
								class="btn btn-primary"
								onclick={handleUpload}
								disabled={parsing}
							>
								{#if parsing}
									<LoaderCircle class="h-4 w-4 animate-spin" />
									Parsing...
								{:else}
									Continue to column mapping
								{/if}
							</button>
						</div>
					</div>
				{/if}
			</div>
		</DashboardWidget>
	{/if}

	<!-- Mapping Status Widgets (Placeholders) -->
	<PlaceholderWidget
		title="Mapping Status: Columns"
		description="Your columns are feeling a bit unmapped right now"
		size="full"
		icon={FileSpreadsheet}
	/>

	<PlaceholderWidget
		title="Mapping Status: Categories"
		description="Categories are patiently waiting to be assigned"
		size="full"
		icon={CheckCircle}
	/>

	<PlaceholderWidget
		title="Mapping Status: Validation"
		description="No validation drama yet, but we're ready for it"
		size="full"
		icon={AlertCircle}
	/>
</div>
