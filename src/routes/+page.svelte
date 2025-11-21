<script lang="ts">
	import { onMount } from 'svelte';

	// Check if user is logged in
	let user = $state<{ id: number; username: string } | null>(null);
	let loading = $state(true);

	onMount(async () => {
		try {
			const response = await fetch('/api/auth/me');
			if (response.ok) {
				const data = await response.json();
				user = data.user;
			}
		} catch {
			// Not authenticated
		} finally {
			loading = false;
		}
	});
</script>

<h1 class="text-4xl font-bold text-gray-900 mb-6">Welcome to Reflectie AI</h1>

{#if loading}
	<p class="text-lg text-gray-700 mb-8">Loading...</p>
{:else if user}
	<p class="text-lg text-gray-700 mb-4">Welcome back, {user.username}!</p>
	<div class="flex gap-4">
		<a
			href="/persons"
			class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center"
		>
			View People Database
		</a>
		<a
			href="/persons/add"
			class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-center"
		>
			Add New Person
		</a>
	</div>
{:else}
	<p class="text-lg text-gray-700 mb-8">Sign in to manage your people database.</p>
	<div class="flex gap-4">
		<a
			href="/signin"
			class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center"
		>
			Sign In
		</a>
		<a
			href="/signup"
			class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-center"
		>
			Sign Up
		</a>
	</div>
{/if}