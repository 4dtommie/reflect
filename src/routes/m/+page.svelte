<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import {
		Sun,
		Moon,
		Monitor,
		Smartphone,
		Play,
		Square,
		RotateCcw,
		ChevronLeft,
		ChevronRight,
		ChevronsLeft,
		ChevronsRight,
		Apple,
		ArrowRight,
		RotateCw
	} from 'lucide-svelte';
	import { toggleProductEnabledAndRefresh, resetProducts, productsStore } from '$lib/mock/products';
	import { themes, type ThemeName } from '$lib/theme/themeConfig';

	// Handle current theme (light/dark)
	let currentTheme = $state<'nord' | 'nn-night'>('nord');
	let currentDevice = $state<'iphone' | 'pixel'>('iphone');
	let currentOrientation = $state<'portrait' | 'landscape'>('portrait');
	let productLayout = $state<'default' | 'A' | 'B' | 'C'>('default');
	// Design theme (component styling)
	let designTheme = $state<ThemeName>('nn-original');

	// Handle time offset
	let offset = $state(0);
	let autoPlayInterval: NodeJS.Timeout | null = null;
	let isAutoPlaying = $state(false);

	// Iframe state
	let iframeEl: HTMLIFrameElement | undefined = $state();
	let iframeSrc = $state('/mobile');

	// Transition state for orientation change
	let isTransitioning = $state(false);

	onMount(() => {
		const storedTheme = localStorage.getItem('theme') as 'nord' | 'nn-night' | null;
		if (storedTheme) {
			currentTheme = storedTheme;
		} else if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
			currentTheme = 'nn-night';
		}

		// Initialize productLayout from localStorage
		const storedProductLayout = localStorage.getItem('productLayout') as 'default' | 'A' | 'B' | 'C';
		if (storedProductLayout) {
			productLayout = storedProductLayout;
		}

		// Initialize designTheme from localStorage
		const storedDesignTheme = localStorage.getItem('designTheme') as ThemeName;
		if (storedDesignTheme) {
			designTheme = storedDesignTheme;
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
		currentTheme = currentTheme === 'nord' ? 'nn-night' : 'nord';
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

		// Build the query params
		const searchParams = new URLSearchParams();
		if (offset !== 0) {
			searchParams.set('offset', offset.toString());
		}
		searchParams.set('device', currentDevice);
		searchParams.set('theme', currentTheme);
		searchParams.set('layout', productLayout);
		searchParams.set('designTheme', designTheme);

		// Try to preserve current path within /mobile, otherwise default to /mobile
		let basePath = '/mobile';
		if (iframeEl && iframeEl.contentWindow) {
			try {
				const currentPath = iframeEl.contentWindow.location.pathname;
				// Only use currentPath if it's within /mobile
				if (currentPath.startsWith('/mobile')) {
					basePath = currentPath;
				}
			} catch (e) {
				// Access denied, use default
			}
		}

		iframeSrc = `${basePath}?${searchParams.toString()}`;
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

	function setOrientation(newOrientation: 'portrait' | 'landscape') {
		if (newOrientation === currentOrientation) return;

		// Flash transition: fade out, change, fade in
		isTransitioning = true;
		setTimeout(() => {
			currentOrientation = newOrientation;
			setTimeout(() => {
				isTransitioning = false;
			}, 50); // Small delay before fading back in
		}, 150); // Duration of fade out
	}
</script>

<svelte:head>
	<title>Mobile Preview | Reflect</title>
</svelte:head>

<div
	class="preview-container flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
	class:landscape-mode={currentOrientation === 'landscape'}
>
	<div class="main-layout">
		<!-- Sidebar with controls (becomes bottom bar in landscape) -->
		<div class="controls-panel">
			<div class="controls-header">
				<h1 class="text-2xl font-bold text-white">📱 Live prototype</h1>
			</div>

			<div class="controls-grid">
				<!-- Top row: Device, Orientation, Appearance, Widget Style -->
				<div class="flex items-center gap-2">
					<!-- Device -->
					<div class="flex flex-1 rounded-lg bg-slate-800 p-1">
						<button
							class="flex flex-1 items-center justify-center rounded-md py-1.5 transition-colors {currentDevice ===
							'iphone'
								? 'bg-slate-600 text-white shadow-sm'
								: 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'}"
							onclick={() => (currentDevice = 'iphone')}
							title="iPhone (Apple)"
						>
							<Apple size={16} />
						</button>
						<button
							class="flex flex-1 items-center justify-center rounded-md py-1.5 transition-colors {currentDevice ===
							'pixel'
								? 'bg-slate-600 text-white shadow-sm'
								: 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'}"
							onclick={() => (currentDevice = 'pixel')}
							title="Pixel (Android)"
						>
							<Smartphone size={16} />
						</button>
					</div>

					<!-- Orientation Toggle (Target Preview) -->
					<button
						class="flex h-9 w-auto items-center justify-center gap-1.5 rounded-lg bg-slate-800 px-2 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-slate-200"
						onclick={() =>
							setOrientation(currentOrientation === 'portrait' ? 'landscape' : 'portrait')}
						title={currentOrientation === 'portrait' ? 'Switch to Landscape' : 'Switch to Portrait'}
					>
						<ArrowRight size={12} class="opacity-50" />
						{#if currentOrientation === 'portrait'}
							<Smartphone size={18} class="rotate-90" />
						{:else}
							<Smartphone size={18} />
						{/if}
					</button>

					<!-- Appearance Switch -->
					<button
						class="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 transition-colors {currentTheme ===
						'nn-night'
							? 'bg-slate-600 text-white'
							: 'bg-slate-800 text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'}"
						onclick={toggleTheme}
						title={currentTheme === 'nord' ? 'Switch to Dark' : 'Switch to Light'}
					>
						{#if currentTheme === 'nord'}
							<Sun size={18} />
						{:else}
							<Moon size={18} />
						{/if}
					</button>

	
				</div>

				<!-- Design Theme Row -->
				<div class="flex items-center gap-2">
					<select
						class="select-bordered select h-9 w-full border-none bg-slate-800 select-sm text-slate-200 focus:ring-0"
						bind:value={designTheme}
						onchange={() => {
							localStorage.setItem('designTheme', designTheme);
							updateIframeUrl();
						}}
					>
						{#each themes as theme}
							<option value={theme.name}>{theme.displayName}</option>
						{/each}
					</select>
				</div>

				<!-- Product Layout Row -->
				<div class="flex items-center gap-2">
					<select
						class="select-bordered select h-9 w-full border-none bg-slate-800 select-sm text-slate-200 focus:ring-0"
						bind:value={productLayout}
						onchange={() => {
							localStorage.setItem('productLayout', productLayout);
							updateIframeUrl();
						}}
					>
						<option value="default">Pick product layout</option>
						<option value="A">Product carousel</option>
						<option value="B">Separate product pages</option>
						<option value="C">Product slidedown</option>
					</select>
				</div>

				<!-- Products toggles for prototype -->
				<div class="control-group">
					<div class="flex items-center justify-between">
						<div class="control-label">Products</div>
						<button
							class="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
							onclick={() => { resetProducts(); updateIframeUrl(); }}
							title="Reset to defaults"
						>
							<RotateCw size={12} />
							Reset
						</button>
					</div>
					<div class="mt-2 flex flex-col gap-2">
						{#each $productsStore as p (p.id)}
							<label class="flex items-center gap-2">
								<input
									type="checkbox"
									checked={p.enabled !== false}
									onchange={(e) => {
										const target = e.target as HTMLInputElement;
										toggleProductEnabledAndRefresh(p.id, target.checked);
										updateIframeUrl();
									}}
								/>
								<span class="text-sm text-slate-200">{p.name}</span>
							</label>
						{/each}
					</div>
				</div>

				<!-- Time Machine Row (Horizontal) -->
				<div class="control-group time-machine">
					<div
						class="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/50 p-1"
					>
						<div class="flex flex-1 gap-0.5">
							<button
								class="flex h-7 flex-1 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
								title="-30 Days"
								onclick={() => updateOffset(offset - 30)}
							>
								<ChevronsLeft size={14} />
							</button>
							<button
								class="flex h-7 flex-1 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
								title="-1 Day"
								onclick={() => updateOffset(offset - 1)}
							>
								<ChevronLeft size={14} />
							</button>
							<button
								class="flex h-7 flex-1 items-center justify-center rounded-md font-bold text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
								title="Reset to Today"
								onclick={() => updateOffset(0)}
							>
								<RotateCcw size={14} />
							</button>
							<button
								class="flex h-7 flex-1 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
								title="+1 Day"
								onclick={() => updateOffset(offset + 1)}
							>
								<ChevronRight size={14} />
							</button>
							<button
								class="flex h-7 flex-1 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
								title="+30 Days"
								onclick={() => updateOffset(offset + 30)}
							>
								<ChevronsRight size={14} />
							</button>
						</div>

						<div class="flex items-center gap-2 border-l border-slate-700 px-2">
							<span
								class="font-mono text-[10px] font-bold whitespace-nowrap {offset !== 0
									? 'text-primary'
									: 'text-slate-500'}"
							>
								{offset > 0 ? '+' : ''}{offset}d
							</span>
							<button
								class="flex h-7 w-7 items-center justify-center rounded-md transition-all {isAutoPlaying
									? 'bg-red-500 text-white'
									: 'bg-slate-700 text-slate-300 hover:bg-slate-600'}"
								onclick={toggleAutoPlay}
								title={isAutoPlaying ? 'Stop Auto-Play' : 'Start Auto-Play (1d/s)'}
							>
								{#if isAutoPlaying}
									<Square size={12} fill="currentColor" />
								{:else}
									<Play size={12} fill="currentColor" class="translate-x-0.5" />
								{/if}
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Phone mockup -->
		<div
			class="device-frame {currentDevice === 'pixel' ? 'pixel-frame' : 'iphone-frame'}"
			class:landscape={currentOrientation === 'landscape'}
			class:transitioning={isTransitioning}
		>
			<!-- Dynamic Island / Camera -->
			<div class="camera-cutout"></div>

			<!-- Screen content -->
			<iframe
				bind:this={iframeEl}
				src={iframeSrc}
				title="Mobile Preview"
				class="phone-screen"
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
		max-width: none !important;
	}

	.preview-container {
		padding: 2rem;
	}

	.main-layout {
		display: flex;
		align-items: center;
		gap: 4rem;
	}

	.controls-panel {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		width: 16rem;
	}

	.controls-header {
		margin-bottom: 0.5rem;
	}

	.controls-grid {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.control-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.control-label {
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: rgb(148, 163, 184);
	}

	.time-machine {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	/* Landscape mode - controls at bottom */
	.landscape-mode .main-layout {
		flex-direction: column;
		gap: 2rem;
	}

	.landscape-mode .controls-panel {
		width: auto;
		flex-direction: row;
		align-items: center;
		gap: 2rem;
	}

	.landscape-mode .controls-header {
		display: none;
	}

	.landscape-mode .controls-grid {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 1.5rem;
	}

	.landscape-mode .control-group {
		min-width: 140px;
	}

	.landscape-mode .time-machine {
		min-width: 200px;
	}

	/* Flash transition for orientation change */
	.device-frame.transitioning {
		opacity: 0;
		transform: scale(0.98);
	}

	/* Device frame - Portrait mode */
	.device-frame {
		position: relative;
		width: 433px;
		height: 892px;
		background: linear-gradient(145deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%);
		padding: 20px;
		box-shadow:
			0 25px 50px -12px rgba(0, 0, 0, 0.5),
			inset 0 2px 4px rgba(255, 255, 255, 0.1),
			inset 0 -2px 4px rgba(0, 0, 0, 0.2);
		transition:
			opacity 0.15s ease-out,
			transform 0.15s ease-out;
	}

	/* Device frame - Landscape mode */
	.device-frame.landscape {
		width: 892px;
		height: 433px;
	}

	.iphone-frame {
		border-radius: 55px;
	}

	.iphone-frame.landscape {
		border-radius: 55px;
	}

	.pixel-frame {
		border-radius: 24px;
	}

	/* iPhone Buttons - Portrait */
	.iphone-frame::before {
		content: '';
		position: absolute;
		top: 115px;
		left: -3px;
		width: 4px;
		height: 26px;
		background: #2d2d2d;
		border-radius: 4px 0 0 4px;
		box-shadow:
			0 40px 0 #2d2d2d,
			0 90px 0 #2d2d2d;
		transition: all 0.3s ease;
	}

	/* iPhone Buttons - Landscape (move to top) */
	.iphone-frame.landscape::before {
		top: -3px;
		left: 115px;
		width: 26px;
		height: 4px;
		border-radius: 4px 4px 0 0;
		box-shadow:
			40px 0 0 #2d2d2d,
			90px 0 0 #2d2d2d;
	}

	/* iPhone Power Button - Portrait */
	.iphone-frame::after {
		content: '';
		position: absolute;
		top: 180px;
		right: -3px;
		width: 4px;
		height: 90px;
		background: #2d2d2d;
		border-radius: 0 4px 4px 0;
		transition: all 0.3s ease;
	}

	/* iPhone Power Button - Landscape (move to bottom) */
	.iphone-frame.landscape::after {
		top: auto;
		bottom: -3px;
		right: 180px;
		width: 90px;
		height: 4px;
		border-radius: 0 0 4px 4px;
	}

	/* Pixel Buttons - Portrait */
	.pixel-frame::before {
		content: '';
		position: absolute;
		top: 180px;
		right: -3px;
		width: 4px;
		height: 40px;
		background: #3c3c3c;
		border-radius: 0 4px 4px 0;
		transition: all 0.3s ease;
	}

	.pixel-frame.landscape::before {
		top: auto;
		bottom: -3px;
		right: 180px;
		width: 40px;
		height: 4px;
		border-radius: 0 0 4px 4px;
	}

	.pixel-frame::after {
		content: '';
		position: absolute;
		top: 240px;
		right: -3px;
		width: 4px;
		height: 80px;
		background: #3c3c3c;
		border-radius: 0 4px 4px 0;
		transition: all 0.3s ease;
	}

	.pixel-frame.landscape::after {
		top: auto;
		bottom: -3px;
		right: 240px;
		width: 80px;
		height: 4px;
		border-radius: 0 0 4px 4px;
	}

	/* Camera cutout */
	.camera-cutout {
		position: absolute;
		z-index: 10;
		background: #000;
		transition: all 0.3s ease;
	}

	/* iPhone Dynamic Island - Portrait */
	.iphone-frame .camera-cutout {
		top: 32px;
		left: 50%;
		transform: translateX(-50%);
		width: 120px;
		height: 35px;
		border-radius: 20px;
	}

	/* iPhone Dynamic Island - Landscape (move to left) */
	.iphone-frame.landscape .camera-cutout {
		top: 50%;
		left: 32px;
		transform: translateY(-50%);
		width: 35px;
		height: 120px;
	}

	/* Pixel camera - Portrait */
	.pixel-frame .camera-cutout {
		top: 36px;
		left: 50%;
		transform: translateX(-50%);
		width: 20px;
		height: 20px;
		border-radius: 50%;
	}

	/* Pixel camera - Landscape (move to left) */
	.pixel-frame.landscape .camera-cutout {
		top: 50%;
		left: 36px;
		transform: translateY(-50%);
	}

	/* Screen - Portrait */
	.phone-screen {
		width: 393px;
		height: 852px;
		border-radius: 40px;
		border: none;
		background: transparent;
		overflow: hidden;
		transition: all 0.3s ease;
	}

	/* Screen - Landscape */
	.device-frame.landscape .phone-screen {
		width: 852px;
		height: 393px;
	}

	.pixel-frame .phone-screen {
		border-radius: 16px;
	}

	/* Home indicator - Portrait */
	.home-indicator {
		position: absolute;
		bottom: 28px;
		left: 50%;
		transform: translateX(-50%);
		width: 140px;
		height: 5px;
		background: rgba(255, 255, 255, 0.3);
		border-radius: 3px;
		transition: all 0.3s ease;
	}

	/* Home indicator - Landscape (move to right) */
	.device-frame.landscape .home-indicator {
		bottom: auto;
		left: auto;
		right: 28px;
		top: 50%;
		transform: translateY(-50%);
		width: 5px;
		height: 140px;
	}

	/* Gesture line - Portrait */
	.gesture-line {
		position: absolute;
		bottom: 28px;
		left: 50%;
		transform: translateX(-50%);
		width: 100px;
		height: 4px;
		background: rgba(255, 255, 255, 0.4);
		border-radius: 2px;
		transition: all 0.3s ease;
	}

	/* Gesture line - Landscape (move to right) */
	.device-frame.landscape .gesture-line {
		bottom: auto;
		left: auto;
		right: 28px;
		top: 50%;
		transform: translateY(-50%);
		width: 4px;
		height: 100px;
	}
</style>
