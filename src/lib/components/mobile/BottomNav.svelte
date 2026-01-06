<script lang="ts">
	import { BarChart3, ListOrdered, MessageCircleQuestion, CircleUser } from 'lucide-svelte';

	let activeTab = $state('inzicht');
</script>

<div class="flex cursor-none flex-col bg-white font-nn shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
	<div class="flex h-[64px] w-full items-stretch">
		<!-- Inzicht Tab -->
		<button
			class="relative flex flex-1 cursor-none flex-col items-center justify-center gap-1 py-2"
			onclick={() => (activeTab = 'inzicht')}
		>
			<BarChart3
				class="h-6 w-6 {activeTab === 'inzicht' ? 'text-mediumOrange-500' : 'text-gray-600'}"
				strokeWidth={1.5}
			/>
			<div class="relative">
				<span
					class="text-[11px] text-gray-900 {activeTab === 'inzicht' ? 'font-bold' : 'font-medium'}"
				>
					Inzicht
				</span>
				{#if activeTab === 'inzicht'}
					<div
						class="absolute right-0 -bottom-1 left-0 h-[2px] rounded-full bg-mediumOrange-500"
					></div>
				{/if}
			</div>
		</button>

		<!-- Producten Tab -->
		<button
			class="relative flex flex-1 cursor-none flex-col items-center justify-center gap-1 py-2"
			onclick={() => (activeTab = 'producten')}
		>
			<ListOrdered
				class="h-6 w-6 {activeTab === 'producten' ? 'text-mediumOrange-500' : 'text-gray-600'}"
				strokeWidth={1.5}
			/>
			<div class="relative">
				<span
					class="text-[11px] text-gray-900 {activeTab === 'producten'
						? 'font-bold'
						: 'font-medium'}"
				>
					Producten
				</span>
				{#if activeTab === 'producten'}
					<div
						class="absolute right-0 -bottom-1 left-0 h-[2px] rounded-full bg-mediumOrange-500"
					></div>
				{/if}
			</div>
		</button>

		<!-- Hulp Tab -->
		<button
			class="relative flex flex-1 cursor-none flex-col items-center justify-center gap-1 py-2"
			onclick={() => (activeTab = 'hulp')}
		>
			<MessageCircleQuestion
				class="h-6 w-6 {activeTab === 'hulp' ? 'text-mediumOrange-500' : 'text-gray-600'}"
				strokeWidth={1.5}
			/>
			<div class="relative">
				<span
					class="text-[11px] text-gray-900 {activeTab === 'hulp' ? 'font-bold' : 'font-medium'}"
				>
					Hulp
				</span>
				{#if activeTab === 'hulp'}
					<div
						class="absolute right-0 -bottom-1 left-0 h-[2px] rounded-full bg-mediumOrange-500"
					></div>
				{/if}
			</div>
		</button>

		<!-- Profiel Tab -->
		<button
			class="relative flex flex-1 cursor-none flex-col items-center justify-center gap-1 py-2"
			onclick={() => (activeTab = 'profiel')}
		>
			<CircleUser
				class="h-6 w-6 {activeTab === 'profiel' ? 'text-mediumOrange-500' : 'text-gray-600'}"
				strokeWidth={1.5}
			/>
			<div class="relative">
				<span
					class="text-[11px] text-gray-900 {activeTab === 'profiel' ? 'font-bold' : 'font-medium'}"
				>
					Profiel
				</span>
				{#if activeTab === 'profiel'}
					<div
						class="absolute right-0 -bottom-1 left-0 h-[2px] rounded-full bg-mediumOrange-500"
					></div>
				{/if}
			</div>
		</button>
	</div>

	<!-- iOS Home Indicator -->
	<div class="flex justify-center pt-1 pb-2">
		<div class="h-[5px] w-[134px] rounded-full bg-gray-900"></div>
	</div>
</div>
