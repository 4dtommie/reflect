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
			const response = await fetch('/api/auth/signup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password })
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Signup failed');
			}

			await invalidateAll();
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
	<h1 class="text-4xl font-bold mb-6">Sign Up</h1>

	{#if error}
		<div class="alert alert-error mb-4">{error}</div>
	{/if}

	<form onsubmit={handleSubmit} class="space-y-6">
		<fieldset class="fieldset bg-base-200 border-base-300 rounded-box border p-4">
			<legend class="fieldset-legend">Account Details</legend>

			<label for="username" class="label">
				<span class="label-text">Username</span>
			</label>
			<input
				type="text"
				id="username"
				bind:value={username}
				required
				minlength="3"
				class="input input-bordered"
				placeholder="Choose a username"
			/>

			<label for="password" class="label">
				<span class="label-text">Password</span>
			</label>
			<input
				type="password"
				id="password"
				bind:value={password}
				required
				minlength="6"
				class="input input-bordered"
				placeholder="Choose a password"
			/>
		</fieldset>

		<button type="submit" disabled={submitting} class="btn btn-primary w-full">
			{submitting ? 'Signing up...' : 'Sign Up'}
		</button>
	</form>

	<p class="mt-4 text-center">
		Already have an account?
		<a href="/signin" class="link link-primary">Sign in</a>
	</p>
</div>

