<script lang="ts">
	import { page } from '$app/stores';
	import Card from '$lib/components/mobile/Card.svelte';
	import TransactionItem from '$lib/components/mobile/TransactionItem.svelte';
	import MoneyChart from '$lib/components/mobile/MoneyChart.svelte';
	import InsightsCarousel from '$lib/components/mobile/InsightsCarousel.svelte';
	import {
		QrCode,
		MoreVertical,
		CreditCard,
		RefreshCw,
		Smartphone,
		ArrowRight
	} from 'lucide-svelte';
	import MobileHeader from '$lib/components/mobile/MobileHeader.svelte';
	import WidgetHeader from '$lib/components/mobile/WidgetHeader.svelte';
	import WidgetAction from '$lib/components/mobile/WidgetAction.svelte';

	// Data from server
	let { data } = $props();
</script>

<svelte:head>
	<title>Reflect Mobile</title>
</svelte:head>

<!-- Header -->
<MobileHeader class="flex items-center justify-between px-4 pb-3">
	<button class="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-sand-100">
		<QrCode class="h-6 w-6 text-black" strokeWidth={1.5} />
	</button>
	<h1 class="font-heading text-xl font-bold text-black">Inzicht</h1>
	<button class="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-sand-100">
		<MoreVertical class="h-6 w-6 text-black" strokeWidth={1.5} />
	</button>
</MobileHeader>

<div class="space-y-6 p-4 font-nn" data-theme="nn-theme">
	<!-- Betaalsaldo -->
	<section>
		<WidgetHeader title="Betaalsaldo" class="mb-3" />
		<Card padding="p-0">
			<div class="p-4">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<div class="relative">
							<CreditCard class="h-8 w-8 text-gray-400" strokeWidth={1.5} />
							<div
								class="absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center rounded-full bg-mediumOrange-500 text-[10px] font-bold text-white ring-2 ring-white"
							>
								N
							</div>
						</div>
						<div>
							<div class="font-bold">P. de Vries</div>
							<div class="text-xs text-gray-500">NL31 NNBA 1000 0006 45</div>
						</div>
					</div>
					<div class="text-lg font-bold">€ 50,00</div>
				</div>
			</div>
			<div class="grid grid-cols-2 border-t border-gray-100">
				<button
					class="btn flex h-auto flex-col gap-1 rounded-none border-r border-gray-100 py-3 font-normal normal-case btn-ghost"
				>
					<RefreshCw class="h-6 w-6 text-mediumOrange-500" strokeWidth={1.5} />
					<span class="text-xs font-semibold text-gray-700">Overmaken</span>
				</button>
				<button
					class="btn flex h-auto flex-col gap-1 rounded-none py-3 font-normal normal-case btn-ghost"
				>
					<Smartphone class="h-6 w-6 text-mediumOrange-500" strokeWidth={1.5} />
					<span class="text-xs font-semibold text-gray-700">Betaalverzoek</span>
				</button>
			</div>
		</Card>
	</section>

	<!-- Inzichten Carousel -->
	<InsightsCarousel />

	<!-- Transacties -->
	<section>
		<WidgetHeader title="Transacties" class="mb-3">
			<WidgetAction label="Alle transacties" href="/mobile/transactions" />
		</WidgetHeader>

		<Card padding="p-0">
			<div class="divide-y divide-gray-100">
				{#each data.transactions as t}
					<TransactionItem
						merchant={t.merchant}
						subtitle={t.subline}
						amount={t.isDebit ? -t.amount : t.amount}
						isDebit={t.isDebit}
						categoryIcon={t.categoryIcon}
						compact={true}
						class="p-4 active:bg-gray-50"
					/>
				{:else}
					<div class="p-4 text-center text-sm text-gray-500">Geen transacties</div>
				{/each}
			</div>
		</Card>
	</section>

	<!-- Jouw geld in april -->
	<section>
		<MoneyChart />
	</section>
</div>
