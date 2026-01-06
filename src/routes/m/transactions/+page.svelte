<script lang="ts">
	import { page } from '$app/stores';
	import Card from '$lib/components/mobile/Card.svelte';
	import Amount from '$lib/components/mobile/Amount.svelte';
	import TransactionItem from '$lib/components/mobile/TransactionItem.svelte';
	import {
		ArrowLeft,
		CreditCard,
		Briefcase,
		FileText,
		DollarSign,
		ShoppingCart,
		Utensils,
		Car,
		ShoppingBag,
		Palette,
		Home,
		Coffee,
		Sandwich,
		Wine,
		Fuel,
		Train,
		Wrench,
		Shirt,
		Smartphone,
		Zap,
		Wifi,
		Heart,
		Film,
		Dumbbell,
		BookOpen,
		GraduationCap,
		Ticket,
		Plane,
		Shield,
		Wallet,
		HeartHandshake,
		Sparkles,
		Bike,
		type Icon
	} from 'lucide-svelte';

	import { onMount } from 'svelte';
	import MobileHeader from '$lib/components/mobile/MobileHeader.svelte';

	// Data from server
	let { data } = $props();
</script>

<svelte:head>
	<title>Transacties - Reflect Mobile</title>
</svelte:head>

<!-- Header -->
<MobileHeader class="flex items-center px-4 pb-4">
	<a href="/m" class="mr-4 rounded-full p-2 hover:bg-black/5 active:bg-black/10">
		<ArrowLeft class="h-6 w-6 text-black" />
	</a>
	<h1 class="font-heading text-lg font-bold text-black">Alle transacties</h1>
</MobileHeader>

<!-- Content -->
<div class="flex-1 px-4 pt-2 pb-0 font-nn">
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
