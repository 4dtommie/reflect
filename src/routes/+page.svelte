<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	
	const user = $derived(data.user);
</script>

<h1 class="text-4xl font-bold mb-6">Dive deeper into your finances</h1>

{#if user}
	<p class="text-lg mb-4">Welcome back, {user.username}!</p>
	<p class="text-lg mb-4">Here you can dive deeper into your finances. You can:</p>
	<ul class="list-disc list-inside text-lg">
		<li>View your financial data</li>
		<li>Analyze your spending</li>
		<li>Create financial plans</li>
		<li>Track your progress</li>
	</ul>
	<p class="text-lg mb-4 mt-4">Follow the plan and get rich!</p>

{:else}
	<p class="text-lg mb-8">Log in to get started.</p>
	<div class="flex gap-4">
		<a href="/signin" class="btn btn-primary"> Log in </a>
		<a href="/signup" class="btn btn-secondary"> Sign up </a>
	</div>
{/if}