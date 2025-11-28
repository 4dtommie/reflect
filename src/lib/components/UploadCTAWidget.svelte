<script lang="ts">
	import DashboardWidget from './DashboardWidget.svelte';
	import { FileUp } from 'lucide-svelte';

	let { hasTransactions }: { hasTransactions: boolean } = $props();
</script>

{#if !hasTransactions}
	<DashboardWidget title="Upload transactions" size="medium">
		{#snippet icon()}
			<FileUp size={24} />
		{/snippet}

		<div class="flex h-full flex-col items-center justify-center gap-6">
			<p class="text-center text-base-content/70">
				Upload your bank transactions to get started with insights
			</p>
			<a href="/upload-transactions" class="btn w-full btn-primary"> Upload transactions </a>
		</div>
	</DashboardWidget>
{/if}
