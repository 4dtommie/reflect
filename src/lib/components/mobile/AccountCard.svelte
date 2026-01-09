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
		type?: 'checking' | 'savings';
	}

	let { name, balance, class: className = '', type = 'checking' }: Props = $props();
</script>

<div class="dark:bg-gray-1200 rounded-xl bg-white px-3 py-2.5 shadow-sm {className}">
	<!-- Account type header -->
	<div class="mb-0 flex min-h-8 items-center justify-between">
		<span class="font-heading text-sm font-medium text-gray-600 dark:text-gray-400">{name}</span>
		<div class="flex items-center gap-2">
			{#if type === 'savings'}
				<User class="h-5 w-5 text-gray-800 dark:text-white" strokeWidth={1.5} />
				<PiggyBank class="h-6 w-6 text-gray-800 dark:text-white" strokeWidth={1} />
			{:else}
				<Users class="h-5 w-5 text-gray-800 dark:text-white" strokeWidth={1.5} />
				<CreditCard class="h-8 w-8 text-gray-800 dark:text-white" strokeWidth={1} />
			{/if}
		</div>
	</div>

	<!-- Balance using Amount component -->
	<div class="-mt-1 mb-2 flex items-baseline gap-2">
		<span class="font-heading text-3xl font-bold text-gray-900 dark:text-white">€</span>
		<Amount
			amount={balance}
			size="xl"
			showSign={false}
			class="font-heading !text-3xl !text-gray-900 dark:!text-white"
		/>
	</div>

	<!-- Action buttons - modern pill style -->
	<div class="flex gap-2 pt-2">
		<button
			class="dark:bg-gray-1100 flex h-9 flex-1 items-center justify-center gap-2 rounded-full bg-sand-100 px-4 transition-all active:scale-95 active:bg-sand-200 dark:active:bg-gray-900"
		>
			<ArrowUp class="h-4 w-4 text-mediumOrange-600" strokeWidth={2.5} />
			<span class="font-heading text-sm font-semibold text-gray-700 dark:text-gray-200"
				>Betalen</span
			>
		</button>
		<button
			class="dark:bg-gray-1100 flex h-9 flex-1 items-center justify-center gap-2 rounded-full bg-sand-100 px-4 transition-all active:scale-95 active:bg-sand-200 dark:active:bg-gray-900"
		>
			<ArrowDown class="h-4 w-4 text-mediumOrange-600" strokeWidth={2.5} />
			<span class="font-heading text-sm font-semibold text-gray-700 dark:text-gray-200"
				>Verzoek</span
			>
		</button>
		<button
			class="dark:bg-gray-1100 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-sand-100 transition-all active:scale-95 active:bg-sand-200 dark:active:bg-gray-900"
		>
			<MoreVertical class="h-4 w-4 text-mediumOrange-600" strokeWidth={2.5} />
		</button>
	</div>
</div>
