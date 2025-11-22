<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	
	const user = $derived(data.user);
</script>

<h1 class="text-4xl font-bold mb-6">Welcome to Reflectie AI</h1>

{#if user}
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