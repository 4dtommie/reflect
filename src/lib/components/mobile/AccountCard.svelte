<script lang="ts">
	import {
		CreditCard,
		ArrowUp,
		ArrowDown,
		MoreVertical,
		Users,
		User,
		PiggyBank
	} from 'lucide-svelte';
	import Amount from '$lib/components/mobile/Amount.svelte';

	interface Props {
		/** Account name/type */
		name: string;
		/** Account balance */
		balance: number;
		/** Optional class */
		class?: string;
		/** Account type for icon selection */
		type?: 'checking' | 'savings' | 'investment';
		/** Joint account badge */
		isJoint?: boolean;
		/** Compact mode for sidebar selection */
		compact?: boolean;
		/** Show buttons even in compact mode */
		showButtons?: boolean;
	}

	let {
		name,
		balance,
		class: className = '',
		type = 'checking',
		compact = false,
		showButtons = false,
		isJoint = false
	}: Props = $props();
</script>

<div
	class="dark:bg-gray-1200 rounded-xl {compact
		? 'bg-transparent'
		: 'bg-white px-3 py-2.5 shadow-sm'} {compact ? 'px-3 py-1.5' : ''} {className}"
>
	<!-- Account type header -->
	<div class="mb-0 flex min-h-8 items-center justify-between">
		<span
			class="font-heading {compact
				? 'text-xs'
				: 'text-sm'} font-medium text-gray-800 dark:text-gray-400">{name}</span
		>
		{#if isJoint}
			<span class="rounded-full bg-sand-100 px-2 py-0.5 text-xs font-semibold text-gray-1000">Gezamenlijk</span>
		{/if}
	</div>

	<!-- Balance using Amount component -->
	<div class="{compact ? 'mt-0.5 mb-1' : '-mt-1 mb-2'} flex items-baseline gap-1.5">
		<span
			class="font-heading {compact
				? 'text-sm'
				: 'text-3xl'} font-bold text-gray-1000 dark:text-white">€</span
		>
		<Amount
			amount={balance}
			size={compact ? 'sm' : 'xl'}
			showSign={false}
			class="font-heading {compact ? '!text-base' : '!text-3xl'} !text-gray-1000 dark:!text-white"
		/>
	</div>

<!-- Action buttons removed: they are rendered externally by the page -->
</div>
