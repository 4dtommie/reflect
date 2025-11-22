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

<h1 class="text-4xl font-bold mb-6">Welcome to Reflectie AI</h1>

{#if loading}
	<p class="text-lg mb-8">Loading...</p>
{:else if user}
	<p class="text-lg mb-4">Welcome back, {user.username}!</p>
	<div class="flex gap-4">
		<a href="/persons" class="btn btn-primary"> View People Database </a>
		<a href="/persons/add" class="btn btn-success"> Add New Person </a>
	</div>
{:else}
	<p class="text-lg mb-8">Sign in to manage your people database.</p>
	<div class="flex gap-4">
		<a href="/signin" class="btn btn-primary"> Sign In </a>
		<a href="/signup" class="btn btn-success"> Sign Up </a>
	</div>
{/if}