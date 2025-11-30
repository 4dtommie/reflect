<script lang="ts">
	import DashboardWidget from '$lib/components/DashboardWidget.svelte';
	import Amount from '$lib/components/Amount.svelte';
	import { fade } from 'svelte/transition';
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

	let candidates: any[] = $state([]);
	let loading = $state(false);
	let hasSearched = $state(false);

	async function startDetection() {
		loading = true;
		hasSearched = true;
		try {
			const res = await fetch('/api/recurring/detect', { method: 'POST' });
			if (res.ok) {
				const data = await res.json();
				candidates = data.candidates;
			}
		} catch (e) {
			console.error(e);
		} finally {
			loading = false;
		}
	}
</script>

<div class="grid grid-cols-1 gap-8 p-4 md:grid-cols-2 lg:grid-cols-3">
	<div class="col-span-full grid grid-cols-1 gap-8 lg:grid-cols-3">
		<!-- Left Column: Title + Main Content -->
		<div class="flex flex-col gap-8 lg:col-span-2">
			<!-- Title Widget -->
			<DashboardWidget size="wide">
				<div class="flex h-full flex-col justify-center px-6 pt-3 pb-6">
					<h1 class="mb-4 text-7xl font-bold">Subscriptions 🕵️</h1>
					<p class="text-2xl opacity-70">
						{randomSubtitle}
					</p>
				</div>
			</DashboardWidget>

			{#if !hasSearched}
				<!-- Initial State: Call to Action -->
				<DashboardWidget size="wide">
					<div class="flex h-full flex-col items-center justify-center py-12 text-center">
						<div class="mb-6 rounded-full bg-primary/10 p-6">
							<Settings size={48} class="text-primary" />
						</div>
						<h2 class="mb-2 text-2xl font-bold">Ready to investigate?</h2>
						<p class="mb-8 max-w-md opacity-70">
							We'll scan your transaction history for subscriptions, bills, and salary patterns.
						</p>
						<button class="btn btn-lg btn-primary" onclick={startDetection}>
							<Play class="mr-2 h-5 w-5" />
							Start Investigation
						</button>
					</div>
				</DashboardWidget>
			{:else if loading}
				<!-- Loading State -->
				<DashboardWidget size="wide">
					<div class="flex h-full flex-col items-center justify-center py-12 text-center">
						<span class="loading mb-4 loading-lg loading-spinner text-primary"></span>
						<h2 class="animate-pulse text-xl font-semibold">Scanning transactions...</h2>
						<p class="opacity-70">Looking for patterns and known providers</p>
					</div>
				</DashboardWidget>
			{:else if candidates.length > 0}
				<!-- Results Grid -->
				<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
					<!-- Left Column -->
					<div class="flex flex-col gap-8">
						<!-- Results Widget -->
						<DashboardWidget size="large" title="Found in known list">
							<div class="flex h-full flex-col justify-start">
								<div class="space-y-3">
									{#each candidates as candidate}
										<div class="flex items-center justify-between rounded-lg bg-base-200 p-4">
											<div class="flex items-center gap-4">
												<div>
													<h3 class="text-lg font-bold">{candidate.name}</h3>
													<p class="text-sm opacity-70">
														 <Amount
															value={candidate.averageAmount}
															size="small"
															isDebit={true}
														/>
														average
													</p>
													<p class="text-sm opacity-70">
														In {candidate.transactions.length}
														payments
													</p>
												</div>
											</div>
											<div class="text-right">
												<div class="text-xl font-bold">
													<Amount value={candidate.amount} size="large" isDebit={true} />
												</div>
												{#if candidate.averageAmount && candidate.averageAmount !== candidate.amount}
													<div class="flex justify-end gap-1 text-sm opacity-50">
														
													</div>
												{/if}
												<div class="mt-1 badge badge-sm badge-primary">
													{candidate.interval}
												</div>
												<div
													class="mt-1 badge badge-sm {candidate.confidence > 0.8
														? 'badge-success'
														: 'badge-warning'}"
												>
													{Math.round(candidate.confidence * 100)}% sure
												</div>
											</div>
										</div>
									{/each}
								</div>
							</div>
						</DashboardWidget>
					</div>
					<!-- Right Column (Empty for now) -->
					<div class="flex flex-col gap-8"></div>
				</div>
			{:else}
				<!-- No Results -->
				<DashboardWidget size="wide">
					<div class="flex h-full flex-col items-center justify-center py-12 text-center">
						<h2 class="text-xl font-semibold">No recurring transactions found</h2>
						<p class="opacity-70">We couldn't find any clear patterns in your history.</p>
						<button class="btn mt-4 btn-ghost" onclick={() => (hasSearched = false)}
							>Try Again</button
						>
					</div>
				</DashboardWidget>
			{/if}
		</div>

		<!-- Right Column: Summary and Actions -->
		<div class="flex flex-col gap-8">
			<!-- Summary Placeholder (only show when results exist) -->
			{#if candidates.length > 0}
				<DashboardWidget size="small" title="Detection summary">
					<div class="flex h-full flex-col justify-center gap-4">
						<div class="stat p-0">
							<div class="stat-title">Total Monthly</div>
							<div class="stat-value text-primary">
								€{candidates
									.reduce((sum, c) => sum + (c.interval === 'monthly' ? Number(c.amount) : 0), 0)
									.toFixed(0)}
							</div>
							<div class="stat-desc">Estimated fixed costs</div>
						</div>
					</div>
				</DashboardWidget>
			{/if}
		</div>
	</div>
</div>
