<script lang="ts">
	import { mobileThemeName } from '$lib/stores/mobileTheme';

	// Only show for rebrand theme
	const isRebrand = $derived($mobileThemeName === 'rebrand');
</script>

{#if isRebrand}
	<div class="blob-bg-container">
		<svg class="blob-svg" preserveAspectRatio="xMidYMid slice" viewBox="10 0 80 100">
			<path style="fill: #03CA00" class="out-top" d="M37-5C25.1-14.7,5.7-19.1-9.2-10-28.5,1.8-32.7,31.1-19.8,49c15.5,21.5,52.6,22,67.2,2.3C59.4,35,53.7,8.5,37-5Z"/>
			<path style="fill: #fff" class="in-top" d="M20.6,4.1C11.6,1.5-1.9,2.5-8,11.2-16.3,23.1-8.2,45.6,7.4,50S42.1,38.9,41,24.5C40.2,14.1,29.4,6.6,20.6,4.1Z"/>
			<path style="fill: #00C8FF" class="out-bottom" d="M105.9,48.6c-12.4-8.2-29.3-4.8-39.4.8-23.4,12.8-37.7,51.9-19.1,74.1s63.9,15.3,76-5.6c7.6-13.3,1.8-31.1-2.3-43.8C117.6,63.3,114.7,54.3,105.9,48.6Z"/>
			<path style="fill: #fff" class="in-bottom" d="M102,67.1c-9.6-6.1-22-3.1-29.5,2-15.4,10.7-19.6,37.5-7.6,47.8s35.9,3.9,44.5-12.5C115.5,92.6,113.9,74.6,102,67.1Z"/>
		</svg>
		<div class="blob-grain"></div>
	</div>
{/if}

<style>
	.blob-bg-container {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		overflow: hidden;
		pointer-events: none;
		z-index: 0;
		opacity: 0.2;
	}

	.blob-svg {
		position: absolute;
		width: 150%;
		height: 150%;
		top: -25%;
		left: -25%;
		background: #fff;
	}

	.blob-svg .out-top {
		animation: blob-rotate 100s linear infinite;
		transform-origin: 13px 25px;
	}

	.blob-svg .in-top {
		animation: blob-rotate 50s linear infinite;
		transform-origin: 13px 25px;
	}

	.blob-svg .out-bottom {
		animation: blob-rotate 125s linear infinite;
		transform-origin: 84px 93px;
	}

	.blob-svg .in-bottom {
		animation: blob-rotate 75s linear infinite;
		transform-origin: 84px 93px;
	}

	@keyframes blob-rotate {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.blob-grain {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		opacity: 1;
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 111 111' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2' numOctaves='50' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
		filter:saturate(0); 
		background-repeat: repeat;
		background-size: auto;
		pointer-events: none;
	}
</style>
