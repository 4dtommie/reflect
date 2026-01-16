<script lang="ts">
	import Card from './Card.svelte';
	import HorizontalCarousel from './HorizontalCarousel.svelte';
	import WidgetHeader from '$lib/components/mobile/WidgetHeader.svelte';
	import WidgetAction from '$lib/components/mobile/WidgetAction.svelte';
	import MobileLink from '$lib/components/mobile/MobileLink.svelte';
	import { ArrowRight } from 'lucide-svelte';
	import { mobileThemeName } from '$lib/stores/mobileTheme';

	// Theme check - for redesign/rebrand we hide titles and use 16px text
	const isOriginal = $derived($mobileThemeName === 'nn-original');
</script>

<section>
	<!-- Header with normal alignment -->
	<WidgetHeader title="Inzichten" badge={2} class="mb-3">
		<WidgetAction label="Alle inzichten" />
	</WidgetHeader>

	<!-- Carousel - use negative margin to break out of parent padding -->
	<div class="-mx-4">
		<HorizontalCarousel cardWidth={280} gap={16}>
			<Card padding="p-0">
				<MobileLink
					href="/mobile/insights/1"
					class="relative block h-full p-4 transition-all active:scale-[0.98] active:bg-gray-50 dark:active:bg-gray-800"
				>
					<span class="absolute top-4 right-4 text-sm font-normal text-gray-800 dark:text-gray-400">
						17 april
					</span>
					<div class="flex h-full gap-4">
						<div class="flex flex-1 flex-col">
							{#if isOriginal}
								<h3 class="mb-1 font-heading leading-tight font-bold dark:text-white">
									Wat is NN Inzicht?
								</h3>
							{/if}
							<p
								class="mb-3 line-clamp-2 overflow-hidden leading-relaxed text-gray-1000 dark:text-gray-300 {isOriginal ? 'text-sm' : 'text-base'}"
							>
								{isOriginal ? 'Meer uit je geld halen met je nieuwe NN betaalrekening' : 'Wat is NN Inzicht? Meer uit je geld halen met je nieuwe NN betaalrekening'}
							</p>
							<div class="mt-auto flex items-center font-medium text-gray-1000 dark:text-gray-200 {isOriginal ? 'text-sm' : 'text-base'}">
								Begin met Inzicht <ArrowRight class="ml-2 h-4 w-4 text-mediumOrange-600" strokeWidth={1.5} />
							</div>
						</div>
						<div class="w-12 shrink-0 self-end pb-2">
							<svg
								width="48"
								height="48"
								viewBox="0 0 60 60"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
								class="h-auto w-full"
							>
								<circle cx="30" cy="30" r="30" fill="#FCECE6" />
								<path
									d="M30 30L56 15C56 15 50 5 40 2L30 30Z"
									fill="#FAD7C8"
									stroke="#1A1A1A"
									stroke-width="1.5"
								/>
								<path
									d="M30 30L56 15C58.7614 19.7831 60.1032 25.109 59.9075 30.6214C59.7118 36.1338 58.0064 41.5238 54.8919 45.9875C51.7774 50.4512 47.456 53.7916 42.4249 55.4981C37.3938 57.2045 31.9567 57.1747 26.9602 55.4182C21.9637 53.6617 17.6833 50.2925 14.7735 45.8929C11.8637 41.4933 10.4632 36.2759 10.7416 31.0068C11.02 25.7377 12.95 20.6974 16.2974 16.5913C19.6449 12.4851 24.2373 9.53936 29.35 8.2L30 30Z"
									fill="white"
									stroke="#1A1A1A"
									stroke-width="1.5"
								/>
								<path d="M30 30L56 15" stroke="#1A1A1A" stroke-width="1.5" />
								<path d="M30 30V4" stroke="#1A1A1A" stroke-width="1.5" />
							</svg>
						</div>
					</div>
				</MobileLink>
			</Card>

			<Card padding="p-0">
				<MobileLink
					href="/mobile/insights/2"
					class="relative block h-full p-4 transition-all active:scale-[0.98] active:bg-gray-50 dark:active:bg-gray-800"
				>
					<span class="absolute top-4 right-4 text-sm font-normal text-gray-800 dark:text-gray-400">
						10%
					</span>
					<div class="flex h-full flex-col">
						{#if isOriginal}
							<h3 class="mb-1 font-heading font-bold dark:text-white">Normaal</h3>
						{/if}
						<p class="mb-3 text-gray-1000 dark:text-gray-300 {isOriginal ? 'text-sm' : 'text-base'}">{isOriginal ? '€ 75 spaarrente' : 'Normaal - € 75 spaarrente'}</p>
							<div class="mt-auto flex items-center font-medium text-gray-1000 dark:text-gray-200 {isOriginal ? 'text-sm' : 'text-base'}">
								Lees meer <ArrowRight class="ml-2 h-4 w-4 text-mediumOrange-600" strokeWidth={1.5} />
							</div>
					</div>
				</MobileLink>
			</Card>
		</HorizontalCarousel>
	</div>
</section>
