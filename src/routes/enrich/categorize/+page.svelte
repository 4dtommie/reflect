<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<h1 class="text-4xl font-bold mb-6">Categorize Transactions</h1>

<p class="text-lg mb-8">Automatically categorize your transactions using AI.</p>

<div class="fieldset bg-base-200 border-base-300 rounded-box border p-4 max-w-2xl">
	<legend class="fieldset-legend">Categorization Settings</legend>
	<div class="form-control">
		<label class="label">
			<span class="label-text">Select transactions to categorize</span>
		</label>
		<select class="select select-bordered w-full">
			<option>All uncategorized transactions</option>
			<option>Last 30 days</option>
			<option>Last 90 days</option>
			<option>Custom date range</option>
		</select>
	</div>
	<button class="btn btn-primary mt-4">Start Categorization</button>
</div>

