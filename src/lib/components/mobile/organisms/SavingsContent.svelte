<script lang="ts">
	import type { Component } from 'svelte';
	import Card from '$lib/components/mobile/Card.svelte';
	import WidgetHeader from '$lib/components/mobile/WidgetHeader.svelte';
	import WidgetAction from '$lib/components/mobile/WidgetAction.svelte';
	import TransactionItem from '$lib/components/mobile/TransactionItem.svelte';
	import InterestWidget from '$lib/components/mobile/InterestWidget.svelte';
	import SavingsGoalItem from '$lib/components/mobile/SavingsGoalItem.svelte';
	import { TransactionListSkeleton } from '$lib/components/mobile/organisms';
	import { Bike, GraduationCap, Plus } from 'lucide-svelte';

	interface SavingsGoal {
		title: string;
		saved: number;
		target: number;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		icon: Component<any>;
		color: string;
	}

	interface Props {
		isLoading?: boolean;
		interestRate?: number;
		interestAmount?: number;
		bonusAmount?: number;
		savingsGoals?: SavingsGoal[];
		onAddGoal?: () => void;
		class?: string;
	}

	// Default goals with proper typing
	const defaultGoals: SavingsGoal[] = [
		{ title: 'Nieuwe fiets', saved: 1500, target: 2000, icon: Bike as unknown as Component<any>, color: 'bg-blue-800' },
		{ title: 'Studie Jip', saved: 5500, target: 12000, icon: GraduationCap as unknown as Component<any>, color: 'bg-blue-800' }
	];

	let {
		isLoading = false,
		interestRate = 2.1,
		interestAmount = 14.5,
		bonusAmount = 5.25,
		savingsGoals = defaultGoals,
		onAddGoal,
		class: className = ''
	}: Props = $props();
</script>

<div class={className}>
	{#if isLoading}
		<TransactionListSkeleton title="Betalingen" itemCount={2} />
	{:else}
		<!-- Savings Transactions -->
		<WidgetHeader title="Betalingen" class="mb-3">
			<WidgetAction label="Bekijk alles" />
		</WidgetHeader>

		<Card padding="p-0" class="mb-6">
			<div class="divide-y divide-gray-100 dark:divide-gray-800">
				<TransactionItem
					merchant="Spaaropdracht"
					subtitle="Automatische overboeking"
					amount={150.0}
					isDebit={false}
					compact={true}
					showSubtitle={true}
					categoryIcon="savings"
					class="px-4 py-3"
				/>
				<TransactionItem
					merchant="Vakantie potje"
					subtitle="Eenmalige inleg"
					amount={50.0}
					isDebit={false}
					compact={true}
					showSubtitle={true}
					categoryIcon="holiday"
					class="px-4 py-3"
				/>
			</div>
		</Card>

		<!-- Interest Overview -->
		<InterestWidget {interestRate} {interestAmount} {bonusAmount} />

		<!-- Savings Goals -->
		<WidgetHeader title="Spaardoelen" class="mb-3" />

		<Card padding="p-0" class="mb-6">
			<div class="divide-y divide-gray-100 dark:divide-gray-800">
				{#each savingsGoals as goal}
					<SavingsGoalItem
						title={goal.title}
						saved={goal.saved}
						target={goal.target}
						icon={goal.icon}
						color={goal.color}
					/>
				{/each}
			</div>
		</Card>

		<button
			onclick={onAddGoal}
			class="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-transparent py-4 text-sm font-semibold text-gray-800 transition-all hover:bg-gray-50 active:scale-[0.99] dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
		>
			<Plus class="h-5 w-5" />
			Spaardoel toevoegen
		</button>
	{/if}
</div>
