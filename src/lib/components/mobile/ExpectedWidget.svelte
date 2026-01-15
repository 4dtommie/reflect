<script lang="ts">
	import Card from './Card.svelte';
	import WidgetHeader from './WidgetHeader.svelte';
	import WidgetAction from './WidgetAction.svelte';
	import TransactionItem from './TransactionItem.svelte';
	import MobileLink from './MobileLink.svelte';
	import { mobileThemeName } from '$lib/stores/mobileTheme';
	import { page } from '$app/stores';

	interface ExpectedItem {
		id: number;
		transactionId?: number | null;
		merchant: string;
		subtitle: string;
		amount: number;
		isDebit: boolean;
		logo?: string | null;
		icon?: string | null;
		daysUntil: number;
		date?: string;
	}

	let { items = [] as ExpectedItem[] }: { items?: ExpectedItem[] } = $props();

	// Simple theme check
	const isOriginal = $derived($mobileThemeName === 'nn-original');
	// Theme-aware dividers (original shows no dividers, improved shows dividers)
	const dividerClasses = $derived(isOriginal ? '' : 'divide-y divide-gray-100 dark:divide-gray-1100');

	// Format daysUntil as badge text
	function formatDaysBadge(days: number): string {
		if (days === 0) return 'vandaag';
		if (days === 1) return 'morgen';
		return `${days} dagen`;
	}

	// Format daysUntil as subline text for original theme
	function formatDaysSubline(days: number): string {
		if (days === 0) return 'vandaag';
		if (days === 1) return 'morgen';
		return `over ${days} dagen`;
	}
</script>

<section class="mt-6">
	<WidgetHeader title="Verwacht" class="mb-3">
		<WidgetAction label="Kijk vooruit" href="/mobile/kijk-vooruit" />
	</WidgetHeader>

	<Card padding="p-0">
		<div class={dividerClasses}>
			{#each items as item}
				{#if item.transactionId}
					<MobileLink 
						href={`/mobile/transactions/${item.transactionId}?from=${encodeURIComponent($page.url.pathname + $page.url.search)}`}
						class="dark:active:bg-gray-1100 block w-full px-4 py-3 text-left active:bg-gray-50"
					>
						<TransactionItem
							merchant={item.merchant}
							subtitle={isOriginal ? formatDaysSubline(item.daysUntil) : item.subtitle}
							amount={item.isDebit ? -item.amount : item.amount}
							isDebit={item.isDebit}
							categoryIcon={item.icon ?? null}
							size="md"
							useLogo={true}
							showChevron={true}
							designVariant={isOriginal ? 'original' : 'redesign'}
							date={item.date}
							description={item.subtitle}
							showSubtitle={isOriginal}
							expectedBadge={!isOriginal ? formatDaysBadge(item.daysUntil) : undefined}
						/>
					</MobileLink>
				{:else}
					<div class="dark:active:bg-gray-1100 block w-full px-4 py-3 text-left active:bg-gray-50">
						<TransactionItem
							merchant={item.merchant}
							subtitle={isOriginal ? formatDaysSubline(item.daysUntil) : item.subtitle}
							amount={item.isDebit ? -item.amount : item.amount}
							isDebit={item.isDebit}
							categoryIcon={item.icon ?? null}
							size="md"
							useLogo={true}
							showChevron={true}
							designVariant={isOriginal ? 'original' : 'redesign'}
							date={item.date}
							description={item.subtitle}
							showSubtitle={isOriginal}
							expectedBadge={!isOriginal ? formatDaysBadge(item.daysUntil) : undefined}
						/>
					</div>
				{/if}
			{:else}
				<div class="p-8 text-center text-sm text-gray-500">Geen verwachte betalingen gevonden.</div>
			{/each}
		</div>
	</Card>
</section>
