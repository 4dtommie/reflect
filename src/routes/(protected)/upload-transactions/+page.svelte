<script lang="ts">
	import { Upload as UploadIcon, FileText, X } from 'lucide-svelte';
	import { goto } from '$app/navigation';

	let selectedFile = $state<File | null>(null);
	let fileInput = $state<HTMLInputElement | undefined>(undefined);
	let dragActive = $state(false);

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
		
		try {
			// Read file content and store in sessionStorage
			const fileContent = await selectedFile.text();
			sessionStorage.setItem('csv_upload_file', fileContent);
			sessionStorage.setItem('csv_upload_filename', selectedFile.name);
			
			// Navigate to parse page
			await goto('/upload-transactions/parse');
		} catch (error) {
			alert('Failed to read file: ' + (error instanceof Error ? error.message : 'Unknown error'));
		}
	}
</script>

<h1 class="text-4xl font-bold mb-6">Upload transactions</h1>

<p class="text-lg mb-8">
	Upload your transaction data in CSV format to get started.
</p>

{#if !selectedFile}
	<!-- Initial State: File Input -->
	<fieldset
		class="fieldset bg-base-200 border-base-300 rounded-box border p-8"
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
	<fieldset class="fieldset bg-base-200 border-base-300 rounded-box border p-6 max-w-2xl">
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
				<button type="button" class="btn btn-primary" onclick={handleUpload}>
					Continue to parse
				</button>
			</div>
		</div>
	</fieldset>
{/if}
