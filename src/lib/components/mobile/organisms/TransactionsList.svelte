<script lang="ts">
	import { page } from '$app/stores';
	import Card from '$lib/components/mobile/Card.svelte';
	import WidgetHeader from '$lib/components/mobile/WidgetHeader.svelte';
	import WidgetAction from '$lib/components/mobile/WidgetAction.svelte';
	import TransactionItem from '$lib/components/mobile/TransactionItem.svelte';
	import MobileLink from '$lib/components/mobile/MobileLink.svelte';
	import { TransactionListSkeleton, TransactionGroup } from '$lib/components/mobile/organisms';
	import { mobileThemeName } from '$lib/stores/mobileTheme';

	interface UpcomingTransaction {
		id?: string;
		merchant: string;
		amount: number;
		isDebit: boolean;
		categoryIcon?: string;
		interval?: string;
		daysUntil?: number;
		category?: string;
		categoryColor?: string;
		nextDate?: string;
		daysLabel?: string;
		date?: string;
		subtitle?: string;
	}

	interface GroupedTransaction {
		id: string;
		merchant: string;
		amount: number;
		isDebit: boolean;
		categoryIcon?: string;
		category?: string;
		date?: string;
		nextDate?: string;
		description?: string;
		note?: string;
	}

	interface TransactionGroupData {
		dateLabel: string;
		formattedIncoming?: string;
		formattedOutgoing?: string;
		incomingCount?: number;
		outgoingCount?: number;
		transactions: GroupedTransaction[];
	}

	interface Props {
		isLoading?: boolean;
		upcomingTransactions?: UpcomingTransaction[];
		groupedTransactions?: TransactionGroupData[];
		kijkVooruitLink?: string;
		onUpcomingClick?: (transaction: UpcomingTransaction) => void;
		formatRecurringSubtitle?: (interval?: string, daysUntil?: number) => string;
		showUpcomingChevron?: boolean;
		class?: string;
	}

	let {
		isLoading = false,
		upcomingTransactions = [],
		groupedTransactions = [],
		kijkVooruitLink = '/mobile/kijk-vooruit',
		onUpcomingClick,
		formatRecurringSubtitle = (interval?: string, daysUntil?: number) => {
			if (!interval || daysUntil === undefined) return '';
			if (daysUntil === 0) return 'Vandaag';
			if (daysUntil === 1) return 'Morgen';
			return `Over ${daysUntil} dagen`;
		},
		showUpcomingChevron = false,
		class: className = ''
	}: Props = $props();

	// Simple theme check
	const isOriginal = $derived($mobileThemeName === 'nn-original');
	const isRebrand = $derived($mobileThemeName === 'rebrand');
	// Theme-aware dividers (original shows no dividers, rebrand uses white, improved uses gray)
	const dividerClasses = $derived.by(() => {
		if (isOriginal) return '';
		if (isRebrand) return 'divide-y divide-white/30';
		return 'divide-y divide-gray-100 dark:divide-gray-800';
	});
	// Background class for transaction buttons - transparent for rebrand
	const buttonBgClass = $derived(isRebrand ? 'bg-transparent' : 'bg-white dark:bg-gray-900');
	const buttonActiveBgClass = $derived(isRebrand ? 'active:bg-white/20' : 'active:bg-gray-50 dark:active:bg-gray-800');
</script>

<div class={className}>
	{#if isLoading}
		<TransactionListSkeleton title="Verwacht" itemCount={2} />
	{:else}
		<!-- Section Header -->
		<WidgetHeader title="Verwacht" class="mb-4">
			<WidgetAction label="Kijk vooruit" href={kijkVooruitLink} />
		</WidgetHeader>

		<!-- Upcoming Transactions -->
		{#if upcomingTransactions.length > 0}
			<div class="mb-6">
				<Card padding="p-0">
					<div class={dividerClasses}>
						{#each upcomingTransactions as t}
							{#if onUpcomingClick}
								<button
									onclick={() => onUpcomingClick(t)}
								class="block w-full {buttonBgClass} p-4 text-left first:rounded-t-2xl last:rounded-b-2xl {buttonActiveBgClass}"
								>
									<TransactionItem
										merchant={t.merchant}
										subtitle={formatRecurringSubtitle(t.interval, t.daysUntil)}
										amount={t.isDebit ? -t.amount : t.amount}
										isDebit={t.isDebit}
										categoryIcon={t.categoryIcon ?? null}
										size="lg"
										fontHeading={true}
										useLogo={true}
										showChevron={showUpcomingChevron}
										designVariant={isOriginal ? 'original' : 'redesign'}
										date={t.nextDate ?? t.date}
										description={t.subtitle}
									/>
								</button>
							{:else}
								<div
									class="block bg-white p-4 first:rounded-t-2xl last:rounded-b-2xl active:bg-gray-50 dark:bg-gray-900 dark:active:bg-gray-800"
								>
									<TransactionItem
										merchant={t.merchant}
										subtitle={formatRecurringSubtitle(t.interval, t.daysUntil)}
										amount={t.isDebit ? -t.amount : t.amount}
										isDebit={t.isDebit}
										categoryIcon={t.categoryIcon ?? null}
										size="md"
										fontHeading={true}
										useLogo={true}
									/>
								</div>
							{/if}
						{/each}
					</div>
				</Card>
			</div>
		{/if}

		<!-- Transaction Groups -->
		<div class="space-y-6">
			{#each groupedTransactions as group}
				<TransactionGroup {group}>
					{#each group.transactions as t}
						<MobileLink
							href={`/mobile/transactions/${t.id}?from=${encodeURIComponent($page.url.pathname + $page.url.search)}`}
							class="block {buttonBgClass} p-4 first:rounded-t-2xl last:rounded-b-2xl {buttonActiveBgClass}"
						>
							<TransactionItem
								merchant={t.merchant}
								subtitle={t.category ?? ''}
								amount={t.isDebit ? -t.amount : t.amount}
								isDebit={t.isDebit}
								categoryIcon={t.categoryIcon ?? null}
							size="md"
								showChevron={true}
								designVariant={isOriginal ? 'original' : 'redesign'}
								date={t.nextDate ?? t.date}
								description={t.description ?? t.note ?? t.category}
							/>
						</MobileLink>
					{/each}
				</TransactionGroup>
			{:else}
				<div class="mt-8 text-center text-sm text-gray-800 dark:text-gray-400">
					Geen transacties gevonden
				</div>
			{/each}
		</div>
	{/if}
</div>
