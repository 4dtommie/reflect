<script lang="ts">
	import DashboardWidget from '$lib/components/DashboardWidget.svelte';
	import PlaceholderWidget from '$lib/components/PlaceholderWidget.svelte';
	import { Settings, List, Activity, Play } from 'lucide-svelte';
	const subtitles = [
		'Elementary, my dear user.',
		'Searching for clues in your bank statement...',
		'The game is afoot!',
		'Unmasking those hidden subscriptions.',
		'Investigating your recurring payments.',
		'Sherlock Holmes would be proud.',
		'Tracking down those pesky monthly charges.',
		'Magnifying glass ready!',
		'No subscription can hide from us.',
		'Solving the mystery of where your money goes.'
	];

	const randomSubtitle = subtitles[Math.floor(Math.random() * subtitles.length)];
</script>

<div class="grid grid-cols-1 gap-8 p-4 md:grid-cols-2 lg:grid-cols-3">
	<div class="col-span-full grid grid-cols-1 gap-8 lg:grid-cols-3">
		<!-- Left Column: Title + Main Content -->
		<div class="flex flex-col gap-8 lg:col-span-2">
			<!-- Title Widget -->
			<DashboardWidget size="wide">
				<div class="flex h-full flex-col justify-center px-6 pt-3 pb-6">
					<h1 class="mb-4 text-7xl font-bold">Sub Detective 🕵️</h1>
					<p class="text-2xl opacity-70">
						{randomSubtitle}
					</p>
				</div>
			</DashboardWidget>

			<!-- Detection Settings Placeholder -->
			<PlaceholderWidget
				title="Detection settings"
				description="Configure how we identify recurring transactions"
				size="wide"
				icon={Settings}
			/>

			<!-- Transaction List Placeholder -->
			<PlaceholderWidget
				title="Transaction analysis"
				description="Review transactions that look like subscriptions"
				size="wide"
				icon={List}
			/>
		</div>

		<!-- Right Column: Summary and Actions -->
		<div class="flex flex-col gap-8">
			<!-- Summary Placeholder -->
			<PlaceholderWidget
				title="Detection summary"
				description="Overview of potential subscriptions found"
				size="small"
				icon={Activity}
			/>

			<!-- Actions Placeholder -->
			<PlaceholderWidget
				title="Actions"
				description="Start detection or save results"
				size="small"
				icon={Play}
			/>
		</div>
	</div>
</div>
