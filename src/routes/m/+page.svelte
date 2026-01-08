<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	// Handle current theme
	let currentTheme = $state<'nord' | 'night'>('nord');
	let currentDevice = $state<'iphone' | 'pixel'>('iphone');

	// Handle time offset
	// Handle time offset
	let offset = $state(0);
	let autoPlayInterval: NodeJS.Timeout | null = null;
	let isAutoPlaying = $state(false);

	// Iframe state
	let iframeEl: HTMLIFrameElement | undefined = $state();
	let iframeSrc = $state('/mobile');

	onMount(() => {
		const storedTheme = localStorage.getItem('theme') as 'nord' | 'night' | null;
		if (storedTheme) {
			currentTheme = storedTheme;
		} else if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
			currentTheme = 'night';
		}

		// Initialize offset from URL if present
		const urlOffset = $page.url.searchParams.get('offset');
		if (urlOffset) {
			offset = parseInt(urlOffset, 10) || 0;
		}

		// Initial load with offset
		updateIframeUrl();
	});

	$effect(() => {
		// React to device change
		if (currentDevice) {
			updateIframeUrl();
		}
	});

	onDestroy(() => {
		stopAutoPlay();
	});

	function toggleTheme() {
		currentTheme = currentTheme === 'nord' ? 'night' : 'nord';
		localStorage.setItem('theme', currentTheme);
	}

	function updateIframeUrl() {
		// Update URL state of parent (wrapper)
		const url = new URL(window.location.href);
		if (offset === 0) {
			url.searchParams.delete('offset');
		} else {
			url.searchParams.set('offset', offset.toString());
		}
		// We don't necessarily need to store device in parent URL, but we could.
		// For now let's just update the iframe.
		window.history.replaceState({}, '', url.toString());

		// Update iframe while preserving current path
		if (iframeEl && iframeEl.contentWindow) {
			try {
				const currentPath = iframeEl.contentWindow.location.pathname;
				const searchParams = new URLSearchParams(iframeEl.contentWindow.location.search);

				if (offset === 0) {
					searchParams.delete('offset');
				} else {
					searchParams.set('offset', offset.toString());
				}
				searchParams.set('device', currentDevice);

				iframeSrc = `${currentPath}?${searchParams.toString()}`;
			} catch (e) {
				// Fallback if access denied
				iframeSrc = `/mobile?offset=${offset}&device=${currentDevice}`;
			}
		} else {
			iframeSrc = `/mobile?offset=${offset}&device=${currentDevice}`;
		}
	}

	function updateOffset(newOffset: number) {
		offset = newOffset;
		updateIframeUrl();
	}

	function toggleAutoPlay() {
		if (isAutoPlaying) {
			stopAutoPlay();
		} else {
			startAutoPlay();
		}
	}

	function startAutoPlay() {
		if (autoPlayInterval) return;
		isAutoPlaying = true;
		autoPlayInterval = setInterval(() => {
			updateOffset(offset + 1);
		}, 1000);
	}

	function stopAutoPlay() {
		if (autoPlayInterval) {
			clearInterval(autoPlayInterval);
			autoPlayInterval = null;
		}
		isAutoPlaying = false;
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
		<div class="flex w-64 flex-col gap-8">
			<div>
				<h1 class="mb-2 text-3xl font-bold text-white">📱 Mobile skin preview</h1>
				<p class="text-slate-400">
					{currentDevice === 'iphone' ? 'iPhone 15' : 'Pixel 8'} mockup • 393×852 viewport
				</p>
			</div>

			<!-- Device controls -->
			<div class="flex flex-col gap-2">
				<span class="text-sm font-medium tracking-wider text-slate-400 uppercase">Device</span>
				<div class="flex gap-2 rounded-lg border border-slate-700 bg-slate-800/50 p-1">
					<button
						class="btn flex-1 btn-sm {currentDevice === 'iphone'
							? 'btn-primary'
							: 'text-slate-300 btn-ghost hover:bg-slate-700'}"
						onclick={() => (currentDevice = 'iphone')}
					>
						🍎 iPhone
					</button>
					<button
						class="btn flex-1 btn-sm {currentDevice === 'pixel'
							? 'btn-primary'
							: 'text-slate-300 btn-ghost hover:bg-slate-700'}"
						onclick={() => (currentDevice = 'pixel')}
					>
						🤖 Pixel
					</button>
				</div>
			</div>

			<!-- Theme controls -->
			<div class="flex flex-col gap-2">
				<span class="text-sm font-medium tracking-wider text-slate-400 uppercase">Appearance</span>
				<div class="flex gap-2 rounded-lg border border-slate-700 bg-slate-800/50 p-1">
					<button
						class="btn flex-1 btn-sm {currentTheme === 'nord'
							? 'btn-primary'
							: 'text-slate-300 btn-ghost hover:bg-slate-700'}"
						onclick={() => {
							currentTheme = 'nord';
							localStorage.setItem('theme', 'nord');
						}}
					>
						☀️ Light
					</button>
					<button
						class="btn flex-1 btn-sm {currentTheme === 'night'
							? 'btn-primary'
							: 'text-slate-300 btn-ghost hover:bg-slate-700'}"
						onclick={() => {
							currentTheme = 'night';
							localStorage.setItem('theme', 'night');
						}}
					>
						🌙 Dark
					</button>
				</div>
			</div>

			<!-- Time Machine Controls -->
			<div class="flex flex-col gap-3">
				<div class="flex items-center justify-between">
					<span class="text-sm font-medium tracking-wider text-slate-400 uppercase"
						>Time Machine</span
					>
					<span
						class="font-mono text-xs font-bold {offset !== 0 ? 'text-primary' : 'text-slate-500'}"
					>
						{offset > 0 ? '+' : ''}{offset} days
					</span>
				</div>

				<div class="grid grid-cols-5 gap-1 rounded-lg border border-slate-700 bg-slate-800/50 p-1">
					<button
						class="btn text-slate-300 btn-ghost btn-xs hover:bg-slate-700 hover:text-white"
						title="-30 Days"
						onclick={() => updateOffset(offset - 30)}
					>
						{'<<'}
					</button>
					<button
						class="btn text-slate-300 btn-ghost btn-xs hover:bg-slate-700 hover:text-white"
						title="-1 Day"
						onclick={() => updateOffset(offset - 1)}
					>
						{'<'}
					</button>
					<button
						class="btn font-bold text-slate-300 btn-ghost btn-xs hover:bg-slate-700 hover:text-white"
						title="Reset to Today"
						onclick={() => updateOffset(0)}
					>
						⟲
					</button>
					<button
						class="btn text-slate-300 btn-ghost btn-xs hover:bg-slate-700 hover:text-white"
						title="+1 Day"
						onclick={() => updateOffset(offset + 1)}
					>
						{'>'}
					</button>
					<button
						class="btn text-slate-300 btn-ghost btn-xs hover:bg-slate-700 hover:text-white"
						title="+30 Days"
						onclick={() => updateOffset(offset + 30)}
					>
						{'>>'}
					</button>
				</div>

				<button
					class="btn w-full btn-sm {isAutoPlaying ? 'btn-error' : 'btn-outline btn-primary'}"
					onclick={toggleAutoPlay}
				>
					{isAutoPlaying ? '⏹ Stop Auto-Play' : '▶️ Auto-Play (1d/s)'}
				</button>

				<div class="px-2 text-center text-xs text-slate-500">
					Simulates future dates by adding an offset to all transactions.
				</div>
			</div>
		</div>

		<!-- iPhone mockup -->
		<div class="device-frame {currentDevice === 'pixel' ? 'pixel-frame' : 'iphone-frame'}">
			<!-- Dynamic Island / Camera -->
			<div class="camera-cutout"></div>

			<!-- Screen content -->
			<iframe
				bind:this={iframeEl}
				src={iframeSrc}
				title="Mobile Preview"
				class="iphone-screen"
				data-theme={currentTheme}
			></iframe>

			<!-- Home indicator -->
			{#if currentDevice === 'iphone'}
				<div class="home-indicator"></div>
			{:else}
				<div class="gesture-line"></div>
			{/if}
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
		overflow: hidden !important;
	}

	.device-frame {
		position: relative;
		width: 433px; /* 393 + 40px for frame */
		height: 892px; /* 852 + 40px for frame */
		background: linear-gradient(145deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%);
		padding: 20px;
		box-shadow:
			0 25px 50px -12px rgba(0, 0, 0, 0.5),
			inset 0 2px 4px rgba(255, 255, 255, 0.1),
			inset 0 -2px 4px rgba(0, 0, 0, 0.2);
		transition: all 0.3s ease;
	}

	.iphone-frame {
		border-radius: 55px;
	}

	.pixel-frame {
		border-radius: 24px;
		/* Pixel is slightly sharper */
	}

	/* iPhone Buttons (Left side) */
	.iphone-frame::before {
		content: '';
		position: absolute;
		top: 115px; /* Volume buttons usually higher on iPhone */
		left: -3px;
		width: 4px;
		height: 26px; /* Mute switch */
		background: #2d2d2d;
		border-radius: 4px 0 0 4px;
		box-shadow:
			0 40px 0 #2d2d2d,
			/* Volume Up */ 0 90px 0 #2d2d2d; /* Volume Down */
	}

	/* iPhone Power Button (Right side) */
	.iphone-frame::after {
		content: '';
		position: absolute;
		top: 180px;
		right: -3px;
		width: 4px;
		height: 90px;
		background: #2d2d2d;
		border-radius: 0 4px 4px 0;
	}

	/* Pixel Buttons (Right side only) */
	.pixel-frame::before {
		content: '';
		position: absolute;
		top: 180px; /* Power button */
		right: -3px;
		width: 4px;
		height: 40px;
		background: #3c3c3c;
		border-radius: 0 4px 4px 0;
	}

	.pixel-frame::after {
		content: '';
		position: absolute;
		top: 240px; /* Volume rocker */
		right: -3px;
		width: 4px;
		height: 80px;
		background: #3c3c3c;
		border-radius: 0 4px 4px 0;
	}

	.camera-cutout {
		position: absolute;
		z-index: 10;
		background: #000;
		transition: all 0.3s ease;
	}

	.iphone-frame .camera-cutout {
		top: 32px;
		left: 50%;
		transform: translateX(-50%);
		width: 120px;
		height: 35px;
		border-radius: 20px; /* Dynamic Island */
	}

	.pixel-frame .camera-cutout {
		top: 36px;
		left: 50%;
		transform: translateX(-50%);
		width: 20px;
		height: 20px;
		border-radius: 50%; /* Hole punch */
	}

	.iphone-screen {
		width: 393px;
		height: 852px;
		border-radius: 40px;
		border: none;
		background: white;
		overflow: hidden;
		transition: border-radius 0.3s ease;
	}

	.pixel-frame .iphone-screen {
		border-radius: 16px;
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

	.gesture-line {
		position: absolute;
		bottom: 28px;
		left: 50%;
		transform: translateX(-50%);
		width: 100px;
		height: 4px;
		background: rgba(255, 255, 255, 0.4);
		border-radius: 2px;
	}
</style>
