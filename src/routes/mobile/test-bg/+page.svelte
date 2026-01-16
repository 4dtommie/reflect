<script lang="ts">
	// Simple test page for the rotating blobs background
</script>

<div class="test-container">
	<h1>Background test</h1>
	
	<h2>Test 1: Raw SVG (no filters, no blur)</h2>
	<div class="test-box">
		<svg preserveAspectRatio="xMidYMid slice" viewBox="10 10 80 80" width="300" height="300">
			<path fill="#c8c8c8" class="out-top" d="M37-5C25.1-14.7,5.7-19.1-9.2-10-28.5,1.8-32.7,31.1-19.8,49c15.5,21.5,52.6,22,67.2,2.3C59.4,35,53.7,8.5,37-5Z"/>
			<path fill="#e8c4a0" class="in-top" d="M20.6,4.1C11.6,1.5-1.9,2.5-8,11.2-16.3,23.1-8.2,45.6,7.4,50S42.1,38.9,41,24.5C40.2,14.1,29.4,6.6,20.6,4.1Z"/>
			<path fill="#a0a0a0" class="out-bottom" d="M105.9,48.6c-12.4-8.2-29.3-4.8-39.4.8-23.4,12.8-37.7,51.9-19.1,74.1s63.9,15.3,76-5.6c7.6-13.3,1.8-31.1-2.3-43.8C117.6,63.3,114.7,54.3,105.9,48.6Z"/>
			<path fill="#ffffff" class="in-bottom" d="M102,67.1c-9.6-6.1-22-3.1-29.5,2-15.4,10.7-19.6,37.5-7.6,47.8s35.9,3.9,44.5-12.5C115.5,92.6,113.9,74.6,102,67.1Z"/>
		</svg>
	</div>

	<h2>Test 2: With inline styles</h2>
	<div class="test-box">
		<svg preserveAspectRatio="xMidYMid slice" viewBox="10 10 80 80" width="300" height="300">
			<path style="fill: #c8c8c8" d="M37-5C25.1-14.7,5.7-19.1-9.2-10-28.5,1.8-32.7,31.1-19.8,49c15.5,21.5,52.6,22,67.2,2.3C59.4,35,53.7,8.5,37-5Z"/>
			<path style="fill: #e8c4a0" d="M20.6,4.1C11.6,1.5-1.9,2.5-8,11.2-16.3,23.1-8.2,45.6,7.4,50S42.1,38.9,41,24.5C40.2,14.1,29.4,6.6,20.6,4.1Z"/>
			<path style="fill: #a0a0a0" d="M105.9,48.6c-12.4-8.2-29.3-4.8-39.4.8-23.4,12.8-37.7,51.9-19.1,74.1s63.9,15.3,76-5.6c7.6-13.3,1.8-31.1-2.3-43.8C117.6,63.3,114.7,54.3,105.9,48.6Z"/>
			<path style="fill: #ffffff" d="M102,67.1c-9.6-6.1-22-3.1-29.5,2-15.4,10.7-19.6,37.5-7.6,47.8s35.9,3.9,44.5-12.5C115.5,92.6,113.9,74.6,102,67.1Z"/>
		</svg>
	</div>

	<h2>Test 3: With CSS blur filter</h2>
	<div class="test-box">
		<svg preserveAspectRatio="xMidYMid slice" viewBox="10 10 80 80" width="300" height="300" style="filter: blur(20px);">
			<path style="fill: #c8c8c8" d="M37-5C25.1-14.7,5.7-19.1-9.2-10-28.5,1.8-32.7,31.1-19.8,49c15.5,21.5,52.6,22,67.2,2.3C59.4,35,53.7,8.5,37-5Z"/>
			<path style="fill: #e8c4a0" d="M20.6,4.1C11.6,1.5-1.9,2.5-8,11.2-16.3,23.1-8.2,45.6,7.4,50S42.1,38.9,41,24.5C40.2,14.1,29.4,6.6,20.6,4.1Z"/>
			<path style="fill: #a0a0a0" d="M105.9,48.6c-12.4-8.2-29.3-4.8-39.4.8-23.4,12.8-37.7,51.9-19.1,74.1s63.9,15.3,76-5.6c7.6-13.3,1.8-31.1-2.3-43.8C117.6,63.3,114.7,54.3,105.9,48.6Z"/>
			<path style="fill: #ffffff" d="M102,67.1c-9.6-6.1-22-3.1-29.5,2-15.4,10.7-19.6,37.5-7.6,47.8s35.9,3.9,44.5-12.5C115.5,92.6,113.9,74.6,102,67.1Z"/>
		</svg>
	</div>

	<h2>Test 4: With animations</h2>
	<div class="test-box animated-box">
		<svg preserveAspectRatio="xMidYMid slice" viewBox="10 10 80 80" width="300" height="300" style="filter: blur(30px); opacity: 0.5;">
			<path style="fill: #c8c8c8" class="rotate-1" d="M37-5C25.1-14.7,5.7-19.1-9.2-10-28.5,1.8-32.7,31.1-19.8,49c15.5,21.5,52.6,22,67.2,2.3C59.4,35,53.7,8.5,37-5Z"/>
			<path style="fill: #e8c4a0" class="rotate-2" d="M20.6,4.1C11.6,1.5-1.9,2.5-8,11.2-16.3,23.1-8.2,45.6,7.4,50S42.1,38.9,41,24.5C40.2,14.1,29.4,6.6,20.6,4.1Z"/>
			<path style="fill: #a0a0a0" class="rotate-3" d="M105.9,48.6c-12.4-8.2-29.3-4.8-39.4.8-23.4,12.8-37.7,51.9-19.1,74.1s63.9,15.3,76-5.6c7.6-13.3,1.8-31.1-2.3-43.8C117.6,63.3,114.7,54.3,105.9,48.6Z"/>
			<path style="fill: #ffffff" class="rotate-4" d="M102,67.1c-9.6-6.1-22-3.1-29.5,2-15.4,10.7-19.6,37.5-7.6,47.8s35.9,3.9,44.5-12.5C115.5,92.6,113.9,74.6,102,67.1Z"/>
		</svg>
	</div>

	<h2>Test 5: Full implementation</h2>
	<div class="test-box full-impl">
		<div class="blob-bg-container">
			<svg class="blob-svg" preserveAspectRatio="xMidYMid slice" viewBox="10 10 80 80">
				<path style="fill: #c8c8c8" class="out-top" d="M37-5C25.1-14.7,5.7-19.1-9.2-10-28.5,1.8-32.7,31.1-19.8,49c15.5,21.5,52.6,22,67.2,2.3C59.4,35,53.7,8.5,37-5Z"/>
				<path style="fill: #e8c4a0" class="in-top" d="M20.6,4.1C11.6,1.5-1.9,2.5-8,11.2-16.3,23.1-8.2,45.6,7.4,50S42.1,38.9,41,24.5C40.2,14.1,29.4,6.6,20.6,4.1Z"/>
				<path style="fill: #a0a0a0" class="out-bottom" d="M105.9,48.6c-12.4-8.2-29.3-4.8-39.4.8-23.4,12.8-37.7,51.9-19.1,74.1s63.9,15.3,76-5.6c7.6-13.3,1.8-31.1-2.3-43.8C117.6,63.3,114.7,54.3,105.9,48.6Z"/>
				<path style="fill: #ffffff" class="in-bottom" d="M102,67.1c-9.6-6.1-22-3.1-29.5,2-15.4,10.7-19.6,37.5-7.6,47.8s35.9,3.9,44.5-12.5C115.5,92.6,113.9,74.6,102,67.1Z"/>
			</svg>
			<div class="blob-grain"></div>
		</div>
		<p style="position: relative; z-index: 1; padding: 20px;">Content on top</p>
	</div>
</div>

<style>
	.test-container {
		padding: 20px;
		background: #faf9f8;
		min-height: 100vh;
	}

	h1, h2 {
		color: #333;
		margin-top: 30px;
	}

	.test-box {
		background: #f3efed;
		border: 1px solid #ddd;
		padding: 20px;
		margin: 10px 0;
		overflow: hidden;
	}

	/* Test 4: Animation classes */
	.rotate-1 {
		animation: rotate 20s linear infinite;
		transform-origin: 13px 25px;
	}
	.rotate-2 {
		animation: rotate 10s linear infinite;
		transform-origin: 13px 25px;
	}
	.rotate-3 {
		animation: rotate 25s linear infinite;
		transform-origin: 84px 93px;
	}
	.rotate-4 {
		animation: rotate 15s linear infinite;
		transform-origin: 84px 93px;
	}

	@keyframes rotate {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	/* Test 5: Full implementation */
	.full-impl {
		position: relative;
		height: 400px;
	}

	.full-impl .blob-bg-container {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		overflow: hidden;
		pointer-events: none;
	}

	.full-impl .blob-svg {
		position: absolute;
		width: 150%;
		height: 150%;
		top: -25%;
		left: -25%;
		opacity: 0.4;
		filter: blur(40px);
	}

	.full-impl .blob-svg .out-top {
		animation: rotate 20s linear infinite;
		transform-origin: 13px 25px;
	}

	.full-impl .blob-svg .in-top {
		animation: rotate 10s linear infinite;
		transform-origin: 13px 25px;
	}

	.full-impl .blob-svg .out-bottom {
		animation: rotate 25s linear infinite;
		transform-origin: 84px 93px;
	}

	.full-impl .blob-svg .in-bottom {
		animation: rotate 15s linear infinite;
		transform-origin: 84px 93px;
	}

	.full-impl .blob-grain {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		opacity: 0.12;
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
		background-repeat: repeat;
		background-size: 180px 180px;
	}
</style>
