<script lang="ts">
	import { goto } from '$app/navigation';

	let submitting = $state(false);
	let error = $state<string | null>(null);

	async function handleSubmit(event: SubmitEvent) {
		submitting = true;
		error = null;

		const form = event.target as HTMLFormElement;
		const formData = new FormData(form);

		try {
			const response = await fetch('/api/people', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					name: formData.get('name'),
					age: parseInt(formData.get('age') as string),
					city: formData.get('city')
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to create person');
			}

			// Redirect to persons list on success
			goto('/persons');
		} catch (err) {
			error = err instanceof Error ? err.message : 'An error occurred';
			submitting = false;
		}
	}
</script>

<div class="max-w-2xl mx-auto">
	<h1 class="text-4xl font-bold mb-6">Add New Person</h1>

	{#if error}
		<div class="alert alert-error mb-4">{error}</div>
	{/if}

	<form onsubmit={handleSubmit} class="space-y-6">
		<fieldset class="fieldset bg-base-200 border-base-300 rounded-box border p-4">
			<legend class="fieldset-legend">Person Details</legend>

			<label for="name" class="label">
				<span class="label-text">Name</span>
			</label>
			<input
				type="text"
				id="name"
				name="name"
				required
				class="input input-bordered"
				placeholder="Enter name"
			/>

			<label for="age" class="label">
				<span class="label-text">Age</span>
			</label>
			<input
				type="number"
				id="age"
				name="age"
				required
				min="0"
				max="150"
				class="input input-bordered"
				placeholder="Enter age"
			/>

			<label for="city" class="label">
				<span class="label-text">City</span>
			</label>
			<input
				type="text"
				id="city"
				name="city"
				required
				class="input input-bordered"
				placeholder="Enter city"
			/>
		</fieldset>

		<div class="flex gap-4">
			<button type="submit" disabled={submitting} class="btn btn-primary">
				{submitting ? 'Adding...' : 'Add Person'}
			</button>
			<a href="/persons" class="btn btn-ghost"> Cancel </a>
		</div>
	</form>
</div>

