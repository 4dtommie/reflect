<script lang="ts">
	import { BarChart3, LayoutGrid, MessageCircleQuestion, CircleUser, Home } from 'lucide-svelte';
	import { page } from '$app/stores';
	import MobileLink from './MobileLink.svelte';
	import { mobileThemeName } from '$lib/stores/mobileTheme';

	// Theme checks
	const isOriginal = $derived($mobileThemeName === 'nn-original');
	const isRebrand = $derived($mobileThemeName === 'rebrand');

	let { isAtBottom = true } = $props();

	const currentPath = $derived($page.url.pathname);

	const activeTab = $derived.by(() => {
		if (currentPath === '/mobile') return 'home';
		if (currentPath.startsWith('/mobile/products')) return 'producten';
		if (currentPath.startsWith('/mobile/kijk-vooruit')) return 'producten';
		if (currentPath.startsWith('/mobile/product-details')) return 'producten';
		if (currentPath.startsWith('/mobile/help')) return 'hulp';
		if (currentPath.startsWith('/mobile/profile')) return 'profiel';
		return 'home';
	});
</script>

<div
	class="bottom-nav dark:bg-gray-1300 flex cursor-none flex-col font-nn transition-shadow duration-300"
	class:bottom-nav-glassy={isRebrand}
	class:bg-sand-50={!isRebrand}
	class:backdrop-blur-md={!isRebrand}
	class:shadow-[0_-4px_12px_rgba(0,0,0,0.08)]={!isAtBottom}
	style="transform: translateZ(0);"
>
	<div class="nav-items flex h-[64px] w-full items-stretch">
		<!-- Home/Inzicht Tab -->
		<MobileLink
			href="/mobile"
			class="nav-item relative flex flex-1 cursor-none flex-col items-center justify-center gap-0 py-2"
		>
			{#if isOriginal}
				<BarChart3
					class="h-6 w-6 {activeTab === 'home'
						? 'text-mediumOrange-500'
						: 'text-gray-600 dark:text-gray-400'}"
					strokeWidth={1.5}
				/>
			{:else}
				<Home
					class="h-6 w-6 {activeTab === 'home'
						? 'text-mediumOrange-500'
						: 'text-gray-600 dark:text-gray-400'}"
					strokeWidth={1.5}
				/>
			{/if}
			<div class="relative">
				<span
					class="text-[12px] {activeTab === 'home'
					? 'font-medium text-gray-1000 dark:text-white'
					: 'font-normal text-gray-1000 dark:text-gray-400'}"
				>
					{isOriginal ? 'Inzicht' : 'Home'}
				</span>
				{#if activeTab === 'home'}
					<div
						class="absolute right-0 -bottom-1 left-0 h-[2px] rounded-full bg-mediumOrange-500"
					></div>
				{/if}
			</div>
		</MobileLink>

		<!-- Producten Tab -->
		<MobileLink
			href="/mobile/products"
			class="nav-item relative flex flex-1 cursor-none flex-col items-center justify-center gap-0 py-2"
		>
			<LayoutGrid
				class="h-6 w-6 {activeTab === 'producten'
					? 'text-mediumOrange-500'
				: 'text-gray-800 dark:text-gray-400'}"
				strokeWidth={1.5}
			/>
			<div class="relative">
				<span
					class="text-[12px] {activeTab === 'producten'
					? 'font-medium text-gray-1000 dark:text-white'
					: 'font-normal text-gray-1000 dark:text-gray-400'}"
				>
					Producten
				</span>
				{#if activeTab === 'producten'}
					<div
						class="absolute right-0 -bottom-1 left-0 h-[2px] rounded-full bg-mediumOrange-500"
					></div>
				{/if}
			</div>
		</MobileLink>

		<!-- Hulp Tab -->
		<MobileLink
			href="/mobile/help"
			class="nav-item relative flex flex-1 cursor-none flex-col items-center justify-center gap-0 py-2"
		>
			<MessageCircleQuestion
				class="h-6 w-6 {activeTab === 'hulp'
					? 'text-mediumOrange-500'
				: 'text-gray-800 dark:text-gray-400'}"
				strokeWidth={1.5}
			/>
			<div class="relative">
				<span
					class="text-[12px] {activeTab === 'hulp'
					? 'font-medium text-gray-1000 dark:text-white'
					: 'font-normal text-gray-1000 dark:text-gray-400'}"
				>
					Hulp
				</span>
				{#if activeTab === 'hulp'}
					<div
						class="absolute right-0 -bottom-1 left-0 h-[2px] rounded-full bg-mediumOrange-500"
					></div>
				{/if}
			</div>
		</MobileLink>

		<!-- Profiel Tab -->
		<MobileLink
			href="/mobile/profile"
			class="nav-item relative flex flex-1 cursor-none flex-col items-center justify-center gap-0 py-2"
		>
			<CircleUser
				class="h-6 w-6 {activeTab === 'profiel'
					? 'text-mediumOrange-500'
				: 'text-gray-800 dark:text-gray-400'}"
				strokeWidth={1.5}
			/>
			<div class="relative">
				<span
					class="text-[12px] {activeTab === 'profiel'
					? 'font-medium text-gray-1000 dark:text-white'
					: 'font-normal text-gray-1000 dark:text-gray-400'}"
				>
					Profiel
				</span>
				{#if activeTab === 'profiel'}
					<div
						class="absolute right-0 -bottom-1 left-0 h-[2px] rounded-full bg-mediumOrange-500"
					></div>
				{/if}
			</div>
		</MobileLink>
	</div>

	<!-- iOS Home Indicator -->
	<div class="home-indicator-wrapper flex justify-center pt-1 pb-2">
		<div class="home-indicator h-[5px] w-[134px] rounded-full bg-gray-900 dark:bg-white"></div>
	</div>
</div>

<style>
	.bottom-nav-glassy {
		background: rgba(255, 255, 255, 0.55);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border-top: 1px solid rgba(255, 255, 255, 0.5);
		box-shadow: 
			0 -1px 2px rgba(0, 0, 0, 0.03),
			0 -4px 12px rgba(0, 0, 0, 0.04),
			inset 0 1px 0 rgba(255, 255, 255, 0.6);
	}

	:global(.dark) .bottom-nav-glassy {
		background: rgba(30, 30, 30, 0.6);
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		box-shadow: 
			0 -1px 2px rgba(0, 0, 0, 0.1),
			0 -4px 12px rgba(0, 0, 0, 0.15),
			inset 0 1px 0 rgba(255, 255, 255, 0.05);
	}
</style>
