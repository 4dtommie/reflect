<script lang="ts">
	import { Search } from 'lucide-svelte';
	import { detectionStore } from '$lib/stores/detectionStore';

	// Subscribe to store
	const state = $derived($detectionStore);
</script>

{#if state.showModal}
	<div class="modal-open modal">
		<div class="modal-box max-w-md">
			<h3 class="flex items-center gap-2 text-lg font-bold">
				<Search size={20} class="text-primary" />
				Detecting patterns...
			</h3>

			<div class="py-6">
				<!-- Progress bar -->
				<div class="mb-4">
					<progress class="progress w-full progress-primary" value={state.progress} max="100"
					></progress>
				</div>

				<!-- Status text -->
				<p class="text-center opacity-70">
					{#if state.isDetecting}
						<span class="loading mr-2 loading-xs loading-spinner"></span>
					{/if}
					{state.status}
				</p>

				<!-- Error message -->
				{#if state.error}
					<div class="mt-4 alert alert-error">
						<span>{state.error}</span>
					</div>
					<div class="modal-action">
						<button class="btn" onclick={() => detectionStore.close()}>Close</button>
						<button class="btn btn-primary" onclick={() => detectionStore.runDetection()}
							>Retry</button
						>
					</div>
				{/if}
			</div>
		</div>
		<button
			class="modal-backdrop"
			onclick={() => !state.isDetecting && detectionStore.close()}
			disabled={state.isDetecting}
		></button>
	</div>
{/if}
