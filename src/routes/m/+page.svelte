<script lang="ts">
	import { page } from '$app/stores';
	import Card from '$lib/components/mobile/Card.svelte';
	import BottomNav from '$lib/components/mobile/BottomNav.svelte';
	import MoneyChart from '$lib/components/mobile/MoneyChart.svelte';
	import InsightsCarousel from '$lib/components/mobile/InsightsCarousel.svelte';
	import {
		QrCode,
		MoreVertical,
		CreditCard,
		RefreshCw,
		Smartphone,
		ArrowRight,
		// Category icons
		Briefcase,
		FileText,
		DollarSign,
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
		type Icon,
		Bike
	} from 'lucide-svelte';

	// Data from server
	let { data } = $props();

	// Icon mapping from database icon names to Lucide components
	const iconMap: Record<string, typeof Icon> = {
		Briefcase,
		FileText,
		DollarSign,
		ShoppingCart: ShoppingBag, // mapped to ShoppingBag since ShoppingCart was not in imports list above but used in map
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
		Taxi: Car, // Taxi icon missing in this version, fallback to Car
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
		CreditCard,
		Bike
	};

	// Get icon component by name, fallback to CreditCard
	function getCategoryIcon(iconName: string | null) {
		if (!iconName) return CreditCard;
		return iconMap[iconName] || CreditCard;
	}

	// Format amount as currency
	function formatAmount(amount: number): string {
		return `€ ${Math.abs(amount).toFixed(2).replace('.', ',')}`;
	}
</script>

<svelte:head>
	<title>Reflect Mobile</title>
</svelte:head>

<!-- Header -->
<header class="sticky top-0 z-20 flex items-center justify-between bg-sand-50 px-4 py-3">
	<button class="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-sand-100">
		<QrCode class="h-6 w-6 text-gray-800" strokeWidth={1.5} />
	</button>
	<h1 class="font-nn text-xl font-bold text-gray-900">Inzicht</h1>
	<button class="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-sand-100">
		<MoreVertical class="h-6 w-6 text-gray-800" strokeWidth={1.5} />
	</button>
</header>

<div class="space-y-6 p-4 font-nn" data-theme="nn-theme">
	<!-- Betaalsaldo -->
	<section>
		<h2 class="mb-3 text-sm font-bold text-gray-900">Betaalsaldo</h2>
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
		<div class="mb-3 flex items-center justify-between">
			<h2 class="text-sm font-bold text-gray-900">Transacties</h2>
			<a href="/m/transactions" class="flex items-center text-xs font-medium text-mediumOrange-600">
				Alle transacties <ArrowRight class="ml-1 h-3 w-3" strokeWidth={1.5} />
			</a>
		</div>

		<Card padding="p-0">
			<div class="divide-y divide-gray-100">
				{#each data.transactions as t}
					<div class="flex items-center justify-between p-4">
						<div class="flex items-center gap-4">
							<svelte:component
								this={getCategoryIcon(t.categoryIcon)}
								class="h-6 w-6 text-gray-400"
								strokeWidth={1.5}
							/>
							<div>
								<div class="font-medium text-gray-900">{t.merchant}</div>
								<div class="text-xs text-gray-500">{t.subline}</div>
							</div>
						</div>
						{#if t.isDebit}
							<div class="font-bold text-gray-900">- {formatAmount(t.amount)}</div>
						{:else}
							<div class="rounded-full bg-green-100 px-3 py-1 font-bold text-green-700">
								+ {formatAmount(t.amount)}
							</div>
						{/if}
					</div>
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

<!-- Bottom Nav (Absolute in viewport) -->
<div class="absolute right-0 bottom-0 left-0 z-50">
	<BottomNav />
</div>
