<script lang="ts">
	import { page } from '$app/stores';
	import { onMount, onDestroy } from 'svelte';
	import TransactionItem from '$lib/components/mobile/TransactionItem.svelte';
	import InsightsCarousel from '$lib/components/mobile/InsightsCarousel.svelte';
	import {
		QrCode,
		Columns3Cog,
		Menu,
		ArrowUp,
		ArrowDown
	} from 'lucide-svelte';
	import MobileHeader from '$lib/components/mobile/MobileHeader.svelte';
	import MobileLink from '$lib/components/mobile/MobileLink.svelte';
	import ExpectedWidget from '$lib/components/mobile/ExpectedWidget.svelte';

	// New design system components
	import { ProductWidget, ListItemGroup } from '$lib/components/mobile/organisms';
	import { mobileThemeName } from '$lib/stores/mobileTheme';
	import { mobileStatusBarColor } from '$lib/stores/mobileStatusBarColor';

	// Data from server
	let { data } = $props();

	// Theme checks
	const isOriginal = $derived($mobileThemeName === 'nn-original');
	const isImproved = $derived($mobileThemeName === 'improved');
	const isRebrand = $derived($mobileThemeName === 'rebrand');

	// Set status bar color based on theme
	$effect(() => {
		if (isImproved) {
			// Soft teal/green color for home header in redesign
			mobileStatusBarColor.set('rgb(200, 230, 220)');
		} else if (isRebrand) {
			mobileStatusBarColor.set('transparent');
		} else {
			mobileStatusBarColor.set(null);
		}
	});

	// Reset on unmount
	onDestroy(() => {
		mobileStatusBarColor.set(null);
	});

	// Current path to conditionally render widgets
	const currentPath = $derived($page.url.pathname);

	const layoutParam = $derived($page.url.searchParams.get('layout'));
	let layout = $state<'default' | 'A' | 'B' | 'C'>('default');

	$effect(() => {
		if (layoutParam) {
			layout = layoutParam as 'default' | 'A' | 'B' | 'C';
			localStorage.setItem('productLayout', layout);
		} else {
			const stored = localStorage.getItem('productLayout') as 'default' | 'A' | 'B' | 'C';
			if (stored) {
				layout = stored;
			}
		}
	});

	// Use shared product mock data (storage-aware)
	import { productsStore, type Product } from '$lib/mock/products';

	// Products (mocked) - reactive store
	const accounts = $derived($productsStore.filter((p) => p.enabled !== false));

	// Random emoticon for header
	const emoticons = ['👋', '😎', '😀', '😊', '✌️', '✨'];
	let emoticon = $state('👋');

	$effect(() => {
		emoticon = emoticons[Math.floor(Math.random() * emoticons.length)];
	});

	// Header title - theme aware (NN Original shows "Inzicht", improved shows greeting)
	const headerTitle = $derived(
		isOriginal ? 'Inzicht' : `Hi, ${data.userName} ${emoticon}`
	);

	// Action buttons for products (theme-aware labels)
	const productActions = $derived(
		isOriginal
			? [
					{ label: 'Overmaken', icon: ArrowUp, primary: true },
					{ label: 'Betaalverzoek', icon: ArrowDown }
				]
			: [
					{ label: 'Betalen', icon: ArrowUp, primary: true },
					{ label: 'Verzoek', icon: ArrowDown },
					{ label: 'Meer', icon: Menu, tertiary: true }
				]
	);
</script>

<svelte:head>
	<title>Reflect Mobile</title>
</svelte:head>

<div class="dashboard-layout relative px-0 pt-0 pb-4 font-nn overflow-hidden">
	<!-- Colored header section for redesign -->
	{#if isImproved}
		<div class="home-colored-header rounded-b-3xl" style="background-color: rgb(200, 230, 220);">
			<!-- Header -->
			<header class="sticky top-0 z-20 w-full pt-[54px]">
				<div class="flex w-full items-center justify-between px-4 pb-3">
					<button class="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-black/5">
						<QrCode class="h-6 w-6 text-black" strokeWidth={1.5} />
					</button>
					<div class="flex-1 text-center">
						<div class="truncate font-heading text-[20px] font-bold text-gray-1200">
							{headerTitle}
						</div>
					</div>
					<button class="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-black/5">
						<Columns3Cog class="h-6 w-6 text-black" strokeWidth={1.5} />
					</button>
				</div>
			</header>

			<!-- Product Widget inside colored area -->
			{#if currentPath === '/mobile' || currentPath === '/mobile/'}
				<div class="px-4 pb-4">
					<ProductWidget
						products={accounts}
						actions={productActions}
						linkBase="/mobile/product-details"
						layoutParam={layout}
					/>
				</div>
			{/if}
		</div>
	{:else}
		<!-- Original/Rebrand: Standard header -->
		<MobileHeader
			class="mobile-header-component home-header flex items-center justify-between px-4 pb-3 landscape:col-span-full landscape:px-0"
		>
			<div
				class="header-inner flex w-full items-center justify-between landscape:relative landscape:pt-0"
			>
				<button
					class="header-btn-left dark:hover:bg-gray-1200 flex h-10 w-10 items-center justify-center rounded-lg hover:bg-sand-100"
				>
					<QrCode class="h-6 w-6 text-black dark:text-white" strokeWidth={1.5} />
				</button>
				<div class="flex-1 text-center">
					<div class="truncate font-heading text-[20px] font-bold text-gray-1200 dark:text-white">
						{headerTitle}
					</div>
				</div>
				<button
					class="header-btn-right dark:hover:bg-gray-1200 flex h-10 w-10 items-center justify-center rounded-lg hover:bg-sand-100"
				>
					<Columns3Cog class="h-6 w-6 text-black dark:text-white" strokeWidth={1.5} />
				</button>
			</div>
		</MobileHeader>

		{#if currentPath === '/mobile' || currentPath === '/mobile/'}
			<div class="dashboard-sidebar px-4 landscape:px-0">
				<!-- Product Widget - theme aware (classic for NN, integrated for improved) -->
				<ProductWidget
					title={isOriginal ? 'Betaalsaldo' : undefined}
					products={accounts}
					actions={productActions}
					linkBase="/mobile/product-details"
					layoutParam={layout}
				/>
			</div>
		{/if}
	{/if}

	<div class="dashboard-main mt-6 space-y-6 px-4 landscape:mt-0 landscape:px-0">
		<!-- Inzichten Carousel -->
		<div class="InsightsCarousel-wrapper">
			<InsightsCarousel />
		</div>

		<!-- Transacties - Using ListItemGroup with theme awareness -->
		<ListItemGroup
			title="Betalingen"
			action={{ label: 'Bekijk alles', href: `/mobile/product-details${layout !== 'default' ? `?layout=${layout}` : ''}` }}
		>
			{#each data.transactions as t}
				<MobileLink
					href={`/mobile/transactions/${t.id}?from=${encodeURIComponent($page.url.pathname + $page.url.search)}`}
					class="dark:active:bg-gray-1100 block px-4 py-3 active:bg-gray-50"
				>
					<TransactionItem
						merchant={t.merchant}
						subtitle={t.subline}
						amount={t.isDebit ? -t.amount : t.amount}
						isDebit={t.isDebit}
						categoryIcon={t.categoryIcon}
						size="md"
						showSubtitle={isOriginal}
						showChevron={true}
						designVariant={isOriginal ? 'original' : 'redesign'}
						date={t.date}
						description={t.description ?? t.subline}
					/>
				</MobileLink>
			{:else}
				<div class="p-4 text-center text-sm text-gray-600 dark:text-gray-400">
					Geen transacties
				</div>
			{/each}
		</ListItemGroup>

		<!-- Verwacht Widget -->
		<ExpectedWidget items={data.upcomingPayments} />
	</div>
</div>
