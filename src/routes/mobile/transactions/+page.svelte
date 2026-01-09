<script lang="ts">
	import Card from '$lib/components/mobile/Card.svelte';
	import TransactionItem from '$lib/components/mobile/TransactionItem.svelte';
	import HorizontalCarousel from '$lib/components/mobile/HorizontalCarousel.svelte';
	import AccountCard from '$lib/components/mobile/AccountCard.svelte';
	import MobileLink from '$lib/components/mobile/MobileLink.svelte';
	import { ArrowLeft, Search, ArrowRight } from 'lucide-svelte';
	import { mobileScrollY } from '$lib/stores/mobileScroll';
	import WidgetHeader from '$lib/components/mobile/WidgetHeader.svelte';
	import WidgetAction from '$lib/components/mobile/WidgetAction.svelte';
	import { page } from '$app/stores';
	import { formatRecurringSubtitle } from '$lib/utils/dateFormatting';

	// Data from server
	let { data } = $props();

	// For header shadow on scroll
	const headerShadowOpacity = $derived(Math.min($mobileScrollY / 50, 1) * 0.1);

	// Scroll progress for glassy transition (0 = solid, 1 = frosted glass)
	const scrollProgress = $derived(Math.min($mobileScrollY / 60, 1));

	// Interpolate from sand-100 (#f3efed / rgb 243,239,237) to sand-50/70 (#faf9f8 at 70% opacity)
	const blurAmount = $derived(scrollProgress * 12); // 0 to 12px blur
	// Interpolate RGB from sand-100 to sand-50
	const r = $derived(Math.round(243 + (250 - 243) * scrollProgress));
	const g = $derived(Math.round(239 + (249 - 239) * scrollProgress));
	const b = $derived(Math.round(237 + (248 - 237) * scrollProgress));
	const bgOpacity = $derived(1 - scrollProgress * 0.3); // 1 to 0.7 opacity

	// Placeholder accounts - will come from server later
	const accounts = [
		{ id: 1, name: 'Gezamenlijke rekening', balance: 1200.0, type: 'checking' as const },
		{ id: 2, name: 'Spaarrekening', balance: 5432.1, type: 'savings' as const },
		{ id: 3, name: 'Beleggingsrekening', balance: 12847.53, type: 'checking' as const }
	];

	let carouselIndex = $state(0);

	// Initialize carousel index from URL param or default to 0
	$effect(() => {
		const accountIndexParam = $page.url.searchParams.get('accountIndex');
		if (accountIndexParam) {
			const index = parseInt(accountIndexParam, 10);
			if (!isNaN(index) && index >= 0 && index < accounts.length) {
				carouselIndex = index;
			}
		}
	});

	// Persist widgetStyle when navigating back
	const backLink = '/mobile';
</script>

<svelte:head>
	<title>Rekeningen - Reflect Mobile</title>
</svelte:head>

<!-- Grey Header Zone with Account Cards -->
<header
	class="sticky top-0 z-40 flex flex-col pt-[54px] transition-[backdrop-filter] duration-200"
	style="
		background-color: rgba({r}, {g}, {b}, {bgOpacity});
		backdrop-filter: blur({blurAmount}px);
		-webkit-backdrop-filter: blur({blurAmount}px);
		box-shadow: 0 12px 32px -4px rgba(0, 0, 0, {headerShadowOpacity});
		transform: translateZ(0);
	"
>
	<!-- Header Title Row -->
	<div class="flex items-center justify-between px-4 pb-2">
		<MobileLink href={backLink} class="rounded-full p-2 hover:bg-black/5 active:bg-black/10">
			<ArrowLeft class="h-6 w-6 text-black" />
		</MobileLink>
		<h1 class="font-heading text-[20px] font-bold text-black">Rekeningen</h1>
		<button class="rounded-full p-2 hover:bg-black/5 active:bg-black/10">
			<Search class="h-6 w-6 text-black" />
		</button>
	</div>
</header>

<!-- Scrollable Header Extension (Carousel) -->
<div
	class="w-full bg-sand-100 pt-0 pb-3 transition-[border-radius] duration-300 {carouselIndex >=
	accounts.length - 1
		? 'rounded-br-3xl'
		: 'rounded-br-none'} {carouselIndex === 0 ? 'rounded-bl-3xl' : 'rounded-bl-none'}"
>
	<!-- Account Cards Carousel -->
	<HorizontalCarousel
		bind:currentIndex={carouselIndex}
		showIndicators={false}
		itemCount={accounts.length}
		cardWidth={310}
		gap={12}
	>
		{#each accounts as account (account.id)}
			<AccountCard name={account.name} balance={account.balance} type={account.type} />
		{/each}
	</HorizontalCarousel>
</div>

<!-- Content: Transactions List -->
<div class="flex-1 bg-sand-50 px-4 pt-4 pb-24 font-nn">
	<!-- Section Header -->
	<WidgetHeader title="Verwacht" class="mb-4">
		<WidgetAction label="Kijk vooruit" href="/mobile/kijk-vooruit" />
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
								subtitle={formatRecurringSubtitle(t.interval, t.daysUntil)}
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
				<div class="mb-3 flex items-baseline gap-3 px-1">
					<h2 class="font-heading text-base font-bold text-gray-900">{group.dateLabel}</h2>
					{#if group.incomingCount > 1}
						<div class="rounded-md bg-green-50 px-2 py-0.5 text-sm font-bold text-green-700">
							{group.formattedIncoming}
						</div>
					{/if}
					{#if group.outgoingCount > 1}
						<div class="rounded-md bg-gray-200/60 px-2 py-0.5 text-sm font-bold text-gray-700">
							{group.formattedOutgoing}
						</div>
					{/if}
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
			<div class="mt-8 text-center text-sm text-gray-600">Geen transacties gevonden</div>
		{/each}
	</div>

	<!-- Bottom spacer for safe area -->
	<div class="h-8"></div>
</div>
