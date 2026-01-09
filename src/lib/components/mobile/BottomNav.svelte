<script lang="ts">
	import { BarChart3, LayoutGrid, MessageCircleQuestion, CircleUser, Home } from 'lucide-svelte';
	import { page } from '$app/stores';
	import MobileLink from './MobileLink.svelte';

	let { isAtBottom = true } = $props();

	const currentPath = $derived($page.url.pathname);

	const activeTab = $derived.by(() => {
		if (currentPath === '/mobile') return 'home';
		if (currentPath.startsWith('/mobile/kijk-vooruit')) return 'producten';
		if (currentPath.startsWith('/mobile/transactions')) return 'home'; // Standard transactions are part of home/activity
		if (currentPath.startsWith('/mobile/help')) return 'hulp';
		if (currentPath.startsWith('/mobile/profile')) return 'profiel';
		return 'home';
	});
</script>

<div
	class="dark:bg-gray-1300 flex cursor-none flex-col bg-sand-50 font-nn backdrop-blur-md transition-shadow duration-300"
	class:shadow-[0_-4px_12px_rgba(0,0,0,0.08)]={!isAtBottom}
	style="transform: translateZ(0);"
>
	<div class="flex h-[64px] w-full items-stretch">
		<!-- Home Tab -->
		<MobileLink
			href="/mobile"
			class="relative flex flex-1 cursor-none flex-col items-center justify-center gap-0 py-2"
		>
			<Home
				class="h-6 w-6 {activeTab === 'home'
					? 'text-mediumOrange-500'
					: 'text-gray-600 dark:text-gray-400'}"
				strokeWidth={1.5}
			/>
			<div class="relative">
				<span
					class="text-[11px] {activeTab === 'home'
						? 'font-bold text-gray-900 dark:text-white'
						: 'font-medium text-gray-900 dark:text-gray-400'}"
				>
					Home
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
			href="/mobile/kijk-vooruit"
			class="relative flex flex-1 cursor-none flex-col items-center justify-center gap-0 py-2"
		>
			<LayoutGrid
				class="h-6 w-6 {activeTab === 'producten'
					? 'text-mediumOrange-500'
					: 'text-gray-600 dark:text-gray-400'}"
				strokeWidth={1.5}
			/>
			<div class="relative">
				<span
					class="text-[11px] {activeTab === 'producten'
						? 'font-bold text-gray-900 dark:text-white'
						: 'font-medium text-gray-900 dark:text-gray-400'}"
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
			class="relative flex flex-1 cursor-none flex-col items-center justify-center gap-0 py-2"
		>
			<MessageCircleQuestion
				class="h-6 w-6 {activeTab === 'hulp'
					? 'text-mediumOrange-500'
					: 'text-gray-600 dark:text-gray-400'}"
				strokeWidth={1.5}
			/>
			<div class="relative">
				<span
					class="text-[11px] {activeTab === 'hulp'
						? 'font-bold text-gray-900 dark:text-white'
						: 'font-medium text-gray-900 dark:text-gray-400'}"
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
			class="relative flex flex-1 cursor-none flex-col items-center justify-center gap-0 py-2"
		>
			<CircleUser
				class="h-6 w-6 {activeTab === 'profiel'
					? 'text-mediumOrange-500'
					: 'text-gray-600 dark:text-gray-400'}"
				strokeWidth={1.5}
			/>
			<div class="relative">
				<span
					class="text-[11px] {activeTab === 'profiel'
						? 'font-bold text-gray-900 dark:text-white'
						: 'font-medium text-gray-900 dark:text-gray-400'}"
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
	<div class="flex justify-center pt-1 pb-2">
		<div class="h-[5px] w-[134px] rounded-full bg-gray-900 dark:bg-white"></div>
	</div>
</div>
