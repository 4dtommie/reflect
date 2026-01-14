<script lang="ts">
	import { page } from '$app/stores';
	import { mobileScrollY } from '$lib/stores/mobileScroll';
	import MobileLink from '$lib/components/mobile/MobileLink.svelte';
	import Card from '$lib/components/mobile/Card.svelte';
	import Amount from '$lib/components/mobile/Amount.svelte';
	import MerchantLogo from '$lib/components/MerchantLogo.svelte';
	import HorizontalCarousel from '$lib/components/mobile/HorizontalCarousel.svelte';
	import BottomSheet from '$lib/components/mobile/BottomSheet.svelte';
	import WidgetHeader from '$lib/components/mobile/WidgetHeader.svelte';
	import {
		ArrowLeft,
		Share2,
		FileText,
		Search,
		Users,
		Phone,
		Globe,
		MessageSquare,
		ChevronRight,
		Tag,
		Repeat,
		TrendingUp,
		TrendingDown,
		ShoppingBag,
		MapPin,
		Calendar,
		Clock,
		CreditCard,
		Hash,
		Receipt,
		Info,
		Briefcase,
		DollarSign,
		Utensils,
		Car,
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

	let { data } = $props();

	// Transaction data
	const tx = $derived(data.transaction);

	// Icon mapping for category icons
	const iconMap: Record<string, typeof Icon> = {
		Briefcase,
		FileText,
		DollarSign,
		ShoppingCart: ShoppingBag,
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
		Taxi: Car,
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

	function getCategoryIcon(iconName: string | null) {
		if (!iconName) return CreditCard;
		return iconMap[iconName] || CreditCard;
	}

	// Get the category icon component for this transaction
	const CategoryIconComponent = $derived(getCategoryIcon(tx.categoryIcon));

	// Compute light header color from category color
	const categoryHeaderColor = $derived.by(() => {
		const color = tx.categoryColor;
		if (!color) return { r: 243, g: 239, b: 237 }; // Default sand-100

		const hex = color.replace('#', '');
		const r = parseInt(hex.substring(0, 2), 16);
		const g = parseInt(hex.substring(2, 4), 16);
		const b = parseInt(hex.substring(4, 6), 16);

		// Create a light tint (mix with white at 70%)
		const lightR = Math.round(r + (255 - r) * 0.70);
		const lightG = Math.round(g + (255 - g) * 0.70);
		const lightB = Math.round(b + (255 - b) * 0.70);

		return { r: lightR, g: lightG, b: lightB };
	});

	// Track if page has mounted to ensure initial scroll is 0
	let hasMounted = $state(false);
	
	onMount(() => {
		// Force scroll to top on mount to ensure colored header shows
		window.scrollTo(0, 0);
		hasMounted = true;
	});

	// Header styling based on scroll - ensure starts at category color (not white)
	// Use 0 if not mounted yet to guarantee colored header initially
	const effectiveScrollY = $derived(hasMounted ? Math.max($mobileScrollY, 0) : 0);
	const headerShadowOpacity = $derived(Math.min(effectiveScrollY / 50, 1) * 0.1);
	const scrollProgress = $derived(Math.min(effectiveScrollY / 60, 1));
	const blurAmount = $derived(scrollProgress * 12);
	// Start with category color, transition to white as user scrolls
	const r = $derived(Math.round(categoryHeaderColor.r + (255 - categoryHeaderColor.r) * scrollProgress));
	const g = $derived(Math.round(categoryHeaderColor.g + (255 - categoryHeaderColor.g) * scrollProgress));
	const b = $derived(Math.round(categoryHeaderColor.b + (255 - categoryHeaderColor.b) * scrollProgress));
	const bgOpacity = $derived(1 - scrollProgress * 0.1);

	// Build back link from `from` query param when present
	const rawFrom = $page.url.searchParams.get('from');
	let backLink = $state('/mobile/transactions');
	if (rawFrom) {
		try {
			backLink = decodeURIComponent(rawFrom);
		} catch (e) {
			backLink = rawFrom;
		}
	}

	// Bottom sheet state
	let detailsSheetOpen = $state(false);

	// Mock map - use a data URI that looks like a map
	const mapFallback = `data:image/svg+xml,${encodeURIComponent(`<svg width="400" height="180" xmlns="http://www.w3.org/2000/svg">
		<rect fill="#e5e7eb" width="100%" height="100%"/>
		<rect fill="#d1d5db" x="20" y="0" width="8" height="180"/>
		<rect fill="#d1d5db" x="80" y="0" width="12" height="180"/>
		<rect fill="#d1d5db" x="150" y="0" width="6" height="180"/>
		<rect fill="#d1d5db" x="220" y="0" width="10" height="180"/>
		<rect fill="#d1d5db" x="300" y="0" width="8" height="180"/>
		<rect fill="#d1d5db" x="360" y="0" width="14" height="180"/>
		<rect fill="#d1d5db" x="0" y="30" width="400" height="6"/>
		<rect fill="#d1d5db" x="0" y="70" width="400" height="10"/>
		<rect fill="#d1d5db" x="0" y="110" width="400" height="8"/>
		<rect fill="#d1d5db" x="0" y="150" width="400" height="12"/>
		<rect fill="#fbbf24" x="50" y="40" width="60" height="40" rx="4"/>
		<rect fill="#93c5fd" x="180" y="20" width="80" height="60" rx="4"/>
		<rect fill="#86efac" x="290" y="50" width="50" height="35" rx="4"/>
		<rect fill="#fca5a5" x="100" y="100" width="70" height="45" rx="4"/>
		<rect fill="#c4b5fd" x="230" y="95" width="55" height="50" rx="4"/>
		<circle fill="#ef4444" cx="200" cy="90" r="12"/>
		<circle fill="#fff" cx="200" cy="87" r="5"/>
	</svg>`)}`;

	// Insight cards data - now with period context and amounts
	const insightCards = $derived.by(() => {
		const cards: Array<{
			id: string;
			title: string;
			subtitle: string;
			period: string;
			icon: 'trending-up' | 'trending-down' | 'shopping-bag' | 'calendar';
			iconBg: string;
			iconColor: string;
		}> = [];

		// Current month name for context
		const monthNames = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
		const currentMonth = monthNames[new Date().getMonth()];

		if (data.insight) {
			cards.push({
				id: 'spending',
				title: data.insight.isMore
					? `${data.insight.percentDiff}% meer`
					: `${Math.abs(data.insight.percentDiff)}% minder`,
				subtitle: `Deze betaling: € ${tx.amount.toFixed(2)}`,
				period: `Gem. € ${data.insight.avgAmount.toFixed(2)} in ${currentMonth}`,
				icon: data.insight.isMore ? 'trending-up' : 'trending-down',
				iconBg: data.insight.isMore ? 'bg-red-100' : 'bg-green-100',
				iconColor: data.insight.isMore ? 'text-red-600' : 'text-green-600'
			});
		}

		if (data.merchantStats.totalTransactions > 1) {
			cards.push({
				id: 'visits',
				title: `${data.merchantStats.totalTransactions}x bezocht`,
				subtitle: `Totaal € ${data.merchantStats.totalSpent.toFixed(0)}`,
				period: `in ${currentMonth}`,
				icon: 'shopping-bag',
				iconBg: 'bg-blue-100',
				iconColor: 'text-blue-600'
			});
		}

		// Category insight
		cards.push({
			id: 'category',
			title: tx.category,
			subtitle: tx.isRecurring ? 'Terugkerend' : 'Eenmalig',
			period: tx.isRecurring ? tx.recurringInterval || '' : '',
			icon: 'calendar',
			iconBg: tx.categoryColor ? '' : 'bg-purple-100',
			iconColor: tx.categoryColor || 'text-purple-600'
		});

		return cards;
	});
</script>

<svelte:head>
	<title>{tx.merchant} - Transactie</title>
</svelte:head>

<!-- Header with back/share -->
<header
	class="mobile-header-component sticky top-0 z-20 flex flex-col transition-[backdrop-filter] duration-200"
	style="
		background-color: rgba({r}, {g}, {b}, {bgOpacity});
		backdrop-filter: blur({blurAmount}px);
		-webkit-backdrop-filter: blur({blurAmount}px);
		box-shadow: 0 12px 32px -4px rgba(0, 0, 0, {headerShadowOpacity});
		transform: translateZ(0);
	"
>
	<div class="flex w-full items-center justify-between px-4 pt-[54px] pb-2">
		<MobileLink href={backLink} class="rounded-full p-2 hover:bg-black/5 active:bg-black/10">
			<ArrowLeft class="h-6 w-6 text-black dark:text-white" />
		</MobileLink>

		<div class="flex-1"></div>

		<button class="rounded-full p-2 hover:bg-black/5 active:bg-black/10">
			<Share2 class="h-6 w-6 text-black dark:text-white" />
		</button>
	</div>
</header>

<!-- Hero section - centered logo above, then transaction card -->
<div
	class="px-4 pb-4"
	style="background-color: rgb({categoryHeaderColor.r}, {categoryHeaderColor.g}, {categoryHeaderColor.b})"
>
	<!-- Centered merchant logo -->
	<div class="flex justify-center pb-4">
		<div class="overflow-hidden rounded-xl shadow-lg">
			<MerchantLogo merchantName={tx.merchant} categoryIcon={tx.categoryIcon} size="lg" />
		</div>
	</div>

	<Card padding="p-0" class="overflow-hidden">
		<!-- Transaction row - now with category icon instead of merchant logo -->
		<div class="flex items-center gap-3 px-4 py-3">
			<!-- Category icon instead of merchant logo -->
			<div 
				class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
				style="background-color: {tx.categoryColor ? tx.categoryColor + '20' : 'rgb(243, 239, 237)'}"
			>
				<CategoryIconComponent 
					class="h-5 w-5"
					style="color: {tx.categoryColor || 'rgb(107, 114, 128)'}"
					strokeWidth={1.5}
				/>
			</div>
			<div class="min-w-0 flex-1">
				<h1 class="truncate font-heading text-lg font-bold text-gray-900 dark:text-white">{tx.merchant}</h1>
				<p class="text-sm text-gray-600 dark:text-gray-400">
					{tx.dayName} • {tx.time || tx.date}
				</p>
			</div>
			<div class="flex items-center gap-1">
				{#if !tx.isDebit}
					<div class="rounded-[10px] bg-green-100 px-2 py-1 dark:bg-green-900/30">
						<Amount
							amount={tx.amount}
							size="md"
							showSign={false}
							class="font-heading !text-green-800 dark:!text-green-400"
						/>
					</div>
				{:else}
					<Amount
						amount={-tx.amount}
						size="md"
						class="font-heading !text-gray-900 dark:!text-white"
					/>
				{/if}
				<ChevronRight class="h-3.5 w-3.5 text-gray-400" strokeWidth={2} />
			</div>
		</div>

		<!-- Category row -->
		<div class="flex items-center justify-between border-t border-gray-100 px-4 py-2.5 dark:border-gray-800">
			<div class="flex items-center gap-2">
				<div
					class="flex h-7 items-center rounded-full px-2.5"
					style="background-color: {tx.categoryColor
						? tx.categoryColor + '20'
						: 'rgb(243, 239, 237)'}"
				>
					<span class="text-xs font-semibold text-gray-700 dark:text-gray-300">{tx.category}</span>
				</div>
				{#if tx.isRecurring}
					<div class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
						<Repeat class="h-3.5 w-3.5 text-blue-500" strokeWidth={2} />
						{tx.recurringInterval}
					</div>
				{/if}
			</div>
			<button class="flex items-center gap-1 text-xs font-medium text-mediumOrange-600 hover:underline">
				Wijzig categorie
				<ChevronRight class="h-3.5 w-3.5" strokeWidth={2} />
			</button>
		</div>
	</Card>
</div>

<!-- Insights Carousel Section -->
{#if insightCards.length > 0}
	<div class="mt-4">
		<WidgetHeader title="Inzichten" class="mb-3 px-4" />
		<div class="-mx-0">
			<HorizontalCarousel cardWidth={150} gap={12}>
				{#each insightCards as card (card.id)}
					<Card padding="p-0" class="min-w-[150px] flex-shrink-0">
						<div class="p-3">
							<!-- 2-tone icon -->
							<div
								class="mb-2 flex h-9 w-9 items-center justify-center rounded-full {card.iconBg}"
								style={card.id === 'category' && tx.categoryColor
									? `background-color: ${tx.categoryColor}20`
									: ''}
							>
								{#if card.icon === 'trending-up'}
									<TrendingUp class="h-4 w-4 {card.iconColor}" strokeWidth={2} />
								{:else if card.icon === 'trending-down'}
									<TrendingDown class="h-4 w-4 {card.iconColor}" strokeWidth={2} />
								{:else if card.icon === 'shopping-bag'}
									<ShoppingBag class="h-4 w-4 {card.iconColor}" strokeWidth={2} />
								{:else if card.icon === 'calendar'}
									<Calendar
										class="h-4 w-4"
										style={tx.categoryColor ? `color: ${tx.categoryColor}` : ''}
										strokeWidth={2}
									/>
								{/if}
							</div>
							<h3 class="font-heading text-base font-bold text-gray-900 dark:text-white">
								{card.title}
							</h3>
							<p class="text-sm text-gray-500 dark:text-gray-400">
								{card.subtitle}
							</p>
							{#if card.period}
								<p class="text-sm text-gray-400 dark:text-gray-500">
									{card.period}
								</p>
							{/if}
						</div>
					</Card>
				{/each}
			</HorizontalCarousel>
		</div>
	</div>
{/if}

<!-- Actions Section -->
<div class="mt-4 px-4">
	<WidgetHeader title="Acties" class="mb-3" />
	<Card padding="p-0">
		<div class="divide-y divide-gray-100 dark:divide-gray-800">
			<button
				onclick={() => (detailsSheetOpen = true)}
				class="flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors active:bg-gray-50 dark:active:bg-gray-800"
			>
				<div class="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
					<FileText class="h-5 w-5 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
				</div>
				<span class="flex-1 text-base text-gray-900 dark:text-white">Bekijk pasbetaling details</span>
				<ChevronRight class="h-4 w-4 text-gray-400" strokeWidth={2} />
			</button>
			<button
				class="flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors active:bg-gray-50 dark:active:bg-gray-800"
			>
				<div class="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
					<Search class="h-5 w-5 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
				</div>
				<span class="flex-1 text-base text-gray-900 dark:text-white">Zoek vergelijkbare transacties</span>
				<ChevronRight class="h-4 w-4 text-gray-400" strokeWidth={2} />
			</button>
			<button
				class="flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors active:bg-gray-50 dark:active:bg-gray-800"
			>
				<div class="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
					<Users class="h-5 w-5 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
				</div>
				<span class="flex-1 text-base text-gray-900 dark:text-white">Deel kosten met betaalverzoek</span>
				<ChevronRight class="h-4 w-4 text-gray-400" strokeWidth={2} />
			</button>
		</div>
	</Card>
</div>

<!-- Map Section - now after actions, clickable card without button -->
<div class="mt-4 px-4">
	<WidgetHeader title="Locatie" class="mb-3" />
	<Card padding="p-0" class="overflow-hidden">
		<button class="relative w-full active:opacity-90" onclick={() => window.open('https://maps.google.com/?q=Amsterdam+Centrum', '_blank')}>
			<img
				src={mapFallback}
				alt="Locatie van transactie"
				class="h-32 w-full object-cover"
				loading="lazy"
			/>
			<!-- Gradient overlay -->
			<div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
			<!-- Location info overlay -->
			<div class="absolute bottom-0 left-0 right-0 p-3">
				<div class="flex items-center gap-2 text-white">
					<MapPin class="h-4 w-4" strokeWidth={2} />
					<span class="text-base font-medium">Amsterdam Centrum</span>
				</div>
			</div>
		</button>
	</Card>
</div>

<!-- About Merchant Section -->
<div class="mt-6 px-4 pb-24">
	<WidgetHeader title="Over {tx.merchant}" class="mb-3" />
	<Card padding="p-0">
		<div class="divide-y divide-gray-100 dark:divide-gray-800">
			<button
				class="flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors active:bg-gray-50 dark:active:bg-gray-800"
			>
				<div class="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
					<Phone class="h-5 w-5 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
				</div>
				<span class="flex-1 text-base text-gray-900 dark:text-white">Bel de klantenservice</span>
				<ChevronRight class="h-4 w-4 text-gray-400" strokeWidth={2} />
			</button>
			<button
				class="flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors active:bg-gray-50 dark:active:bg-gray-800"
			>
				<div class="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
					<Globe class="h-5 w-5 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
				</div>
				<span class="flex-1 text-base text-gray-900 dark:text-white">Bezoek website</span>
				<ChevronRight class="h-4 w-4 text-gray-400" strokeWidth={2} />
			</button>
			<button
				class="flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors active:bg-gray-50 dark:active:bg-gray-800"
			>
				<div class="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
					<MessageSquare class="h-5 w-5 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
				</div>
				<span class="flex-1 text-base text-gray-900 dark:text-white">Overige contactinformatie</span>
				<ChevronRight class="h-4 w-4 text-gray-400" strokeWidth={2} />
			</button>
		</div>
	</Card>
</div>

<!-- Transaction Details Bottom Sheet -->
<BottomSheet bind:open={detailsSheetOpen} onClose={() => (detailsSheetOpen = false)} title="Transactiegegevens">
	<div class="space-y-4">
		<!-- Payment info card -->
		<Card padding="p-4">
			<div class="space-y-4">
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
						<CreditCard class="h-5 w-5 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
					</div>
					<div>
						<p class="text-xs text-gray-500 dark:text-gray-400">Betaalmethode</p>
						<p class="font-medium text-gray-900 dark:text-white">Pinpas</p>
					</div>
				</div>

				{#if tx.iban}
					<div class="flex items-center gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
							<Hash class="h-5 w-5 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
						</div>
						<div>
							<p class="text-xs text-gray-500 dark:text-gray-400">IBAN</p>
							<p class="font-mono text-sm text-gray-900 dark:text-white">{tx.iban}</p>
						</div>
					</div>
				{/if}

				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
						<Calendar class="h-5 w-5 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
					</div>
					<div>
						<p class="text-xs text-gray-500 dark:text-gray-400">Datum</p>
						<p class="text-gray-900 dark:text-white">{tx.date}</p>
					</div>
				</div>

				{#if tx.time}
					<div class="flex items-center gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
							<Clock class="h-5 w-5 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
						</div>
						<div>
							<p class="text-xs text-gray-500 dark:text-gray-400">Tijd</p>
							<p class="text-gray-900 dark:text-white">{tx.time}</p>
						</div>
					</div>
				{/if}

				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
						<Receipt class="h-5 w-5 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
					</div>
					<div>
						<p class="text-xs text-gray-500 dark:text-gray-400">Type</p>
						<p class="text-gray-900 dark:text-white">{tx.isDebit ? 'Uitgave' : 'Inkomst'}</p>
					</div>
				</div>
			</div>
		</Card>

		<!-- Description card -->
		{#if tx.description}
			<Card padding="p-4">
				<div class="flex items-start gap-3">
					<div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
						<Info class="h-5 w-5 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
					</div>
					<div class="min-w-0 flex-1">
						<p class="mb-1 text-xs text-gray-500 dark:text-gray-400">Omschrijving</p>
						<p class="break-words font-mono text-xs leading-relaxed text-gray-700 dark:text-gray-300">
							{tx.description}
						</p>
					</div>
				</div>
			</Card>
		{/if}

		<!-- Transaction ID (mock) -->
		<Card padding="p-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs text-gray-500 dark:text-gray-400">Transactie ID</p>
					<p class="font-mono text-sm text-gray-900 dark:text-white">TX{tx.id.toString().padStart(8, '0')}</p>
				</div>
				<button class="text-sm font-medium text-mediumOrange-600">Kopieer</button>
			</div>
		</Card>
	</div>
</BottomSheet>
