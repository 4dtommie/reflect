<script lang="ts">
	import type { Snippet } from 'svelte';
	import Card from '$lib/components/mobile/Card.svelte';
	import { Badge } from '$lib/components/mobile/atoms';

	interface TransactionGroupData {
		dateLabel: string;
		formattedIncoming?: string;
		formattedOutgoing?: string;
		incomingCount?: number;
		outgoingCount?: number;
	}

	interface Props {
		group: TransactionGroupData;
		children: Snippet;
		class?: string;
	}

	let { group, children, class: className = '' }: Props = $props();
</script>

<section class={className}>
	<div class="mb-3 flex items-baseline gap-3 px-1">
		<h2 class="font-heading text-base font-bold text-gray-1000 dark:text-white">
			{group.dateLabel}
		</h2>
		{#if group.incomingCount && group.incomingCount > 1 && group.formattedIncoming}
			<Badge variant="success" size="sm">
				{group.formattedIncoming}
			</Badge>
		{/if}
		{#if group.outgoingCount && group.outgoingCount > 1 && group.formattedOutgoing}
			<Badge variant="neutral" size="sm">
				{group.formattedOutgoing}
			</Badge>
		{/if}
	</div>
	<Card padding="p-0">
		<div class="divide-y divide-gray-100 dark:divide-gray-800">
			{@render children()}
		</div>
	</Card>
</section>
