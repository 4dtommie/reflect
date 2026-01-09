<script lang="ts">
	import MobileHeader from '$lib/components/mobile/MobileHeader.svelte';
	import Card from '$lib/components/mobile/Card.svelte';
	import Amount from '$lib/components/mobile/Amount.svelte';
	import MobileLink from '$lib/components/mobile/MobileLink.svelte';
	import TransactionItem from '$lib/components/mobile/TransactionItem.svelte';
	import PeriodChart from '$lib/components/mobile/PeriodChart.svelte';
	import { ArrowLeft, MoreVertical, Plus } from 'lucide-svelte';
	import { formatRecurringSubtitle } from '$lib/utils/dateFormatting';
	import { page } from '$app/stores';

	let { data } = $props();
</script>

<svelte:head>
	<title>Kijk vooruit</title>
</svelte:head>

<MobileHeader class="flex items-center justify-between px-4 pb-3">
	<MobileLink
		href={$page.url.searchParams.get('from') ?? '/mobile'}
		class="dark:hover:bg-gray-1200 flex h-10 w-10 items-center justify-center rounded-lg hover:bg-sand-100"
		direction="back"
	>
		<ArrowLeft class="h-6 w-6 text-black dark:text-white" strokeWidth={1.5} />
	</MobileLink>
	<h1 class="font-heading text-lg font-bold text-black dark:text-white">Kijk vooruit</h1>
	<button
		class="dark:hover:bg-gray-1200 flex h-10 w-10 items-center justify-center rounded-lg hover:bg-sand-100"
	>
		<MoreVertical class="h-6 w-6 text-black dark:text-white" strokeWidth={1.5} />
	</button>
</MobileHeader>

<div class="space-y-6 px-4 pt-4 pb-24 font-nn">
	<!-- Balance Graph -->
	<section class="mb-2 px-1">
		<div class="h-48 w-full">
			<PeriodChart
				data={data.graphData}
				previousSalaryDate={data.previousSalaryDate}
				nextSalaryDate={data.nextSalaryDate}
				currentBalance={data.summary.balance}
			/>
		</div>
	</section>

	<!-- Info Block -->
	{#if data.daysUntilSalary > 0}
		<Card
			class="to-lightOrange-50 dark:from-mediumOrange-1200 dark:to-lightOrange-1200 bg-gradient-to-r from-mediumOrange-50"
		>
			<div class="flex items-start gap-3">
				<div class="flex-1">
					<p class="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
						Nog <span class="font-bold text-gray-900 dark:text-white"
							>{data.daysUntilSalary} dagen</span
						>
						tot je volgende salaris.
						{#if data.projectedSurplus > 0}
							Het lijkt erop dat je <span class="font-bold text-green-600 dark:text-green-400"
								>€ {Math.round(data.projectedSurplus)}</span
							> overhoudt om te sparen of uit te geven.
						{:else}
							Let op: je komt <span class="font-bold text-red-600 dark:text-red-400"
								>€ {Math.abs(Math.round(data.projectedSurplus))}</span
							> tekort deze maand.
						{/if}
					</p>
				</div>
			</div>
		</Card>
	{/if}

	<!-- Betaling nog niet gebeurd -->
	{#if data.missedPayments && data.missedPayments.length > 0}
		<section>
			<div class="mb-3 flex items-center justify-between px-1">
				<h2 class="font-heading text-base font-bold text-gray-900 dark:text-white">
					Betaling nog niet gebeurd
				</h2>
			</div>
			<Card padding="p-0">
				<div class="dark:divide-gray-1100 divide-y divide-gray-100/10">
					{#each data.missedPayments as item}
						<TransactionItem
							merchant={item.merchant}
							subtitle={item.subtitle}
							amount={item.isDebit ? -item.amount : item.amount}
							isDebit={item.isDebit}
							categoryIcon={item.icon}
							useLogo={true}
							showChevron={true}
							class="dark:active:bg-gray-1200 px-4 py-3 active:bg-gray-50"
						/>
					{/each}
				</div>
			</Card>
		</section>
	{/if}

	<!-- Aankomende betalingen -->
	<section>
		<div class="mb-3 flex items-center justify-between px-1">
			<h2 class="font-heading text-base font-bold text-gray-900 dark:text-white">
				Aankomende betalingen
			</h2>
			{#if data.confirmedPayments.length > 0}
				<span class="text-sm font-medium text-gray-600 dark:text-gray-400">
					Totaal € {Math.round(data.summary.expected)}
				</span>
			{/if}
		</div>
		<Card padding="p-0">
			<div class="dark:divide-gray-1100 divide-y divide-gray-100/10">
				{#each data.confirmedPayments as item}
					<TransactionItem
						merchant={item.merchant}
						subtitle={formatRecurringSubtitle(item.interval, item.daysUntil)}
						amount={item.isDebit ? -item.amount : item.amount}
						isDebit={item.isDebit}
						categoryIcon={item.icon}
						useLogo={true}
						showChevron={true}
						class="dark:active:bg-gray-1200 px-4 py-3 active:bg-gray-50"
					/>
				{:else}
					<div class="p-8 text-center text-sm text-gray-500">
						Geen aankomende betalingen gevonden.
					</div>
				{/each}
			</div>
		</Card>
	</section>

	<!-- Nieuwe periode -->
	{#if data.nextPeriodPayments && data.nextPeriodPayments.length > 0}
		<section>
			<div class="mb-3 flex items-center justify-between px-1">
				<h2 class="font-heading text-base font-bold text-gray-900 dark:text-white">
					Nieuwe periode vanaf {data.nextPeriodStartDate}
				</h2>
			</div>
			<Card padding="p-0">
				<div class="dark:divide-gray-1100 divide-y divide-gray-100/10">
					{#each data.nextPeriodPayments as item}
						<TransactionItem
							merchant={item.merchant}
							subtitle={formatRecurringSubtitle(item.interval, item.daysUntil)}
							amount={item.isDebit ? -item.amount : item.amount}
							isDebit={item.isDebit}
							categoryIcon={item.icon}
							useLogo={true}
							showChevron={true}
							class="dark:active:bg-gray-1200 px-4 py-3 active:bg-gray-50"
						/>
					{/each}
				</div>
			</Card>
		</section>
	{/if}

	<!-- Voorspelde betalingen -->
	{#if data.predictedPayments && data.predictedPayments.length > 0}
		<section>
			<div class="mb-3 flex items-center justify-between px-1">
				<h2 class="font-heading text-base font-bold text-gray-900 dark:text-white">
					Voorspelde betalingen
				</h2>
			</div>
			<Card padding="p-0">
				<div class="dark:divide-gray-1100 divide-y divide-gray-100/10">
					{#each data.predictedPayments as item}
						<TransactionItem
							merchant={item.merchant}
							subtitle={formatRecurringSubtitle(item.interval, item.daysUntil)}
							amount={item.isDebit ? -item.amount : item.amount}
							isDebit={item.isDebit}
							categoryIcon={item.icon}
							useLogo={true}
							showChevron={true}
							class="dark:active:bg-gray-1200 px-4 py-3 active:bg-gray-50"
						/>
					{/each}
				</div>
			</Card>
		</section>
	{/if}

	<!-- Add Payment Button -->
	<button
		class="dark:border-gray-1100 dark:active:bg-gray-1200 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-4 font-bold text-gray-900 transition-colors active:bg-gray-50 dark:text-white"
	>
		<Plus class="h-5 w-5 text-mediumOrange-500" strokeWidth={2.5} />
		Voeg zelf een betaling toe
	</button>
</div>
