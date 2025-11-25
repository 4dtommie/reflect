<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<h1 class="text-4xl font-bold mb-6">Find subscriptions</h1>

<p class="text-lg mb-8">Identify recurring subscription payments in your transactions.</p>

<div class="fieldset bg-base-200 border-base-300 rounded-box border p-4 max-w-2xl">
	<legend class="fieldset-legend">Analysis Settings</legend>
	<div class="form-control">
		<label class="label">
			<span class="label-text">Analysis period</span>
		</label>
		<select class="select select-bordered w-full">
			<option>Last 3 months</option>
			<option>Last 6 months</option>
			<option>Last 12 months</option>
			<option>All time</option>
		</select>
	</div>
	<button class="btn btn-primary mt-4">Find Subscriptions</button>
</div>

