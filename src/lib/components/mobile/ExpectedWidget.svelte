<script lang="ts">
	import Card from './Card.svelte';
	import WidgetHeader from './WidgetHeader.svelte';
	import WidgetAction from './WidgetAction.svelte';
	import TransactionItem from './TransactionItem.svelte';

	let { items = [] } = $props();
</script>

<section class="mt-6">
	<WidgetHeader title="Verwacht" class="mb-3">
		<WidgetAction label="Kijk vooruit" href="/mobile/kijk-vooruit" />
	</WidgetHeader>

	<Card padding="p-0">
		<div class="dark:divide-gray-1100 divide-y divide-gray-100">
			{#each items as item}
				<button class="dark:active:bg-gray-1100 block w-full px-4 py-3 text-left active:bg-gray-50">
					<TransactionItem
						merchant={item.merchant}
						subtitle={item.subtitle}
						amount={item.isDebit ? -item.amount : item.amount}
						isDebit={item.isDebit}
						categoryIcon={item.icon}
						compact={false}
						useLogo={true}
						showChevron={true}
					/>
				</button>
			{:else}
				<div class="p-8 text-center text-sm text-gray-500">Geen verwachte betalingen gevonden.</div>
			{/each}
		</div>
	</Card>
</section>
