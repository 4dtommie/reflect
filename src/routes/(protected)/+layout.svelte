<script lang="ts">
	import DetectionModal from '$lib/components/DetectionModal.svelte';
	import TransactionDetailsModal from '$lib/components/TransactionDetailsModal.svelte';
	import RecurringDetailsModal from '$lib/components/RecurringDetailsModal.svelte';
	let { children }: { children: import('svelte').Snippet } = $props();
</script>

{@render children()}

<!-- Global detection modal - can be triggered from anywhere -->
<DetectionModal />

<!-- Global transaction details modal - can be triggered from anywhere -->
<TransactionDetailsModal />

<!-- Global recurring details modal - can be triggered from anywhere -->
<RecurringDetailsModal />
