<script lang="ts">
	import Amount from '$lib/components/Amount.svelte';
	import { ChevronDown, ChevronUp } from 'lucide-svelte';
	import { slide } from 'svelte/transition';

	let { candidate }: { candidate: any } = $props();
	let expanded = $state(false);

	function toggle() {
		expanded = !expanded;
	}
</script>

<div class="rounded-lg bg-base-200 transition-all duration-200">
	<button
		class="flex w-full cursor-pointer items-center justify-between p-4 text-left focus:outline-none"
		onclick={toggle}
	>
		<div class="flex items-center gap-3">
			{#if expanded}
				<ChevronUp size={20} class="opacity-50" />
			{:else}
				<ChevronDown size={20} class="opacity-50" />
			{/if}
			<h3 class="font-bold">{candidate.name}</h3>
		</div>

		<div class="flex items-center gap-3 text-right">
			<div class="text-lg font-bold">
				<Amount
					value={candidate.averageAmount}
					size="medium"
					isDebit={!['salary', 'tax', 'transfer'].includes(candidate.type)}
				/>
			</div>
			<div class="badge badge-sm badge-primary">
				{candidate.interval}
			</div>
		</div>
	</button>

	{#if expanded}
		<div transition:slide class="px-4 pt-0 pb-4">
			<div class="divider my-2"></div>
			<div class="grid grid-cols-2 gap-4 text-sm">
				<div>
					<p class="opacity-70">Transactions found</p>
					<p>{candidate.transactions.length}</p>
				</div>

				<div>
					<p class="opacity-70">Latest Amount</p>
					<Amount
						value={candidate.amount}
						size="small"
						isDebit={!['salary', 'tax', 'transfer'].includes(candidate.type)}
					/>
				</div>

				<div>
					<p class="opacity-70">Confidence</p>
					<div
						class="badge badge-sm {candidate.confidence > 0.8 ? 'badge-success' : 'badge-warning'}"
					>
						{Math.round(candidate.confidence * 100)}% sure
					</div>
				</div>

				{#if candidate.nextPaymentDate}
					<div>
						<p class="opacity-70">Next Payment</p>
						<p>
							{new Date(candidate.nextPaymentDate).toLocaleDateString('en-US', {
								month: 'short',
								day: 'numeric'
							})}
						</p>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
