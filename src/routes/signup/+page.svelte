<script lang="ts">
	import { goto } from '$app/navigation';

	let username = $state('');
	let password = $state('');
	let error = $state<string | null>(null);
	let submitting = $state(false);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		submitting = true;
		error = null;

		try {
			const response = await fetch('/api/auth/signup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password })
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Signup failed');
			}

			// Redirect to persons page
			goto('/persons');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Signup failed';
		} finally {
			submitting = false;
		}
	}
</script>

<div class="max-w-md mx-auto mt-12">
	<h1 class="text-4xl font-bold text-gray-900 mb-6">Sign Up</h1>

	{#if error}
		<div class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
	{/if}

	<form onsubmit={handleSubmit} class="space-y-6">
		<div>
			<label for="username" class="block text-sm font-medium text-gray-700 mb-2"> Username </label>
			<input
				type="text"
				id="username"
				bind:value={username}
				required
				minlength="3"
				class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
				placeholder="Choose a username"
			/>
		</div>

		<div>
			<label for="password" class="block text-sm font-medium text-gray-700 mb-2"> Password </label>
			<input
				type="password"
				id="password"
				bind:value={password}
				required
				minlength="6"
				class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
				placeholder="Choose a password"
			/>
		</div>

		<button
			type="submit"
			disabled={submitting}
			class="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
		>
			{submitting ? 'Signing up...' : 'Sign Up'}
		</button>
	</form>

	<p class="mt-4 text-center text-gray-600">
		Already have an account?
		<a href="/signin" class="text-blue-600 hover:text-blue-800 underline">Sign in</a>
	</p>
</div>

