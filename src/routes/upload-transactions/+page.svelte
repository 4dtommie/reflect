<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<h1 class="text-4xl font-bold mb-6">Upload Transactions</h1>

<p class="text-lg mb-8">Upload your transaction data to get started with analysis.</p>

<div class="fieldset bg-base-200 border-base-300 rounded-box border p-4 max-w-2xl">
	<legend class="fieldset-legend">Upload File</legend>
	<div class="form-control">
		<label for="file-upload" class="label">
			<span class="label-text">Select transaction file</span>
		</label>
		<input type="file" id="file-upload" class="file-input file-input-bordered w-full" accept=".csv,.xlsx,.json" />
		<div class="label">
			<span class="label-text-alt">Supported formats: CSV, Excel, JSON</span>
		</div>
	</div>
	<button class="btn btn-primary mt-4">Upload</button>
</div>

