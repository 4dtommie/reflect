<script lang="ts">
	import Card from './Card.svelte';
	import { ArrowRight } from 'lucide-svelte';
	import { onMount } from 'svelte';

	// Manual drag logic removed to rely on native CSS scroll snap and inertia
	onMount(() => {
		// No manual scroll handling needed for native feel
	});
</script>

<section>
	<!-- Header with normal alignment -->
	<div class="mb-3 flex items-center justify-between">
		<h2 class="text-sm font-bold text-gray-900">2 nieuwe inzichten</h2>
		<button class="flex items-center text-xs font-medium text-mediumOrange-600">
			Alle inzichten <ArrowRight class="ml-1 h-3 w-3" strokeWidth={1.5} />
		</button>
	</div>

	<!-- Scrollable carousel - breaks out of parent padding with negative margin -->
	<div class="carousel-outer">
		<div class="carousel-scroll">
			<div class="carousel-card first-card">
				<Card class="h-full">
					<div class="flex h-full gap-4">
						<div class="flex flex-1 flex-col">
							<div class="mb-1 text-xs text-gray-500">17 april</div>
							<h3 class="mb-2 leading-tight font-bold">Wat is NN Inzicht?</h3>
							<p class="mb-3 flex-1 text-sm leading-relaxed text-gray-600">
								Meer uit je geld halen met je nieuwe NN betaalrekening
							</p>
							<button class="flex items-center text-sm font-medium text-mediumOrange-600">
								Lees meer <ArrowRight class="ml-2 h-4 w-4" strokeWidth={1.5} />
							</button>
						</div>
						<div class="w-16 shrink-0 self-center">
							<svg
								width="60"
								height="60"
								viewBox="0 0 60 60"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
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
				</Card>
			</div>

			<div class="carousel-card">
				<Card class="h-full">
					<div class="flex h-full flex-col">
						<div class="mb-1 text-xs text-gray-500">10%</div>
						<h3 class="font-bold">Normaal</h3>
						<p class="text-sm text-gray-600">€ 75 spaarrente</p>
					</div>
				</Card>
			</div>

			<div class="end-spacer"></div>
		</div>
	</div>
</section>

<style>
	/* Outer container breaks out of parent padding */
	.carousel-outer {
		margin-left: -1rem;
		margin-right: -1rem;
	}

	/* Inner scrollable area with hidden scrollbar */
	.carousel-scroll {
		display: flex;
		gap: 1rem;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		padding-top: 0.5rem;
		padding-bottom: 1rem;
		scrollbar-width: none;
		-ms-overflow-style: none;
	}
	.carousel-scroll::-webkit-scrollbar {
		display: none;
	}

	/* Each card */
	.carousel-card {
		width: 280px;
		flex-shrink: 0;
	}

	/* First card gets left padding */
	.first-card {
		padding-left: 1rem;
	}

	/* End spacer */
	.end-spacer {
		width: 1rem;
		flex-shrink: 0;
	}
</style>
