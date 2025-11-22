<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	async function signOut() {
		await fetch('/api/auth/signout', { method: 'POST' });
		goto('/');
	}

	const path = $derived($page.url.pathname);
	const showBack = $derived(path === '/persons' || path === '/persons/add');
	const backHref = $derived(path === '/persons' ? '/' : '/persons');
	const backText = $derived(path === '/persons' ? '← Back to Home' : '← Back to People List');
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="max-w-7xl mx-auto space-y-4 mb-4">
	{#if data.user}
		<div class="flex justify-between items-center">
			<span>Logged in as: <strong>{data.user.username}</strong></span>
			<button onclick={signOut} class="btn btn-soft"> Sign Out </button>
		</div>
	{/if}

	{#if showBack}
		<div>
			<a href={backHref} class="link link-primary">{backText}</a>
		</div>
	{/if}
</div>

<div class="content-container">
	{@render children()}
</div>
