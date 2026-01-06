<script lang="ts">
	import { page } from '$app/stores';
	import Card from '$lib/components/mobile/Card.svelte';
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

	// Data from server
	let { data } = $props();

	// Icon mapping from database icon names to Lucide components
	const iconMap: Record<string, typeof Icon> = {
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
	<title>Transacties - Reflect Mobile</title>
</svelte:head>

<!-- Header -->
<div class="sticky top-0 z-10 flex items-center bg-sand-50/90 p-4 backdrop-blur-md">
	<a href="/m" class="mr-4 rounded-full p-2 hover:bg-black/5 active:bg-black/10">
		<ArrowLeft class="h-6 w-6 text-gray-900" />
	</a>
	<h1 class="text-lg font-bold text-gray-900">Alle transacties</h1>
</div>

<!-- Content -->
<div class="flex-1 px-4 pt-2 pb-0">
	<Card padding="p-0">
		<div class="divide-y divide-gray-100">
			{#each data.transactions as t}
				<div
					class="flex items-center justify-between bg-white p-4 first:rounded-t-2xl last:rounded-b-2xl active:bg-gray-50"
				>
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
					<!-- Styling logic copied from main page -->
					{#if t.isDebit}
						<div class="font-bold text-gray-900">- {formatAmount(t.amount)}</div>
					{:else}
						<div class="rounded-full bg-green-100 px-3 py-1 font-bold text-green-700">
							+ {formatAmount(t.amount)}
						</div>
					{/if}
				</div>
			{:else}
				<div class="p-8 text-center text-gray-500">Geen transacties gevonden</div>
			{/each}
		</div>
	</Card>

	<!-- Bottom spacer for safe area -->
	<div class="h-8"></div>
</div>
