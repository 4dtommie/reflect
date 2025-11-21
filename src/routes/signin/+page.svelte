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
			const response = await fetch('/api/auth/signin', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password })
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Sign in failed');
			}

			goto('/persons');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Sign in failed';
		} finally {
			submitting = false;
		}
	}
</script>

<div class="max-w-md mx-auto mt-12">
	<h1 class="text-4xl font-bold text-gray-900 mb-6">Sign In</h1>

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
				class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
				placeholder="Enter your username"
			/>
		</div>

		<div>
			<label for="password" class="block text-sm font-medium text-gray-700 mb-2"> Password </label>
			<input
				type="password"
				id="password"
				bind:value={password}
				required
				class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
				placeholder="Enter your password"
			/>
		</div>

		<button
			type="submit"
			disabled={submitting}
			class="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
		>
			{submitting ? 'Signing in...' : 'Sign In'}
		</button>
	</form>

	<p class="mt-4 text-center text-gray-600">
		Don't have an account?
		<a href="/signup" class="text-blue-600 hover:text-blue-800 underline">Sign up</a>
	</p>
</div>

