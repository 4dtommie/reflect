<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { Sparkles } from 'lucide-svelte';
	import type { FunInsight } from '$lib/server/categorization/funInsightGenerator';

	// Props
	interface Props {
		insights?: FunInsight[];
	}

	let { insights = [] }: Props = $props();

	// Internal state
	let currentIndex = $state(0);
	let currentInsight = $state<FunInsight | null>(null);
	let interval: ReturnType<typeof setInterval>;
	// Track already shown insights to avoid immediate repetition if possible
	let shownIds = new Set<string>();

	// Watch for new insights
	$effect(() => {
		if (insights.length > 0 && !currentInsight) {
			// First insight
			showNextInsight();
		} else if (insights.length > 0 && currentInsight) {
			// Check if we have new insights that we haven't shown yet
			// If we are currently showing a "rule" insight and an "ai" one comes in, queue it?
			// For now, the rotation logic handles it.
		}
	});

	function showNextInsight() {
		if (!insights || insights.length === 0) return;

		// Simple rotation for now
		// If we have "ai" insights we haven't shown, prioritize them?
		// Or just rotate through available ones.

		// Find next index
		let nextIndex = (currentIndex + 1) % insights.length;

		// Optional: Logic to prioritize new insights could go here

		currentIndex = nextIndex;
		currentInsight = insights[currentIndex];
		shownIds.add(currentInsight.id);
	}

	onMount(() => {
		// Rotate every 7 seconds
		interval = setInterval(showNextInsight, 7000);

		return () => {
			if (interval) clearInterval(interval);
		};
	});

	onDestroy(() => {
		if (interval) clearInterval(interval);
	});
</script>

{#if currentInsight}
	<div class="mt-6" in:fade={{ duration: 400 }}>
		<div class="card border border-base-content/10 bg-base-100/50 shadow-sm backdrop-blur-sm">
			<div class="card-body flex flex-row items-center gap-4 p-5">
				<div class="animate-bounce-slow text-4xl">
					{currentInsight?.emoji}
				</div>
				<div class="flex-1">
					<div class="mb-1 flex items-center gap-2">
						<Sparkles class="h-3 w-3 text-secondary" />
						<span class="text-xs font-bold tracking-wider text-secondary uppercase">Fun Fact</span>
					</div>
					<p class="text-lg leading-tight font-medium">
						{#key currentInsight?.id}
							<span in:fade={{ duration: 300 }}>{currentInsight?.message}</span>
						{/key}
					</p>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.animate-bounce-slow {
		animation: bounce 3s infinite;
	}

	@keyframes bounce {
		0%,
		100% {
			transform: translateY(-5%);
			animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
		}
		50% {
			transform: translateY(5%);
			animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
		}
	}
</style>
