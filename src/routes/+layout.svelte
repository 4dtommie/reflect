<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { goto, invalidateAll } from '$app/navigation';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	async function signOut() {
		await fetch('/api/auth/signout', { method: 'POST' });
		await invalidateAll();
		goto('/');
	}

	const dropdowns = new Set<HTMLDetailsElement>();

	function registerDropdown(node: HTMLDetailsElement) {
		dropdowns.add(node);
		return {
			destroy() {
				dropdowns.delete(node);
			}
		};
	}

	function handleDetailsToggle(event: Event) {
		const currentDetails = event.currentTarget as HTMLDetailsElement;
		// Use setTimeout to check after the state has updated
		setTimeout(() => {
			if (currentDetails?.open) {
				// Close all other dropdowns
				dropdowns.forEach((dropdown) => {
					if (dropdown !== currentDetails && dropdown.open) {
						dropdown.open = false;
					}
				});
			}
		}, 0);
	}
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

<div class="navbar bg-base-100 shadow-sm mb-4">
	<div class="flex-1">
		<a href="/" class="btn btn-ghost text-xl">Reflectie</a>
	</div>
	<div class="flex-none">
		<ul class="menu menu-horizontal px-1">
			<li><a href="/upload-transactions">Upload transactions</a></li>
			<li>
				<details use:registerDropdown ontoggle={handleDetailsToggle}>
					<summary>Enrich data</summary>
					<ul class="bg-base-100 rounded-t-none p-2 w-52">
						<li><a href="/enrich/categorize">Categorize transactions</a></li>
					</ul>
				</details>
			</li>
			<li>
				<details use:registerDropdown ontoggle={handleDetailsToggle}>
					<summary>Analyze data</summary>
					<ul class="bg-base-100 rounded-t-none p-2 w-52">
						<li><a href="/analyze/salary">Find salary</a></li>
						<li><a href="/analyze/subscriptions">Find subscriptions</a></li>
					</ul>
				</details>
			</li>
		</ul>
	</div>
	<div class="flex-none">
		{#if data.user}
			<button onclick={signOut} class="btn btn-ghost">Logout</button>
		{:else}
			<a href="/signin" class="btn btn-ghost">Login</a>
		{/if}
	</div>
</div>

<div class="content-container">
	{@render children()}
</div>
