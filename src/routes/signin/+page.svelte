<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';

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

			await invalidateAll();
			goto('/');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Sign in failed';
		} finally {
			submitting = false;
		}
	}
</script>

<div class="max-w-md">
	<h1 class="text-4xl font-bold mb-6">Sign in</h1>

	{#if error}
		<div class="alert alert-error mb-4">{error}</div>
	{/if}

	<form onsubmit={handleSubmit} class="space-y-6">
		<fieldset class="fieldset bg-base-200 border-base-300 rounded-box border p-4">
			<legend class="fieldset-legend">Login details</legend>

			<label for="username" class="label">
				<span class="label-text">Username</span>
			</label>
			<input
				type="text"
				id="username"
				bind:value={username}
				required
				class="input input-bordered"
				placeholder="Enter your username"
			/>

			<label for="password" class="label">
				<span class="label-text">Password</span>
			</label>
			<input
				type="password"
				id="password"
				bind:value={password}
				required
				class="input input-bordered"
				placeholder="Enter your password"
			/>
		</fieldset>

		<button type="submit" disabled={submitting} class="btn btn-primary w-full">
			{submitting ? 'Logging in...' : 'Log in'}
		</button>
	</form>

	<p class="mt-4 text-center">
		Don't have an account?
		<a href="/signup" class="link link-primary">Sign up</a>
	</p>
</div>

