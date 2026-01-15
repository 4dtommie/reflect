<script lang="ts">
	import { page } from '$app/stores';
	import TransactionItem from '$lib/components/mobile/TransactionItem.svelte';
	import InsightsCarousel from '$lib/components/mobile/InsightsCarousel.svelte';
	import {
		QrCode,
		Settings2,
		Menu,
		ArrowUp,
		ArrowDown
	} from 'lucide-svelte';
	import MobileHeader from '$lib/components/mobile/MobileHeader.svelte';
	import MobileLink from '$lib/components/mobile/MobileLink.svelte';
	import ExpectedWidget from '$lib/components/mobile/ExpectedWidget.svelte';

	// New design system components
	import { ProductWidget, ListItemGroup } from '$lib/components/mobile/organisms';
	import { mobileTheme, mobileThemeName } from '$lib/stores/mobileTheme';

	// Data from server
	let { data } = $props();

	// Get current theme config
	const theme = $derived($mobileTheme);

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

	// Header title - theme aware (NN Original shows "Home", improved shows greeting)
	const headerTitle = $derived(
		theme.header.homeTitle ?? `Hi, ${data.userName} ${emoticon}`
	);

	// Action buttons for products (theme-aware labels)
	const productActions = $derived(
		theme.productWidget.actionsPosition === 'classic'
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

<div class="dashboard-layout px-0 pt-0 pb-4 font-nn">
	<!-- Header (Now at top level for full-width landscape) -->
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
				<div class="truncate font-heading text-[20px] font-bold text-gray-900 dark:text-white">
					{headerTitle}
				</div>
			</div>
			<button
				class="header-btn-right dark:hover:bg-gray-1200 flex h-10 w-10 items-center justify-center rounded-lg hover:bg-sand-100"
			>
				<Settings2 class="h-6 w-6 text-black dark:text-white" strokeWidth={1.5} />
			</button>
		</div>
	</MobileHeader>

	<div class="dashboard-sidebar px-4 landscape:px-0">
		<!-- Product Widget - theme aware (classic for NN, integrated for improved) -->
		<ProductWidget
			title={theme.productWidget.actionsPosition === 'classic' ? 'Betaalsaldo' : 'Vermogen'}
			products={accounts}
			actions={productActions}
			linkBase="/mobile/transactions"
			layoutParam={layout}
		/>
	</div>

	<div class="dashboard-main mt-6 space-y-6 px-4 landscape:mt-0 landscape:px-0">
		<!-- Inzichten Carousel -->
		<div class="InsightsCarousel-wrapper">
			<InsightsCarousel />
		</div>

		<!-- Transacties - Using ListItemGroup with theme awareness -->
		<ListItemGroup
			title="Betalingen"
			action={{ label: 'Bekijk alles', href: `/mobile/transactions${layout !== 'default' ? `?layout=${layout}` : ''}` }}
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
						compact={true}
						showSubtitle={$mobileThemeName === 'nn-original'}
						showChevron={true}
						designVariant={$mobileThemeName === 'nn-original' ? 'original' : 'redesign'}
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
