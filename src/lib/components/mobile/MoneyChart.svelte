<script lang="ts">
	import { ChevronRight } from 'lucide-svelte';
</script>

<div class="card bg-base-100 p-4 shadow-sm">
	<h3 class="mb-4 text-lg font-bold">Jouw geld in april</h3>

	<div class="flex gap-4">
		<!-- Chart Area -->
		<div class="flex h-40 w-1/3 items-end justify-center gap-2 border-b border-gray-200 pb-1">
			<!-- Income Bar -->
			<div class="h-[85%] w-6 rounded-t bg-green-500"></div>
			<!-- Expenses Bar -->
			<div class="h-[75%] w-6 rounded-t bg-purple-500"></div>
			<!-- Savings Bar -->
			<div class="bg-lightOrange-400 h-[15%] w-6 rounded-t"></div>
		</div>

		<!-- List Area -->
		<div class="flex w-2/3 flex-col justify-end gap-3 md:justify-center">
			<a href="#" class="flex items-center justify-between border-b border-gray-100 pb-2">
				<div class="flex items-center gap-2">
					<div class="h-3 w-3 rounded-full bg-green-500"></div>
					<span class="text-sm font-medium text-gray-700">Inkomsten</span>
				</div>
				<div class="flex items-center gap-1">
					<span class="font-bold">€ 3.500</span>
					<ChevronRight class="h-4 w-4 text-gray-400" strokeWidth={1.5} />
				</div>
			</a>

			<a href="#" class="flex items-center justify-between border-b border-gray-100 pb-2">
				<div class="flex items-center gap-2">
					<div class="h-3 w-3 rounded-full bg-purple-500"></div>
					<span class="text-sm font-medium text-gray-700">Uitgaven</span>
				</div>
				<div class="flex items-center gap-1">
					<span class="font-bold">€ 3.000</span>
					<ChevronRight class="h-4 w-4 text-gray-400" strokeWidth={1.5} />
				</div>
			</a>

			<a href="#" class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<div class="bg-lightOrange-400 h-3 w-3 rounded-full"></div>
					<span class="flex flex-col text-sm leading-tight font-medium text-gray-700">
						<span>Sparen &</span>
						<span>Beleggen</span>
					</span>
				</div>
				<div class="flex items-center gap-1">
					<span class="font-bold">€ 500</span>
					<ChevronRight class="h-4 w-4 text-gray-400" strokeWidth={1.5} />
				</div>
			</a>
		</div>
	</div>
</div>
