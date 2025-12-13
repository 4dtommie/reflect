<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import DashboardWidget from '$lib/components/DashboardWidget.svelte';

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

<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
	<!-- Login Form Section (1/3) -->
	<div class="md:col-span-1">
		<DashboardWidget title="Sign in" size="auto" class="h-full">
			{#if error}
				<div class="mb-4 alert text-sm alert-error">{error}</div>
			{/if}

			<form onsubmit={handleSubmit} class="space-y-4">
				<div class="form-control w-full">
					<label for="username" class="label">
						<span class="label-text font-medium">Username</span>
					</label>
					<input
						type="text"
						id="username"
						bind:value={username}
						required
						class="input-bordered input w-full"
						placeholder="Enter your username"
					/>
				</div>

				<div class="form-control w-full">
					<label for="password" class="label">
						<span class="label-text font-medium">Password</span>
					</label>
					<input
						type="password"
						id="password"
						bind:value={password}
						required
						class="input-bordered input w-full"
						placeholder="Enter your password"
					/>
				</div>

				<button type="submit" disabled={submitting} class="btn mt-4 w-full btn-primary">
					{submitting ? 'Logging in...' : 'Log in'}
				</button>
			</form>

			<div class="divider my-6 text-xs text-base-content/50">OR</div>

			<p class="text-center text-sm">
				Don't have an account?
				<a href="/signup" class="link font-medium link-primary">Sign up</a>
			</p>
		</DashboardWidget>
	</div>

	<!-- Content Section (2/3) -->
	<div class="md:col-span-2">
		<DashboardWidget
			title="Dive deeper into your finances"
			size="auto"
			class="h-full bg-base-200/50"
		>
			<div class="prose max-w-none p-4">
				<p class="mb-6 text-lg">Welcome to Reflect! Your personal finance companion.</p>

				<div class="not-prose grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div class="card bg-base-100 shadow-sm">
						<div class="card-body p-4">
							<h3 class="card-title text-base">📊 Visual Analytics</h3>
							<p class="text-sm">
								Understand your spending habits with intuitive charts and graphs.
							</p>
						</div>
					</div>
					<div class="card bg-base-100 shadow-sm">
						<div class="card-body p-4">
							<h3 class="card-title text-base">🤖 AI Categorization</h3>
							<p class="text-sm">Automatically organize your transactions with advanced AI.</p>
						</div>
					</div>
					<div class="card bg-base-100 shadow-sm">
						<div class="card-body p-4">
							<h3 class="card-title text-base">🔄 Recurring Tracking</h3>
							<p class="text-sm">Keep track of subscriptions and recurring bills effortlessly.</p>
						</div>
					</div>
					<div class="card bg-base-100 shadow-sm">
						<div class="card-body p-4">
							<h3 class="card-title text-base">💡 Smart Insights</h3>
							<p class="text-sm">Get personalized insights to improve your financial health.</p>
						</div>
					</div>
				</div>

				<p class="mt-8 text-lg font-medium">Follow the plan and get rich!</p>
			</div>
		</DashboardWidget>
	</div>
</div>
