<script lang="ts">
	import Card from './Card.svelte';
	import WidgetHeader from './WidgetHeader.svelte';
	import { mobileThemeName } from '$lib/stores/mobileTheme';
	import Amount from './Amount.svelte';
	import { PiggyBank, Sparkles } from 'lucide-svelte';

	interface Props {
		interestRate?: number;
		bonusRate?: number;
		interestAmount?: number;
		bonusAmount?: number;
	}

	let {
		interestRate = 2.1,
		bonusRate = 0.5,
		interestAmount = 14.5,
		bonusAmount = 5.25
	}: Props = $props();

	// Simple theme check
	const isOriginal = $derived($mobileThemeName === 'nn-original');
	// Theme-aware dividers (original shows no dividers, improved shows dividers)
	const dividerClasses = $derived(isOriginal ? '' : 'divide-y divide-gray-100 dark:divide-gray-800');
</script>

<section class="mt-6 mb-6">
	<WidgetHeader title="Rente overzicht" class="mb-3">
		<div class="flex items-center gap-2">
			<div class="flex items-center gap-1.5 rounded-full bg-sand-100 px-2.5 py-1 dark:bg-gray-800">
				<PiggyBank class="h-3.5 w-3.5 text-mediumOrange-600" />
				<span class="text-[10px] font-bold tracking-wider text-gray-1000 dark:text-gray-300"
					>{interestRate}%</span
				>
			</div>
			<div
				class="flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 dark:bg-amber-900/30"
			>
				<Sparkles class="h-3.5 w-3.5 text-amber-600" />
				<span class="text-[10px] font-bold tracking-wider text-amber-700 dark:text-amber-400"
					>{bonusRate}% Bonus</span
				>
			</div>
		</div>
	</WidgetHeader>

	<Card padding="p-0">
		<div class={dividerClasses}>
			<!-- Regular Interest -->
			<div class="flex items-center justify-between px-4 py-4">
				<div class="flex items-center gap-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
					>
						<PiggyBank class="h-6 w-6" strokeWidth={1.5} />
					</div>
					<div>
					<div class="text-sm font-bold text-gray-1000 dark:text-white">Opgebouwde rente</div>
					<div class="text-xs text-gray-800 dark:text-gray-400">Lekker sparen hoor!</div>
					</div>
				</div>
				<Amount
					amount={interestAmount}
					showSign={false}
					showSymbol={true}
					size="md"
					class="!text-gray-1000 dark:!text-white"
				/>
			</div>

			<!-- Bonus Interest -->
			<div class="flex items-center justify-between px-4 py-4">
				<div class="flex items-center gap-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500 dark:bg-amber-900/30 dark:text-amber-400"
					>
						<Sparkles class="h-6 w-6" strokeWidth={1.5} />
					</div>
					<div>
						<div class="text-sm font-bold text-gray-1000 dark:text-white">Bonus rente</div>
						<div class="text-xs font-medium text-amber-600 italic dark:text-amber-500">
							Extraatje ✨
						</div>
					</div>
				</div>
				<div class="flex flex-col items-end">
					<Amount
						amount={bonusAmount}
						showSign={false}
						showSymbol={true}
						size="md"
						class="font-black !text-amber-500"
					/>
				</div>
			</div>
		</div>
	</Card>
</section>

<style>
	/* Custom gold color if needed, but amber-500 is usually a good "gold" in Tailwind */
	:global(.dark) .text-amber-500 {
		color: #fbbf24;
	}
</style>
