<script lang="ts">
	import { X } from 'lucide-svelte';
	import { fly, fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import type { Snippet } from 'svelte';
	import { mobileThemeName } from '$lib/stores/mobileTheme';

	interface Props {
		open: boolean;
		onClose: () => void;
		title?: string;
		children: Snippet;
	}

	let { open = $bindable(false), onClose, title = '', children }: Props = $props();

	// Theme check
	const isRebrand = $derived($mobileThemeName === 'rebrand');

	// Handle backdrop click
	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	// Handle escape key
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- Backdrop -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
		transition:fade={{ duration: 200 }}
		onclick={handleBackdropClick}
	>
		<!-- Sheet -->
		<div
			class="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-hidden rounded-t-3xl shadow-2xl {isRebrand ? 'bottom-sheet-glassy' : 'bg-white dark:bg-gray-900'}"
			transition:fly={{ y: 300, duration: 300, easing: cubicOut }}
		>
			<!-- Drag handle -->
			<div class="flex justify-center pt-3 pb-2">
				<div class="h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-600"></div>
			</div>

			<!-- Header -->
			{#if title}
				<div class="flex items-center justify-between border-b border-gray-100 px-4 pb-3 dark:border-gray-800 {isRebrand ? 'border-white/20' : ''}">
					<h2 class="font-heading text-lg font-bold text-gray-1000 dark:text-white">{title}</h2>
					<button
						onclick={onClose}
						class="rounded-full p-2 hover:bg-gray-100 active:bg-gray-200 dark:hover:bg-gray-800 dark:active:bg-gray-700 {isRebrand ? 'hover:bg-black/5 active:bg-black/10' : ''}"
					>
						<X class="h-5 w-5 text-gray-500" strokeWidth={2} />
					</button>
				</div>
			{/if}

			<!-- Content -->
			<div class="overflow-y-auto overscroll-contain px-4 pt-2 pb-8" style="max-height: calc(85vh - 80px)">
				{@render children()}
			</div>

			<!-- Safe area for home indicator -->
			<div class="h-[env(safe-area-inset-bottom)]"></div>
		</div>
	</div>
{/if}

<style>
	.bottom-sheet-glassy {
		background: rgba(255, 255, 255, 0.85);
		backdrop-filter: blur(24px) saturate(1.8);
		-webkit-backdrop-filter: blur(24px) saturate(1.8);
		border-top: 1px solid rgba(255, 255, 255, 0.6);
	}

	:global(.dark) .bottom-sheet-glassy {
		background: rgba(30, 30, 30, 0.85);
		border-top: 1px solid rgba(255, 255, 255, 0.08);
	}
</style>
