<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	
	const user = $derived(data.user);
</script>

<h1 class="text-4xl font-bold mb-6">Reflect on your personal finances</h1>

{#if user}
	<p class="text-lg mb-4">Welcome back, {user.username}!</p>
{:else}
	<p class="text-lg mb-8">Log in to get started.</p>
	<div class="flex gap-4">
		<a href="/signin" class="btn btn-primary"> Log In </a>
		<a href="/signup" class="btn btn-secondary"> Sign up </a>
	</div>
{/if}