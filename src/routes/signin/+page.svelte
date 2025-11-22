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
	<h1 class="text-4xl font-bold mb-6">Sign In</h1>

	{#if error}
		<div class="alert alert-error mb-4">{error}</div>
	{/if}

	<form onsubmit={handleSubmit} class="space-y-6">
		<div class="form-control">
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
		</div>

		<div class="form-control">
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
		</div>

		<button type="submit" disabled={submitting} class="btn btn-primary w-full">
			{submitting ? 'Signing in...' : 'Sign In'}
		</button>
	</form>

	<p class="mt-4 text-center">
		Don't have an account?
		<a href="/signup" class="link link-primary">Sign up</a>
	</p>
</div>

