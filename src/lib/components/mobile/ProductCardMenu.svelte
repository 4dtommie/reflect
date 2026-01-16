<script lang="ts">
	import type { Component } from 'svelte';
	import { MoreHorizontal, X, Pencil, ArrowUpDown, ArrowUp, ArrowDown, Eye, Bell, Copy } from 'lucide-svelte';
	import { onMount } from 'svelte';

	// Use a permissive type for icons to support Lucide components
	type IconComponent = Component<any> | (new (...args: any[]) => any) | ((...args: any[]) => any);

	interface QuickAction {
		label: string;
		icon: IconComponent;
		onclick?: () => void;
	}

	interface Props {
		/** Product ID for reference */
		productId: string | number;
		/** Quick action buttons */
		quickActions?: QuickAction[];
		/** Called when edit name is clicked */
		onEditName?: () => void;
		/** Called when rearrange is clicked */
		onRearrange?: () => void;
		/** Called when menu open state changes */
		onOpenChange?: (isOpen: boolean) => void;
		/** Additional classes */
		class?: string;
	}

	let {
		productId,
		quickActions = [],
		onEditName,
		onRearrange,
		onOpenChange,
		class: className = ''
	}: Props = $props();

	let isOpen = $state(false);
	let menuRef: HTMLDivElement | undefined = $state();

	function toggleMenu(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		isOpen = !isOpen;
		onOpenChange?.(isOpen);
	}

	function closeMenu() {
		isOpen = false;
		onOpenChange?.(false);
	}

	function handleAction(action: () => void | undefined) {
		return (e: MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();
			action?.();
			closeMenu();
		};
	}

	// Close on click outside
	function handleClickOutside(e: MouseEvent) {
		if (menuRef && !menuRef.contains(e.target as Node)) {
			closeMenu();
		}
	}

	onMount(() => {
		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	});
</script>

<div class="relative {className}" bind:this={menuRef}>
	<!-- More Button -->
	<button
		type="button"
		onclick={toggleMenu}
		class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 active:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800 dark:active:bg-gray-700"
		aria-label="More options"
	>
		<MoreHorizontal class="h-5 w-5" strokeWidth={2} />
	</button>

	<!-- Dropdown Menu -->
	{#if isOpen}
		<div
			class="absolute right-0 top-full z-[100] mt-1 min-w-[200px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
		>
			<!-- Quick Actions Section -->
			{#if quickActions.length > 0}
				<div class="border-b border-gray-100 p-2 dark:border-gray-800">
					<div class="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">
						Snelle acties
					</div>
					{#each quickActions as action}
						{@const ActionIcon = action.icon}
						<button
							type="button"
							onclick={handleAction(action.onclick ?? (() => {}))}
							class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 active:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800 dark:active:bg-gray-700"
						>
							<ActionIcon class="h-4 w-4 text-gray-500 dark:text-gray-400" strokeWidth={1.5} />
							{action.label}
						</button>
					{/each}
				</div>
			{/if}

			<!-- Edit Section -->
			<div class="p-2">
				<div class="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">
					Bewerken
				</div>
				<button
					type="button"
					onclick={handleAction(onEditName ?? (() => {}))}
					class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 active:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800 dark:active:bg-gray-700"
				>
					<Pencil class="h-4 w-4 text-gray-500 dark:text-gray-400" strokeWidth={1.5} />
					Naam bewerken
				</button>
				<button
					type="button"
					onclick={handleAction(onRearrange ?? (() => {}))}
					class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 active:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800 dark:active:bg-gray-700"
				>
					<ArrowUpDown class="h-4 w-4 text-gray-500 dark:text-gray-400" strokeWidth={1.5} />
					Volgorde wijzigen
				</button>
			</div>
		</div>
	{/if}
</div>
