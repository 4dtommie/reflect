<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { goto, invalidateAll } from '$app/navigation';
	import { page, navigating } from '$app/stores';
	import { User, LayoutDashboard, List, Zap, Loader2 } from 'lucide-svelte';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';
	import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';

	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	// Reset environment state
	let showResetModal = $state(false);
	let resetting = $state(false);
	let resetError = $state<string | null>(null);
	let resetSuccess = $state(false);

	async function handleResetEnvironment() {
		resetting = true;
		resetError = null;
		resetSuccess = false;

		try {
			const response = await fetch('/api/reset-environment', {
				method: 'POST'
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to reset environment');
			}

			resetSuccess = true;
			// Refresh the page after a short delay to show updated data
			setTimeout(() => {
				window.location.reload();
			}, 1500);
		} catch (err) {
			resetError = err instanceof Error ? err.message : 'Unknown error occurred';
		} finally {
			resetting = false;
		}
	}

	function openResetModal() {
		showResetModal = true;
		resetError = null;
		resetSuccess = false;
	}

	function closeResetModal() {
		showResetModal = false;
		resetError = null;
		resetSuccess = false;
	}

	let currentTheme = $state<'nord' | 'night'>('nord');

	// Initialize theme from localStorage or system preference
	onMount(() => {
		const storedTheme = localStorage.getItem('theme') as 'nord' | 'night' | null;
		if (storedTheme) {
			currentTheme = storedTheme;
			document.documentElement.setAttribute('data-theme', storedTheme);
		} else {
			// Check system preference
			if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
				currentTheme = 'night';
				document.documentElement.setAttribute('data-theme', 'night');
			} else {
				currentTheme = 'nord';
				document.documentElement.setAttribute('data-theme', 'nord');
			}
		}

		// Initialize Vercel Analytics and Speed Insights
		injectAnalytics();
		injectSpeedInsights();
	});

	function toggleTheme() {
		currentTheme = currentTheme === 'nord' ? 'night' : 'nord';
		document.documentElement.setAttribute('data-theme', currentTheme);
		localStorage.setItem('theme', currentTheme);
	}

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

	function closeDropdownOnLinkClick(event: MouseEvent) {
		const link = event.currentTarget as HTMLElement;
		const details = link.closest('details') as HTMLDetailsElement;
		if (details) {
			details.open = false;
		}
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		// Check if click is inside any dropdown (details element)
		// This includes clicks on summary and links inside the dropdown
		const clickedInsideDropdown = target.closest('details');

		if (!clickedInsideDropdown) {
			// Close all open dropdowns when clicking outside
			dropdowns.forEach((dropdown) => {
				if (dropdown.open) {
					dropdown.open = false;
				}
			});
		}
	}

	// Add click outside listener
	let clickOutsideCleanup: (() => void) | null = null;
	if (typeof document !== 'undefined') {
		document.addEventListener('click', handleClickOutside);
		clickOutsideCleanup = () => {
			document.removeEventListener('click', handleClickOutside);
		};
	}

	// Cleanup on component destroy
	onDestroy(() => {
		if (clickOutsideCleanup) {
			clickOutsideCleanup();
		}
	});

	const navItems = [
		{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
		{ href: '/transactions', label: 'Transactions', icon: List },
		{ href: '/actions', label: 'Actions', icon: Zap }
	];

	const isActive = (href: string) => {
		return $page.url.pathname === href || $page.url.pathname.startsWith(href + '/');
	};
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Rubik:ital,wght@0,300..900;1,300..900&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<!-- Animated gradient blobs background -->
<div class="gradient-blob-container" aria-hidden="true">
	<div class="gradient-blob gradient-blob-1"></div>
	<div class="gradient-blob gradient-blob-2"></div>
	<div class="gradient-blob gradient-blob-3"></div>
	<div class="gradient-blob gradient-blob-4"></div>
</div>

<div class="navbar mb-4 px-0">
	<!-- Logo on left -->
	<div class="navbar-start">
		<a href="/" class="btn-white-swoosh btn rounded-full px-6 text-xl shadow-sm">
			<span class="mirror-r">R</span>eflect
		</a>
	</div>

	<!-- Navigation links in center (only for authenticated users) -->
	<div class="navbar-center">
		{#if data.user}
			<ul class="menu menu-horizontal gap-2 px-1">
				{#each navItems as { href, label, icon: Icon }, i}
					<li>
						<a
							{href}
							class="btn {isActive(href)
								? 'btn-active-grey'
								: 'btn-white-swoosh'} gap-2 rounded-full px-6 shadow-sm"
						>
							<Icon size={20} />
							<span class="hidden font-medium md:inline">{label}</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<!-- User menu on right -->
	<div class="navbar-end">
		{#if data.user}
			<details use:registerDropdown ontoggle={handleDetailsToggle} class="dropdown dropdown-end">
				<summary class="btn-white-swoosh btn gap-2 rounded-full px-6 shadow-sm">
					<User size={20} />
					<span class="hidden sm:inline">{data.user.username}</span>
				</summary>
				<ul class="dropdown-content menu z-[1] w-52 rounded-box bg-base-100 p-2 shadow-lg">
					<li><a href="/merchants" onclick={closeDropdownOnLinkClick}>Merchant management</a></li>
					<li><a href="/insights" onclick={closeDropdownOnLinkClick}>Insight rules</a></li>
					<li>
						<a href="/insights/capabilities" onclick={closeDropdownOnLinkClick}>Chat capabilities</a
						>
					</li>
					<li class="my-2">
						<div class="border-t border-base-300"></div>
					</li>
					<!--
					<li>
						<a href="/test-ai-categorize" onclick={closeDropdownOnLinkClick}
							>Test AI categorization</a
						>
					</li>
					<li>
						<a href="/test-ai-categorize-v2" onclick={closeDropdownOnLinkClick}
							>Test AI categorization v2</a
						>
					</li>
					<li>
						<a href="/categories/generate-embeddings" onclick={closeDropdownOnLinkClick}
							>Generate category embeddings</a
						>
					</li>
					<li class="my-2">
						<div class="border-t border-base-300"></div>
					</li>
					-->
					<li>
						<button
							onclick={(e) => {
								const details = (e.currentTarget as HTMLElement).closest(
									'details'
								) as HTMLDetailsElement;
								if (details) details.open = false;
								openResetModal();
							}}
							class="w-full text-left text-error"
						>
							Reset environment
						</button>
					</li>
					<li class="my-2">
						<div class="border-t border-base-300"></div>
					</li>
					<li>
						<label class="flex cursor-pointer items-center gap-2">
							<input
								type="checkbox"
								checked={currentTheme === 'night'}
								onchange={toggleTheme}
								class="theme-controller toggle"
							/>
							<span>Dark mode</span>
						</label>
					</li>
					<li class="my-2">
						<div class="border-t border-base-300"></div>
					</li>
					<li><button onclick={signOut} class="w-full text-left">Logout</button></li>
				</ul>
			</details>
		{:else}
			<a href="/signin" class="btn btn-ghost">Login</a>
		{/if}
	</div>
</div>

{#if data.user}
	<!-- Main content wrapper -->
	<div class="min-w-0 flex-1">
		<div class="min-h-full min-w-0" style="box-sizing: border-box;">
			{#if $navigating}
				<!-- Loading spinner during navigation -->
				<div class="flex min-h-[50vh] items-center justify-center">
					<div class="flex flex-col items-center gap-4">
						<Loader2 size={48} class="animate-spin text-primary" />
						<p class="text-base-content/60">Loading...</p>
					</div>
				</div>
			{:else}
				{@render children()}
			{/if}
		</div>
	</div>
{:else}
	<!-- No drawer for unauthenticated users -->
	{@render children()}
{/if}

<!-- Reset Environment Confirmation Modal -->
{#if showResetModal}
	<div class="modal-open modal">
		<div class="modal-box">
			<h3 class="mb-4 text-lg font-bold text-error">⚠️ Reset environment</h3>
			<p class="py-2 font-semibold">This action will permanently delete:</p>
			<ul class="mb-4 list-inside list-disc space-y-1">
				<li>All transactions</li>
				<li>All categories (including custom ones)</li>
				<li>All category keywords</li>
				<li>All merchants</li>
				<li>All user category preferences</li>
			</ul>
			<p class="mb-4 py-2">Default categories will be recreated after deletion.</p>
			<p class="py-2 font-semibold text-error">This action cannot be undone!</p>

			{#if resetError}
				<div class="mt-4 alert alert-error">
					<span>{resetError}</span>
				</div>
			{/if}

			{#if resetSuccess}
				<div class="mt-4 alert alert-success">
					<span>✅ Environment reset successfully! Page will refresh shortly...</span>
				</div>
			{/if}

			<div class="modal-action">
				<button class="btn" onclick={closeResetModal} disabled={resetting}> Cancel </button>
				<button
					class="btn btn-error"
					onclick={handleResetEnvironment}
					disabled={resetting || resetSuccess}
				>
					{#if resetting}
						<span class="loading loading-sm loading-spinner"></span>
						Resetting...
					{:else}
						Confirm reset
					{/if}
				</button>
			</div>
		</div>
		<button class="modal-backdrop" onclick={closeResetModal} aria-label="Close modal"></button>
	</div>
{/if}
