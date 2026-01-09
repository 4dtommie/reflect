<script lang="ts">
	import Card from './Card.svelte';
	import WidgetHeader from './WidgetHeader.svelte';
	import WidgetAction from './WidgetAction.svelte';
	import Amount from './Amount.svelte';
	import { ChevronRight } from 'lucide-svelte';
	import MerchantLogo from '../MerchantLogo.svelte';

	let { items = [] } = $props();
</script>

<section class="mt-6">
	<WidgetHeader title="Verwacht" class="mb-3">
		<WidgetAction label="Kijk vooruit" href="/mobile/kijk-vooruit" />
	</WidgetHeader>

	<Card padding="p-0">
		<div class="dark:divide-gray-1100 divide-y divide-gray-100">
			{#each items as item}
				<div class="flex items-center justify-between px-4 py-3">
					<div class="flex min-w-0 flex-1 items-center gap-3">
						<div class="h-6 w-6 shrink-0">
							<MerchantLogo merchantName={item.merchant} categoryIcon={item.icon} size="xs" />
						</div>
						<div class="flex min-w-0 items-center gap-2">
							<div class="truncate text-[14px] font-normal text-gray-900 dark:text-white">
								{item.merchant}
							</div>
							<div
								class="dark:bg-gray-1100 shrink-0 rounded-full bg-sand-100 px-2 py-0.5 text-[10px] font-bold text-gray-600 dark:text-gray-400"
							>
								{item.subtitle}
							</div>
						</div>
					</div>
					<div class="flex shrink-0 items-center">
						{#if !item.isDebit}
							<div
								class="dark:bg-green-1100/50 rounded-[10px] bg-green-100 px-2 py-0.5 font-bold text-green-700 dark:text-green-400"
							>
								<Amount
									amount={item.amount}
									showSign={true}
									showSymbol={false}
									size="sm"
									flat={true}
									class="!text-green-800 dark:!text-green-400"
								/>
							</div>
						{:else}
							<Amount
								amount={-item.amount}
								showSign={true}
								showSymbol={false}
								size="sm"
								flat={true}
								class="font-bold !text-gray-900 dark:!text-white"
							/>
						{/if}
						<ChevronRight class="ml-1 h-3.5 w-3.5 text-gray-400" strokeWidth={2} />
					</div>
				</div>
			{:else}
				<div class="p-8 text-center text-sm text-gray-500">Geen verwachte betalingen gevonden.</div>
			{/each}
		</div>
	</Card>
</section>
