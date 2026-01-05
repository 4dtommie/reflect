<script lang="ts">
	import './mobile.css';
	import PlaceholderWidget from '$lib/components/mobile/PlaceholderWidget.svelte';
	import { Wallet, TrendingUp, PieChart, Calendar, Bell, Target } from 'lucide-svelte';
	import { page } from '$app/stores';

	// Check if loaded in embed mode (for iframe)
	const isEmbed = $derived($page.url.searchParams.get('embed') === 'true');
</script>

<svelte:head>
	<title>Reflect Mobile</title>
	<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
</svelte:head>

{#if isEmbed}
	<!-- Embed mode: plain viewport for iframe -->
	<div class="mobile-viewport">
		<div class="mobile-status-bar">
			<span>9:41</span>
		</div>
		<div class="mobile-content">
			<div class="flex flex-col gap-4">
				<div class="mb-2">
					<h2 class="!bg-none !text-2xl font-bold !text-base-content">Good morning 👋</h2>
					<p class="text-sm text-base-content/60">Here's your financial overview</p>
				</div>
				<div class="widget-grid">
					<PlaceholderWidget title="Balance" size="2x1" icon={Wallet} />
					<PlaceholderWidget title="Spending" size="1x1" icon={TrendingUp} />
					<PlaceholderWidget title="Budget" size="1x1" icon={Target} />
					<PlaceholderWidget title="Categories" size="1x2" icon={PieChart} />
					<PlaceholderWidget title="Upcoming" size="1x1" icon={Calendar} />
					<PlaceholderWidget title="Alerts" size="1x1" icon={Bell} />
				</div>
			</div>
		</div>
	</div>
{:else}
	<!-- Standalone mode: with nice wrapper -->
	<div class="mobile-page">
		<div class="mobile-viewport">
			<div class="mobile-status-bar">
				<span>9:41</span>
			</div>
			<div class="mobile-content">
				<div class="flex flex-col gap-4">
					<div class="mb-2">
						<h2 class="!bg-none !text-2xl font-bold !text-base-content">Good morning 👋</h2>
						<p class="text-sm text-base-content/60">Here's your financial overview</p>
					</div>
					<div class="widget-grid">
						<PlaceholderWidget title="Balance" size="2x1" icon={Wallet} />
						<PlaceholderWidget title="Spending" size="1x1" icon={TrendingUp} />
						<PlaceholderWidget title="Budget" size="1x1" icon={Target} />
						<PlaceholderWidget title="Categories" size="1x2" icon={PieChart} />
						<PlaceholderWidget title="Upcoming" size="1x1" icon={Calendar} />
						<PlaceholderWidget title="Alerts" size="1x1" icon={Bell} />
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Override root layout styles for /m */
	:global(html),
	:global(body) {
		background: #1e293b !important;
		padding: 0 !important;
		margin: 0 !important;
		max-width: none !important;
	}

	.mobile-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
		padding: 2rem;
	}

	/* Standalone styling - border and shadow for /m page only */
	.mobile-page :global(.mobile-viewport) {
		border-radius: 40px;
		box-shadow:
			0 25px 50px -12px rgba(0, 0, 0, 0.5),
			0 0 0 1px rgba(255, 255, 255, 0.1);
	}
</style>
