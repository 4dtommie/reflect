<script lang="ts">
	import { Sparkles, ArrowRight, PiggyBank, ShieldCheck, Scissors, Coffee } from 'lucide-svelte';
	import type { ComponentType } from 'svelte';
	import DashboardWidget from './DashboardWidget.svelte';

	interface Props {
		hasTransactions?: boolean;
		hasCategorizedTransactions?: boolean;
	}

	let { hasTransactions = false, hasCategorizedTransactions = false }: Props = $props();

	// Mock in-progress actions (in real app, this would come from API/store)
	interface ActiveAction {
		id: string;
		title: string;
		icon: ComponentType;
		progress: number;
		summary: string;
		color: string;
	}

	const inProgressActions: ActiveAction[] = [
		{
			id: 'active-52week',
			title: '52-week challenge',
			icon: PiggyBank,
			progress: 35,
			summary: '€273 saved',
			color: 'bg-green-500'
		},
		{
			id: 'active-emergency',
			title: 'Emergency fund',
			icon: ShieldCheck,
			progress: 68,
			summary: '€3,400 of €5,000',
			color: 'bg-green-500'
		}
	];

	// Recommended action
	const recommendedAction = {
		id: 'latte-factor',
		title: 'Latte factor',
		description: 'Small costs that add up big.',
		icon: Coffee,
		color: 'bg-amber-500'
	};
</script>

{#if !hasTransactions || !hasCategorizedTransactions}
	<!-- Empty state: need transactions + categories -->
	<DashboardWidget size="small" variant="placeholder">
		<div class="flex h-full flex-col items-center justify-center text-center opacity-50">
			<Sparkles size={48} class="mb-4" />
			<h3 class="text-lg font-semibold">Actions</h3>
			<p class="text-sm">
				{#if !hasTransactions}
					Import transactions to unlock actions
				{:else}
					Categorize transactions to see personalized actions
				{/if}
			</p>
		</div>
	</DashboardWidget>
{:else}
	<DashboardWidget size="auto" title="Actions" actionLabel="View all" actionHref="/actions">
		<!-- In progress actions -->
		{#if inProgressActions.length > 0}
			<div class="space-y-2">
				{#each inProgressActions.slice(0, 2) as action (action.id)}
					<a
						href="/actions"
						class="flex cursor-pointer items-center gap-3 rounded-xl p-2 transition-colors hover:bg-base-200"
					>
						<div class="{action.color} flex-shrink-0 rounded-lg p-1.5 text-white">
							<action.icon size={14} />
						</div>
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<span class="truncate text-xs font-medium">{action.title}</span>
								<span class="text-[10px] opacity-40">{action.progress}%</span>
							</div>
							<div class="mt-1 h-1 w-full overflow-hidden rounded-full bg-base-200">
								<div
									class="h-full rounded-full {action.color} transition-all"
									style="width: {action.progress}%"
								></div>
							</div>
						</div>
					</a>
				{/each}
			</div>
		{/if}

		<!-- Divider -->
		{#if inProgressActions.length > 0}
			<div class="h-px bg-base-200"></div>
		{/if}

		<!-- Recommended action -->
		<a
			href="/actions"
			class="group flex cursor-pointer items-center gap-3 rounded-xl p-2 transition-colors hover:bg-base-200"
		>
			<div class="{recommendedAction.color} flex-shrink-0 rounded-lg p-1.5 text-white">
				<recommendedAction.icon size={14} />
			</div>
			<div class="min-w-0 flex-1">
				<div class="flex items-center gap-1">
					<span class="text-[10px] text-amber-600">✨ Recommended</span>
				</div>
				<span class="text-xs font-medium">{recommendedAction.title}</span>
			</div>
			<ArrowRight
				size={14}
				class="opacity-30 transition-transform group-hover:translate-x-0.5 group-hover:opacity-60"
			/>
		</a>
	</DashboardWidget>
{/if}
