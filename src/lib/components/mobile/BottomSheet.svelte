<script lang="ts">
	import { X } from 'lucide-svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		open: boolean;
		onClose: () => void;
		title?: string;
		children: Snippet;
	}

	let { open = $bindable(false), onClose, title = '', children }: Props = $props();

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
		class="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-opacity duration-300"
		onclick={handleBackdropClick}
	>
		<!-- Sheet -->
		<div
			class="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-hidden rounded-t-3xl bg-white shadow-2xl transition-transform duration-300 dark:bg-gray-900"
			style="transform: translateY(0)"
		>
			<!-- Drag handle -->
			<div class="flex justify-center pt-3 pb-2">
				<div class="h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-600"></div>
			</div>

			<!-- Header -->
			{#if title}
				<div class="flex items-center justify-between border-b border-gray-100 px-4 pb-3 dark:border-gray-800">
					<h2 class="font-heading text-lg font-bold text-gray-1000 dark:text-white">{title}</h2>
					<button
						onclick={onClose}
						class="rounded-full p-2 hover:bg-gray-100 active:bg-gray-200 dark:hover:bg-gray-800 dark:active:bg-gray-700"
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
