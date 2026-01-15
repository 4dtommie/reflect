<script lang="ts">
	import ArrowButton from './ArrowButton.svelte';

	interface Props {
		label: string;
		href?: string;
		onclick?: () => void;
		animate?: boolean;
		class?: string;
	}

	let { label, href, onclick, animate = true, class: className = '' }: Props = $props();
</script>

<ArrowButton {label} {href} {onclick} {animate} class={className} />
