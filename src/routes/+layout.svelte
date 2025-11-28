<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { Sun, Moon, User } from 'lucide-svelte';
	import TaskSidebar from '$lib/components/TaskSidebar.svelte';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';
	import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';
	
	let sidebarExpanded = $state(false);
	
	function handleSidebarExpandedChange(expanded: boolean) {
		sidebarExpanded = expanded;
	}
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();
	
	// Hide sidebar on categorize-all page
	const showSidebar = $derived(!$page.url.pathname.includes('/categorize-all'));

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

<div class="navbar bg-base-100 shadow-sm mb-4 relative">
	<div class="flex-1">
		<a href="/" class="btn btn-ghost text-xl"><span class="mirror-r">R</span>eflect</a>
	</div>
	<div class="absolute left-1/2 transform -translate-x-1/2">
		<ul class="menu menu-horizontal px-1">
			<li>
				<details use:registerDropdown ontoggle={handleDetailsToggle}>
					<summary>Transactions</summary>
					<ul class="bg-base-100 rounded-t-none p-2 w-52">
						<li><a href="/upload-transactions" onclick={closeDropdownOnLinkClick}>Upload transactions</a></li>
						<li><a href="/transactions" onclick={closeDropdownOnLinkClick}>View transactions</a></li>
					</ul>
				</details>
			</li>
			<li>
				<details use:registerDropdown ontoggle={handleDetailsToggle}>
					<summary>Enrich data</summary>
					<ul class="bg-base-100 rounded-t-none p-2 w-52">
						<li><a href="/categories" onclick={closeDropdownOnLinkClick}>Category Management</a></li>
						<li><a href="/categorize-all" onclick={closeDropdownOnLinkClick}>Categorize all transactions</a></li>
					</ul>
				</details>
			</li>
			<li>
				<details use:registerDropdown ontoggle={handleDetailsToggle}>
					<summary>Analyze data</summary>
					<ul class="bg-base-100 rounded-t-none p-2 w-52">
						<li><a href="/analyze/salary" onclick={closeDropdownOnLinkClick}>Find salary</a></li>
						<li><a href="/analyze/subscriptions" onclick={closeDropdownOnLinkClick}>Find subscriptions</a></li>
					</ul>
				</details>
			</li>
		</ul>
	</div>
	<div class="flex-1 flex justify-end items-center gap-2">
		{#if data.user}
			<details use:registerDropdown ontoggle={handleDetailsToggle} class="dropdown dropdown-end">
				<summary class="btn btn-ghost gap-2">
					<User size={20} />
					<span>{data.user.username}</span>
				</summary>
				<ul class="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow-lg">
					<li><a href="/merchants" onclick={closeDropdownOnLinkClick}>Merchant management</a></li>
					<li class="my-2">
						<div class="border-t border-base-300"></div>
					</li>
					<li><a href="/test-ai-categorize" onclick={closeDropdownOnLinkClick}>Test AI categorization</a></li>
					<li><a href="/test-ai-categorize-v2" onclick={closeDropdownOnLinkClick}>Test AI categorization v2</a></li>
					<li><a href="/categories/generate-embeddings" onclick={closeDropdownOnLinkClick}>Generate category embeddings</a></li>
					<li class="my-2">
						<div class="border-t border-base-300"></div>
					</li>
					<li>
						<label class="flex cursor-pointer gap-2 items-center">
							<input
								type="checkbox"
								checked={currentTheme === 'night'}
								onchange={toggleTheme}
								class="toggle theme-controller"
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
	<!-- Sidebar and content wrapper -->
	<div class="flex items-stretch min-w-0">
		{#if showSidebar}
			<!-- Sidebar - always visible, collapses on mobile -->
			<div class="pt-2 pr-2 lg:pr-4 flex-shrink-0">
				<div class="h-full">
					<TaskSidebar onExpandedChange={handleSidebarExpandedChange} />
				</div>
			</div>
		{/if}
		
		<!-- Main content -->
		<div class="flex-1 pt-2 {showSidebar ? 'pl-2 lg:pl-4' : 'px-2 lg:px-4'} transition-all duration-300 min-w-0">
			<div class="bg-base-100 shadow-sm p-8 min-h-full min-w-0" style="overflow-x: hidden; max-width: 100%; box-sizing: border-box;">
				<div class="lg:contents {sidebarExpanded ? 'invisible' : ''}">
					{@render children()}
				</div>
			</div>
		</div>
	</div>
{:else}
	<!-- No drawer for unauthenticated users -->
	<div class="bg-base-100 shadow-md p-8">
		{@render children()}
	</div>
{/if}
