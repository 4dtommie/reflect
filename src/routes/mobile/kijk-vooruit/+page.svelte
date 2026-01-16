<script lang="ts">
import MobileHeader from '$lib/components/mobile/MobileHeader.svelte';
import Card from '$lib/components/mobile/Card.svelte';
import Amount from '$lib/components/mobile/Amount.svelte';
import MobileLink from '$lib/components/mobile/MobileLink.svelte';
import TransactionItem from '$lib/components/mobile/TransactionItem.svelte';
import BottomSheet from '$lib/components/mobile/BottomSheet.svelte';
import MerchantLogo from '$lib/components/MerchantLogo.svelte';
import PeriodChart from '$lib/components/mobile/PeriodChart.svelte';
import { ArrowLeft, Menu, Plus, Calendar, Repeat, Tag, ChevronRight, Pause, Trash2 } from 'lucide-svelte';
import { formatRecurringSubtitle } from '$lib/utils/dateFormatting';
import { page } from '$app/stores';
import { goto } from '$app/navigation';
import { mobileThemeName } from '$lib/stores/mobileTheme';
import { mobileStatusBarColor } from '$lib/stores/mobileStatusBarColor';
import { onDestroy } from 'svelte';

let { data } = $props();

// Theme checks
const isOriginal = $derived($mobileThemeName === 'nn-original');
const isImproved = $derived($mobileThemeName === 'improved');
const isRebrand = $derived($mobileThemeName === 'rebrand');

// Divider classes - only show dividers for improved/rebrand themes
const dividerClasses = $derived(isOriginal ? '' : 'divide-y divide-gray-100 dark:divide-gray-800');

// Set status bar color based on theme
$effect(() => {
	if (isImproved) {
		// Light purple background for redesign (matches bg-violet-100)
		mobileStatusBarColor.set('rgb(237, 233, 254)');
	} else if (isOriginal) {
		// Sand-50 for original theme
		mobileStatusBarColor.set('rgb(250, 249, 248)');
	} else {
		mobileStatusBarColor.set(null);
	}
});

onDestroy(() => {
	mobileStatusBarColor.set(null);
});

// Bottom sheet state
let sheetOpen = $state(false);
let selectedItem = $state<any>(null);

function openSheet(item: any) {
	selectedItem = item;
	sheetOpen = true;
}

function closeSheet() {
	sheetOpen = false;
	selectedItem = null;
}

// Format interval for display
function formatInterval(interval: string): string {
	const labels: Record<string, string> = {
		monthly: 'Maandelijks',
		weekly: 'Wekelijks',
		yearly: 'Jaarlijks',
		quarterly: 'Per kwartaal',
		'4-weekly': '4-wekelijks'
	};
	return labels[interval] || interval;
}

// Format next date for display
function formatNextDate(daysUntil: number): string {
	const date = new Date();
	date.setDate(date.getDate() + daysUntil);
	const days = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
	const months = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
	return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
}
</script>

{#if isRebrand}
	<!-- Glassy purple header for rebrand -->
	<section class="mb-2 w-full rounded-b-3xl card-glassy pb-4" style="background: rgba(237, 233, 254, 0.7);">
		<!-- Header row -->
		<header class="flex w-full items-center justify-between px-4 pt-[54px] pb-2">
			<MobileLink
				href="/mobile"
				class="rounded-full p-2 hover:bg-black/5 active:bg-black/10"
			>
				<ArrowLeft class="h-6 w-6" strokeWidth={1.5} />
			</MobileLink>
			<h1 class="font-heading text-[20px] font-bold">Vooruit kijken</h1>
			<div class="w-10"></div>
		</header>
		<!-- Chart -->
		<div class="h-[160px] px-4">
			<PeriodChart
				data={data.graphData}
				previousSalaryDate={data.previousSalaryDate}
				nextSalaryDate={data.nextSalaryDate}
				simulatedToday={data.simulatedToday}
			/>
		</div>
	</section>
	<!-- Period selector buttons (outside header) -->
	<div class="flex justify-center gap-2 px-4 py-3">
		<button class="rounded-full bg-mediumOrange-500 px-4 py-1.5 text-sm font-medium text-white">Deze periode</button>
		<button class="rounded-full bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-700">Twee maanden</button>
		<button class="rounded-full bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-700">Een jaar</button>
	</div>
{:else if isImproved}
	<!-- Light colored header for improved -->
	<section class="mb-2 w-full rounded-b-3xl bg-violet-100 pb-4">
		<!-- Header row -->
		<header class="flex w-full items-center justify-between px-4 pt-[54px] pb-2">
			<MobileLink
				href="/mobile"
				class="rounded-full p-2 hover:bg-black/5 active:bg-black/10"
			>
				<ArrowLeft class="h-6 w-6" strokeWidth={1.5} />
			</MobileLink>
			<h1 class="font-heading text-[20px] font-bold">Vooruit kijken</h1>
			<div class="w-10"></div>
		</header>
		<!-- Chart -->
		<div class="h-[160px] px-4">
			<PeriodChart
				data={data.graphData}
				previousSalaryDate={data.previousSalaryDate}
				nextSalaryDate={data.nextSalaryDate}
				simulatedToday={data.simulatedToday}
			/>
		</div>
	</section>
	<!-- Period selector buttons (outside header) -->
	<div class="flex justify-center gap-2 px-4 py-3">
		<button class="rounded-full bg-mediumOrange-500 px-4 py-1.5 text-sm font-medium text-white">Deze periode</button>
		<button class="rounded-full bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-700">Twee maanden</button>
		<button class="rounded-full bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-700">Een jaar</button>
	</div>
{:else}
	<!-- Original theme: simple header and chart -->
	<header class="flex w-full items-center justify-between px-4 pt-[54px] pb-2">
		<MobileLink
			href="/mobile"
			class="rounded-full p-2 hover:bg-black/5 active:bg-black/10"
		>
			<ArrowLeft class="h-6 w-6" strokeWidth={1.5} />
		</MobileLink>
		<h1 class="font-heading text-[20px] font-bold">Vooruit kijken</h1>
		<div class="w-10"></div>
	</header>
	<section class="mb-2 w-full">
		<div class="h-[160px] px-4">
			<PeriodChart
				data={data.graphData}
				previousSalaryDate={data.previousSalaryDate}
				nextSalaryDate={data.nextSalaryDate}
				simulatedToday={data.simulatedToday}
			/>
		</div>
		<!-- Period selector buttons -->
		<div class="flex justify-center gap-2 px-4 pt-3">
			<button class="rounded-full bg-mediumOrange-500 px-4 py-1.5 text-sm font-medium text-white">Deze periode</button>
			<button class="rounded-full bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-700">Twee maanden</button>
			<button class="rounded-full bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-700">Een jaar</button>
		</div>
	</section>
{/if}

<div class="space-y-6 px-4 pt-4 pb-24 font-nn">
	<!-- Info Block -->
	{#if data.daysUntilSalary && data.daysUntilSalary > 0}
		<Card
			class="bg-blue-200"
		>
			<div class="flex items-start gap-3">
				<div class="flex-1">
					<p class="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
						Nog <span class="font-bold text-gray-900 dark:text-white"
							>{data.daysUntilSalary} dagen</span
						>
						tot je volgende salaris.
						{#if data.projectedSurplus && data.projectedSurplus > 0}
							Het lijkt erop dat je <span class="font-bold text-green-600 dark:text-green-400"
								>€ {Math.round(data.projectedSurplus)}</span
							> overhoudt om te sparen of uit te geven.
						{:else if data.projectedSurplus !== undefined}
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
				<div class={dividerClasses}>
					{#each data.missedPayments as item}
						<button class="w-full text-left" onclick={() => openSheet(item)}>
							<TransactionItem
								merchant={item.merchant}
								subtitle={item.subtitle}
								amount={item.isDebit ? -item.amount : item.amount}
								isDebit={item.isDebit}
								categoryIcon={item.icon ?? null}
								useLogo={true}
								showChevron={true}
								class="dark:active:bg-gray-1200 px-4 py-3 active:bg-gray-50"
							/>
						</button>
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
			<div class={dividerClasses}>
				{#each data.confirmedPayments as item}
					<button class="w-full text-left" onclick={() => openSheet(item)}>
							<TransactionItem
								merchant={item.merchant}
								subtitle={formatRecurringSubtitle(item.interval, item.daysUntil)}
								amount={item.isDebit ? -item.amount : item.amount}
								isDebit={item.isDebit}
								categoryIcon={item.icon ?? null}
								useLogo={true}
								showChevron={true}
								class="dark:active:bg-gray-1200 px-4 py-3 active:bg-gray-50"
								designVariant={isOriginal ? 'original' : 'redesign'}
								date={item.date.toISOString()}
							/>
					</button>
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
				<div class={dividerClasses}>
					{#each data.nextPeriodPayments as item}
						<button class="w-full text-left" onclick={() => openSheet(item)}>
							<TransactionItem
								merchant={item.merchant}
								subtitle={formatRecurringSubtitle(item.interval, item.daysUntil)}
								amount={item.isDebit ? -item.amount : item.amount}
								isDebit={item.isDebit}
								categoryIcon={item.icon ?? null}
								useLogo={true}
								showChevron={true}
								class="dark:active:bg-gray-1200 px-4 py-3 active:bg-gray-50"
							/>
						</button>
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
				<div class={dividerClasses}>
					{#each data.predictedPayments as item}
						<button class="w-full text-left" onclick={() => openSheet(item)}>
							<TransactionItem
								merchant={item.merchant}
								subtitle={formatRecurringSubtitle(item.interval, item.daysUntil)}
								amount={item.isDebit ? -item.amount : item.amount}
								isDebit={item.isDebit}
								categoryIcon={item.icon ?? null}
								useLogo={true}
								showChevron={true}
								class="dark:active:bg-gray-1200 px-4 py-3 active:bg-gray-50"
							/>
						</button>
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
<!-- bottom selector intentionally removed -->

<!-- Expected Payment Bottom Sheet -->
<BottomSheet bind:open={sheetOpen} onClose={closeSheet} title="Verwachte betaling">
	{#if selectedItem}
		<div class="space-y-4">
			<!-- Header with logo -->
			<div class="flex items-center gap-4 border-b border-gray-100 pb-4 dark:border-gray-800">
				<div class="h-12 w-12 overflow-hidden rounded-xl">
					<MerchantLogo merchantName={selectedItem.merchant} categoryIcon={selectedItem.icon} size="lg" />
				</div>
				<div class="flex-1">
					<h3 class="font-heading text-lg font-bold text-gray-900 dark:text-white">
						{selectedItem.merchant}
					</h3>
					<p class="text-sm text-gray-500 dark:text-gray-400">
						{formatRecurringSubtitle(selectedItem.interval, selectedItem.daysUntil)}
					</p>
				</div>
				<Amount
					amount={selectedItem.isDebit ? -selectedItem.amount : selectedItem.amount}
					size="lg"
					class="font-heading"
				/>
			</div>

			<!-- Details -->
			<Card padding="p-0">
				<div class={dividerClasses}>
					<div class="flex items-center gap-3 px-4 py-3">
						<div class="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
							<Calendar class="h-4 w-4 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
						</div>
						<div class="flex-1">
							<p class="text-xs text-gray-500 dark:text-gray-400">Verwacht op</p>
							<p class="text-sm font-medium text-gray-900 dark:text-white">
								{formatNextDate(selectedItem.daysUntil)}
							</p>
						</div>
					</div>
					<div class="flex items-center gap-3 px-4 py-3">
						<div class="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
							<Repeat class="h-4 w-4 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
						</div>
						<div class="flex-1">
							<p class="text-xs text-gray-500 dark:text-gray-400">Interval</p>
							<p class="text-sm font-medium text-gray-900 dark:text-white">
								{formatInterval(selectedItem.interval)}
							</p>
						</div>
					</div>
					{#if selectedItem.category}
						<div class="flex items-center gap-3 px-4 py-3">
							<div class="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
								<Tag class="h-4 w-4 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
							</div>
							<div class="flex-1">
								<p class="text-xs text-gray-500 dark:text-gray-400">Categorie</p>
								<p class="text-sm font-medium text-gray-900 dark:text-white">
									{selectedItem.category}
								</p>
							</div>
						</div>
					{/if}
				</div>
			</Card>

			<!-- Actions -->
			<Card padding="p-0">
				<div class={dividerClasses}>
					<button class="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-gray-50 dark:active:bg-gray-800">
						<div class="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
							<Pause class="h-4 w-4 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
						</div>
						<span class="flex-1 text-sm text-gray-900 dark:text-white">Pauzeer tijdelijk</span>
						<ChevronRight class="h-4 w-4 text-gray-400" strokeWidth={2} />
					</button>
					<button class="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-gray-50 dark:active:bg-gray-800">
						<div class="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
							<Trash2 class="h-4 w-4 text-red-600 dark:text-red-400" strokeWidth={1.5} />
						</div>
						<span class="flex-1 text-sm text-red-600 dark:text-red-400">Verwijderen</span>
						<ChevronRight class="h-4 w-4 text-gray-400" strokeWidth={2} />
					</button>
				</div>
			</Card>
		</div>
	{/if}
</BottomSheet>
