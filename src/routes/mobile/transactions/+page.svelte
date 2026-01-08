<script lang="ts">
	import Card from '$lib/components/mobile/Card.svelte';
	import TransactionItem from '$lib/components/mobile/TransactionItem.svelte';
	import HorizontalCarousel from '$lib/components/mobile/HorizontalCarousel.svelte';
	import AccountCard from '$lib/components/mobile/AccountCard.svelte';
	import { ArrowLeft, Search, ArrowRight } from 'lucide-svelte';
	import { mobileScrollY } from '$lib/stores/mobileScroll';
	import WidgetHeader from '$lib/components/mobile/WidgetHeader.svelte';
	import WidgetAction from '$lib/components/mobile/WidgetAction.svelte';

	// Data from server
	let { data } = $props();

	// For header shadow on scroll
	const headerShadowOpacity = $derived(Math.min($mobileScrollY / 50, 1) * 0.1);

	// Interpolate header bg from sand-100 (#f3efed / 243,239,237) to sand-50 (#faf9f8 / 250,249,248)
	const scrollProgress = $derived(Math.min($mobileScrollY / 60, 1));
	const r = $derived(243 + (250 - 243) * scrollProgress);
	const g = $derived(239 + (249 - 239) * scrollProgress);
	const b = $derived(237 + (248 - 237) * scrollProgress);
	const headerBg = $derived(`rgb(${r}, ${g}, ${b})`);

	// Dynamic border radius: 0 at top, up to 32px (2rem) when scrolled
	const headerRadius = $derived(scrollProgress * 32);

	// Placeholder accounts - will come from server later
	const accounts = [
		{ id: 1, name: 'Gezamenlijke rekening', balance: 1200.0 },
		{ id: 2, name: 'Spaarrekening', balance: 5432.1 },
		{ id: 3, name: 'Beleggingsrekening', balance: 12847.53 }
	];
</script>

<svelte:head>
	<title>Betaalrekening - Reflect Mobile</title>
</svelte:head>

<!-- Grey Header Zone with Account Cards -->
<header
	class="sticky top-0 z-40 flex flex-col pt-[54px] transition-colors duration-200"
	style="
		background-color: {headerBg};
		box-shadow: 0 4px 20px -4px rgb(0 0 0 / {headerShadowOpacity});
		border-bottom-left-radius: {headerRadius}px;
		border-bottom-right-radius: {headerRadius}px;
		transform: translateZ(0);
	"
>
	<!-- Header Title Row -->
	<div class="flex items-center justify-between px-4 pb-4">
		<a href="/mobile" class="rounded-full p-2 hover:bg-black/5 active:bg-black/10">
			<ArrowLeft class="h-6 w-6 text-black" />
		</a>
		<h1 class="font-heading text-[20px] font-bold text-black">Betaalrekening</h1>
		<button class="rounded-full p-2 hover:bg-black/5 active:bg-black/10">
			<Search class="h-6 w-6 text-black" />
		</button>
	</div>
</header>

<!-- Scrollable Header Extension (Carousel) -->
<div class="w-full rounded-b-3xl bg-sand-100 pt-2 pb-2">
	<!-- Account Cards Carousel -->
	<HorizontalCarousel showIndicators={true} itemCount={accounts.length} cardWidth={280} gap={12}>
		{#each accounts as account (account.id)}
			<AccountCard name={account.name} balance={account.balance} />
		{/each}
	</HorizontalCarousel>
</div>

<!-- Content: Transactions List -->
<div class="flex-1 bg-sand-50 px-4 pt-4 pb-24 font-nn">
	<!-- Section Header -->
	<WidgetHeader title="Verwacht" class="mb-4">
		<WidgetAction label="Kijk vooruit" />
	</WidgetHeader>

	<!-- Upcoming Transactions -->
	<div class="mb-6">
		{#if data.upcomingTransactions && data.upcomingTransactions.length > 0}
			<Card padding="p-0">
				<div class="divide-y divide-gray-100">
					{#each data.upcomingTransactions as t}
						<div
							class="block bg-white p-4 first:rounded-t-2xl last:rounded-b-2xl active:bg-gray-50"
						>
							<TransactionItem
								merchant={t.merchant}
								subtitle={t.daysLabel}
								amount={t.isDebit ? -t.amount : t.amount}
								isDebit={t.isDebit}
								categoryIcon={t.categoryIcon}
								compact={false}
								fontHeading={true}
								useLogo={true}
							/>
						</div>
					{/each}
				</div>
			</Card>
		{/if}
	</div>

	<!-- Transaction Groups -->
	<div class="space-y-6">
		{#each data.groupedTransactions as group}
			<section>
				<!-- Group Header -->
				<div class="mb-3 flex items-center gap-3 px-1">
					<h2 class="font-heading text-base font-bold text-gray-900">{group.dateLabel}</h2>
					<div class="rounded-md bg-gray-200/60 px-2 py-0.5 text-xs font-bold text-gray-600">
						{group.formattedTotal}
					</div>
				</div>

				<!-- Transactions List for this group -->
				<Card padding="p-0">
					<div class="divide-y divide-gray-100">
						{#each group.transactions as t}
							<div
								class="block bg-white p-4 first:rounded-t-2xl last:rounded-b-2xl active:bg-gray-50"
							>
								<TransactionItem
									merchant={t.merchant}
									subtitle={t.category}
									amount={t.isDebit ? -t.amount : t.amount}
									isDebit={t.isDebit}
									categoryIcon={t.categoryIcon}
									compact={false}
								/>
							</div>
						{/each}
					</div>
				</Card>
			</section>
		{:else}
			<div class="mt-8 text-center text-gray-500">Geen transacties gevonden</div>
		{/each}
	</div>

	<!-- Bottom spacer for safe area -->
	<div class="h-8"></div>
</div>
