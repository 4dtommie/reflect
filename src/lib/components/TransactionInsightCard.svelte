<script lang="ts">
	import { AlertTriangle, Star, TrendingUp, ArrowDownLeft, Info, Sparkles } from 'lucide-svelte';
	import { fade, slide } from 'svelte/transition';

	type TransactionInsight = {
		id: string;
		transactionId: number;
		category: 'urgent' | 'action' | 'insight' | 'celebration' | 'roast';
		message: string;
		title?: string;
		icon?: string;
		priority: number;
		relatedTransactionId?: number;
		actionLabel?: string;
		actionHref?: string;
	};

	let {
		insight,
		onHover,
		onDismiss,
		onAction,
		isHighlighted = false
	}: {
		insight: TransactionInsight;
		onHover?: (transactionId: number | null) => void;
		onDismiss?: (id: string) => void;
		onAction?: (action: { type: string; transactionId: number }) => void;
		isHighlighted?: boolean;
	} = $props();

	let isHovered = $state(false);
	const isExpanded = $derived(isHovered || isHighlighted);

	function getIcon() {
		switch (insight.icon) {
			case 'AlertTriangle':
				return AlertTriangle;
			case 'Star':
				return Star;
			case 'TrendingUp':
				return TrendingUp;
			case 'ArrowDownLeft':
				return ArrowDownLeft;
			default:
				return Info;
		}
	}

	function getCategoryStyles() {
		switch (insight.category) {
			case 'urgent':
				return {
					badge: 'bg-error text-error-content',
					card: 'bg-base-100 border-error/30 shadow-lg shadow-error/5',
					icon: 'text-error'
				};
			case 'action':
				return {
					badge: 'bg-warning text-warning-content',
					card: 'bg-base-100 border-warning/30 shadow-lg shadow-warning/5',
					icon: 'text-warning'
				};
			case 'insight':
				return {
					badge: 'bg-info text-info-content',
					card: 'bg-base-100 border-info/30 shadow-lg shadow-info/5',
					icon: 'text-sky-700'
				};
			case 'celebration':
				return {
					badge: 'bg-success text-success-content',
					card: 'bg-base-100 border-success/30 shadow-lg shadow-success/5',
					icon: 'text-success'
				};
			case 'roast':
				return {
					badge: 'bg-secondary text-secondary-content',
					card: 'bg-base-100 border-secondary/30 shadow-lg shadow-secondary/5',
					icon: 'text-secondary'
				};
			default:
				return {
					badge: 'bg-base-300 text-base-content',
					card: 'bg-base-100 border-base-300 shadow-lg',
					icon: 'text-base-content'
				};
		}
	}

	function getTitle() {
		return insight.title || 'Insight';
	}

	const styles = $derived(getCategoryStyles());
	const IconComponent = $derived(getIcon());
	const title = $derived(getTitle());
</script>

<div
	class="relative inline-flex items-center"
	onmouseenter={() => {
		isHovered = true;
		onHover?.(insight.transactionId);
	}}
	onmouseleave={() => {
		isHovered = false;
		onHover?.(null);
	}}
	role="article"
>
	<!-- Compact Badge -->
	<div
		class="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-300 {styles.badge} {isExpanded
			? 'scale-90 opacity-0'
			: 'scale-100 opacity-100'} cursor-default shadow-sm"
	>
		<svelte:component this={IconComponent} size={14} />
		<span>{title}</span>
	</div>

	<!-- Expanded Card (Absolute overlay) -->
	{#if isExpanded}
		<div
			transition:fade={{ duration: 150 }}
			class="absolute top-1/2 left-0 z-20 w-64 -translate-y-1/2 rounded-xl border p-4 {styles.card}"
		>
			<div class="flex items-start gap-3">
				<div class="mt-0.5 flex-shrink-0">
					<div class="rounded-full bg-base-200/50 p-1.5">
						<svelte:component this={IconComponent} size={16} class={styles.icon} />
					</div>
				</div>
				<div class="min-w-0 flex-1">
					<p class="mb-1 text-sm font-semibold {styles.icon}">{title}</p>
					<p class="text-sm leading-relaxed text-base-content/80">{insight.message}</p>
					{#if insight.id.startsWith('sub_spotted')}
						<div class="mt-3 flex items-center gap-2">
							<button
								class="btn h-7 min-h-0 rounded-lg px-3 text-xs font-medium text-base-content/60 btn-ghost btn-xs hover:bg-base-content/10 hover:text-base-content"
								onclick={(e) => {
									e.stopPropagation();
									onDismiss?.(insight.id);
								}}
							>
								Nope
							</button>
							<button
								class="btn h-7 min-h-0 rounded-lg border-none px-3 text-xs font-medium btn-xs btn-primary"
								onclick={(e) => {
									e.stopPropagation();
									onAction?.({ type: 'add_sub', transactionId: insight.transactionId });
								}}
							>
								Track Sub
							</button>
						</div>
					{:else if insight.actionLabel && insight.actionHref}
						<a
							href={insight.actionHref}
							class="btn mt-2 btn-xs {styles.badge} border-none opacity-90 hover:opacity-100 hover:brightness-90"
							onclick={(e) => e.stopPropagation()}
						>
							{insight.actionLabel}
						</a>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>
