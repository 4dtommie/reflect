<script lang="ts">
	import { CreditCard, ArrowUp, ArrowDown, MoreVertical } from 'lucide-svelte';
	import Amount from '$lib/components/mobile/Amount.svelte';

	interface Props {
		/** Account name/type */
		name: string;
		/** Account balance */
		balance: number;
		/** Optional class */
		class?: string;
	}

	let { name, balance, class: className = '' }: Props = $props();
</script>

<div class="h-full rounded-xl bg-white px-3 py-2.5 shadow-sm {className}">
	<!-- Account type header -->
	<div class="mb-0 flex items-center justify-between">
		<span class="text-sm font-medium text-gray-500">{name}</span>
		<CreditCard class="h-5 w-5 text-white" fill="#8d8d8d" strokeWidth={1.5} />
	</div>

	<!-- Balance using Amount component -->
	<div class="mb-2 flex items-baseline gap-2">
		<span class="font-heading text-3xl font-bold text-gray-900">€</span>
		<Amount
			amount={balance}
			size="xl"
			showSign={false}
			class="font-heading !text-3xl !text-gray-900"
		/>
	</div>

	<!-- Action buttons - larger text and icons -->
	<div class="grid grid-cols-3 pt-2">
		<button
			class="group -mx-1 flex flex-col items-center gap-1.5 rounded-lg py-1 transition-colors active:bg-sand-50"
		>
			<div
				class="flex h-12 w-12 items-center justify-center rounded-full bg-sand-100 transition-colors group-hover:bg-sand-200 group-active:bg-sand-300"
			>
				<ArrowUp class="h-6 w-6 text-mediumOrange-600" strokeWidth={2.5} />
			</div>
			<span class="text-sm font-normal text-gray-700">Betalen</span>
		</button>
		<button
			class="group -mx-1 flex flex-col items-center gap-1.5 rounded-lg py-1 transition-colors active:bg-sand-50"
		>
			<div
				class="flex h-12 w-12 items-center justify-center rounded-full bg-sand-100 transition-colors group-hover:bg-sand-200 group-active:bg-sand-300"
			>
				<ArrowDown class="h-6 w-6 text-mediumOrange-600" strokeWidth={2.5} />
			</div>
			<span class="text-sm font-normal text-gray-700">Verzoek</span>
		</button>
		<button
			class="group -mx-1 flex flex-col items-center gap-1.5 rounded-lg py-1 transition-colors active:bg-sand-50"
		>
			<div
				class="flex h-12 w-12 items-center justify-center rounded-full bg-sand-100 transition-colors group-hover:bg-sand-200 group-active:bg-sand-300"
			>
				<MoreVertical class="h-6 w-6 text-mediumOrange-600" strokeWidth={2.5} />
			</div>
			<span class="text-sm font-normal text-gray-700">Meer</span>
		</button>
	</div>
</div>
