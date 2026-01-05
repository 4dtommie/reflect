<script lang="ts">
	import { onMount } from 'svelte';

	let iframeSrc = '/m?embed=true';
	let currentTheme = $state<'nord' | 'night'>('nord');

	onMount(() => {
		const storedTheme = localStorage.getItem('theme') as 'nord' | 'night' | null;
		if (storedTheme) {
			currentTheme = storedTheme;
		} else if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
			currentTheme = 'night';
		}
	});

	function toggleTheme() {
		currentTheme = currentTheme === 'nord' ? 'night' : 'nord';
		localStorage.setItem('theme', currentTheme);
	}
</script>

<svelte:head>
	<title>Mobile Preview | Reflect</title>
</svelte:head>

<div
	class="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8"
>
	<div class="flex items-center gap-16">
		<!-- Sidebar with controls -->
		<div class="flex flex-col gap-6">
			<div>
				<h1 class="mb-2 text-3xl font-bold text-white">📱 Mobile skin preview</h1>
				<p class="text-slate-400">iPhone 15 mockup • 393×852 viewport</p>
			</div>

			<!-- Theme controls -->
			<div class="flex flex-col gap-2">
				<span class="text-sm font-medium text-slate-400">Theme</span>
				<div class="flex gap-2">
					<button
						class="btn btn-sm {currentTheme === 'nord' ? 'btn-primary' : 'text-white btn-ghost'}"
						onclick={() => {
							currentTheme = 'nord';
							localStorage.setItem('theme', 'nord');
						}}
					>
						☀️ Light
					</button>
					<button
						class="btn btn-sm {currentTheme === 'night' ? 'btn-primary' : 'text-white btn-ghost'}"
						onclick={() => {
							currentTheme = 'night';
							localStorage.setItem('theme', 'night');
						}}
					>
						🌙 Dark
					</button>
				</div>
			</div>
		</div>

		<!-- iPhone mockup -->
		<div class="iphone-frame">
			<!-- Dynamic Island -->
			<div class="dynamic-island"></div>

			<!-- Screen content -->
			<iframe src={iframeSrc} title="Mobile Preview" class="iphone-screen" data-theme={currentTheme}
			></iframe>

			<!-- Home indicator -->
			<div class="home-indicator"></div>
		</div>
	</div>
</div>

<style>
	/* Override root layout styles to remove grey border */
	:global(html),
	:global(body) {
		background: transparent !important;
		padding: 0 !important;
		margin: 0 !important;
	}

	.iphone-frame {
		position: relative;
		width: 433px; /* 393 + 40px for frame */
		height: 892px; /* 852 + 40px for frame */
		background: linear-gradient(145deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%);
		border-radius: 55px;
		padding: 20px;
		box-shadow:
			0 25px 50px -12px rgba(0, 0, 0, 0.5),
			inset 0 2px 4px rgba(255, 255, 255, 0.1),
			inset 0 -2px 4px rgba(0, 0, 0, 0.2);
	}

	.iphone-frame::before {
		content: '';
		position: absolute;
		top: 50%;
		right: -3px;
		transform: translateY(-50%);
		width: 4px;
		height: 100px;
		background: #2d2d2d;
		border-radius: 0 4px 4px 0;
	}

	.iphone-frame::after {
		content: '';
		position: absolute;
		top: 20%;
		left: -3px;
		width: 4px;
		height: 60px;
		background: #2d2d2d;
		border-radius: 4px 0 0 4px;
		box-shadow: 0 50px 0 #2d2d2d;
	}

	.dynamic-island {
		position: absolute;
		top: 32px;
		left: 50%;
		transform: translateX(-50%);
		width: 120px;
		height: 35px;
		background: #000;
		border-radius: 20px;
		z-index: 10;
	}

	.iphone-screen {
		width: 393px;
		height: 852px;
		border-radius: 40px;
		border: none;
		background: white;
		overflow: hidden;
	}

	.home-indicator {
		position: absolute;
		bottom: 28px;
		left: 50%;
		transform: translateX(-50%);
		width: 140px;
		height: 5px;
		background: rgba(255, 255, 255, 0.3);
		border-radius: 3px;
	}
</style>
