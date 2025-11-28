<script lang="ts">
	import { Upload as UploadIcon, FileText, X, LoaderCircle } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { parseCSVFile, type ParseResult } from '$lib/utils/csvParser';

	let selectedFile = $state<File | null>(null);
	let fileInput = $state<HTMLInputElement | undefined>(undefined);
	let dragActive = $state(false);
	let parsing = $state(false);
	let usingBuiltInFile = $state(false);

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
		return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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
			
			// Navigate directly to column mapping page
			await goto('/upload-transactions/map');
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
			
			// Navigate directly to column mapping page
			await goto('/upload-transactions/map');
		} catch (error) {
			alert('Failed to load built-in file: ' + (error instanceof Error ? error.message : 'Unknown error'));
			parsing = false;
			usingBuiltInFile = false;
		}
	}
</script>

<h1 class="text-4xl font-bold mb-6">Upload transactions</h1>

<p class="text-lg mb-8">
	Upload your transaction data in CSV format to get started, or use the built-in example file.
</p>

{#if !selectedFile}
	<!-- Built-in File Option -->
	<div class="mb-6">
		<fieldset class="fieldset bg-base-100 border-base-300 rounded-box border p-6">
			<legend class="fieldset-legend">Quick start</legend>
			<div class="flex items-center justify-between">
				<div>
					<p class="font-medium mb-1">Use built-in transaction file</p>
					<p class="text-sm text-base-content/70">Load the example CSV file to test the upload process</p>
				</div>
				<button 
					type="button" 
					class="btn btn-primary" 
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
		</fieldset>
	</div>

	<div class="divider">OR</div>
	<!-- Initial State: File Input -->
	<fieldset
		class="fieldset bg-base-100 border-base-300 rounded-box border p-8"
		class:drag-over={dragActive}
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		ondrop={handleDrop}
		role="region"
		aria-label="File upload area"
	>

		<div class="flex flex-col items-center justify-center py-8 space-y-4">
			<!-- File Input -->
			<label for="file-upload" class="cursor-pointer">
				<div
					class="border-2 border-dashed rounded-lg p-12 text-center transition-all duration-200 hover:bg-base-300"
					class:border-primary={dragActive}
					class:border-base-content={!dragActive}
					class:bg-base-300={dragActive}
				>
					<UploadIcon class="h-12 w-12 mx-auto mb-4 text-base-content/50" />
					<p class="text-lg font-medium mb-2">Drop your CSV file here</p>
					<p class="text-sm text-base-content/70 mb-4">or</p>
					<span class="btn btn-primary">Browse files</span>
				</div>
			</label>

			<input
				type="file"
				id="file-upload"
				bind:this={fileInput}
				accept=".csv"
				class="hidden"
				onchange={handleFileInputChange}
			/>
		</div>
	</fieldset>
{:else}
	<!-- File Selected State -->
	<fieldset class="fieldset bg-base-100 border-base-300 rounded-box border p-6 max-w-2xl">
		<legend class="fieldset-legend">Selected file</legend>

		<div class="space-y-4">
			<!-- File Info -->
			<div class="flex items-center justify-between p-4 bg-base-100 rounded-lg">
				<div class="flex items-center gap-4">
					<FileText class="h-8 w-8 text-primary" />
					<div>
						<p class="font-medium">{selectedFile.name}</p>
						<p class="text-sm text-base-content/70">{formatFileSize(selectedFile.size)}</p>
					</div>
				</div>
				<button type="button" class="btn btn-ghost btn-sm" onclick={removeFile} aria-label="Remove file">
					<X class="h-5 w-5" />
				</button>
			</div>

			<!-- Continue Button -->
			<div class="flex gap-4">
				<button type="button" class="btn btn-ghost" onclick={removeFile}>
					Cancel
				</button>
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
	</fieldset>
{/if}
