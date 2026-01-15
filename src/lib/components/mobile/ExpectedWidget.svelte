<script lang="ts">
	import Card from './Card.svelte';
	import WidgetHeader from './WidgetHeader.svelte';
	import WidgetAction from './WidgetAction.svelte';
	import TransactionItem from './TransactionItem.svelte';
	import { mobileTheme, mobileThemeName } from '$lib/stores/mobileTheme';

	interface ExpectedItem {
		id: string;
		merchant: string;
		subtitle: string;
		amount: number;
		isDebit: boolean;
		logo?: string | null;
		icon?: string | null;
		daysUntil: number;
		date?: string;
	}

	let { items = [] }: { items: ExpectedItem[] } = $props();

	const theme = $derived($mobileTheme);
	const dividerClasses = $derived(theme.listItem.showDividers ? 'divide-y divide-gray-100 dark:divide-gray-1100' : '');

	// Format daysUntil as badge text
	function formatDaysBadge(days: number): string {
		if (days === 0) return 'vandaag';
		if (days === 1) return 'morgen';
		return `${days} dagen`;
	}
</script>

<section class="mt-6">
	<WidgetHeader title="Verwacht" class="mb-3">
		<WidgetAction label="Kijk vooruit" href="/mobile/kijk-vooruit" />
	</WidgetHeader>

	<Card padding="p-0">
		<div class={dividerClasses}>
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
						designVariant={$mobileThemeName === 'nn-original' ? 'original' : 'redesign'}
						date={item.date}
						description={item.subtitle}
						showSubtitle={$mobileThemeName === 'nn-original'}
						expectedBadge={$mobileThemeName !== 'nn-original' ? formatDaysBadge(item.daysUntil) : undefined}
					/>
				</button>
			{:else}
				<div class="p-8 text-center text-sm text-gray-500">Geen verwachte betalingen gevonden.</div>
			{/each}
		</div>
	</Card>
</section>
