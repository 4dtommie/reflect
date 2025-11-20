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
	<div class="mb-6">
		<a href="/persons" class="text-blue-600 hover:text-blue-800 underline">← Back to People List</a>
	</div>

	<h1 class="text-4xl font-bold text-gray-900 mb-6">Add New Person</h1>

	{#if error}
		<div class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
			{error}
		</div>
	{/if}

	<form onsubmit={handleSubmit} class="space-y-6">
		<div>
			<label for="name" class="block text-sm font-medium text-gray-700 mb-2"> Name </label>
			<input
				type="text"
				id="name"
				name="name"
				required
				class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
				placeholder="Enter name"
			/>
		</div>

		<div>
			<label for="age" class="block text-sm font-medium text-gray-700 mb-2"> Age </label>
			<input
				type="number"
				id="age"
				name="age"
				required
				min="0"
				max="150"
				class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
				placeholder="Enter age"
			/>
		</div>

		<div>
			<label for="city" class="block text-sm font-medium text-gray-700 mb-2"> City </label>
			<input
				type="text"
				id="city"
				name="city"
				required
				class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
				placeholder="Enter city"
			/>
		</div>

		<div class="flex gap-4">
			<button
				type="submit"
				disabled={submitting}
				class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{submitting ? 'Adding...' : 'Add Person'}
			</button>
			<a
				href="/persons"
				class="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
			>
				Cancel
			</a>
		</div>
	</form>
</div>

