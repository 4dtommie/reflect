<script lang="ts">
	interface Props {
		amount: number;
		size?: 'sm' | 'md' | 'lg' | 'xl';
		showSign?: boolean;
		class?: string;
	}

	let { amount, size = 'md', showSign = true, class: className = '' }: Props = $props();

	// Derived state
	const isDebit = $derived(amount < 0);
	const absAmount = $derived(Math.abs(amount));
	const whole = $derived(Math.floor(absAmount).toLocaleString('nl-NL')); // Use locale for thousand separators
	const cents = $derived(
		Math.round((absAmount - Math.floor(absAmount)) * 100)
			.toString()
			.padStart(2, '0')
	);

	// Size configurations
	const sizes = {
		sm: {
			wrap: 'text-sm',
			signMargin: 'mr-0.5 mt-0',
			supMargin: 'ml-[0.5px] mt-[1px]',
			supSize: 'text-[9px]'
		},
		md: {
			wrap: 'text-[19px]', // Increased size
			signMargin: 'mr-1 mt-[1px]',
			supMargin: 'ml-[2px] mt-[4px]', // Adjusted for new size cap height
			supSize: 'text-[13px]' // Scaaled up
		},
		lg: {
			wrap: 'text-lg',
			signMargin: 'mr-1 mt-0.5',
			supMargin: 'ml-[0.5px] mt-[4px]',
			supSize: 'text-[13px]'
		},
		xl: {
			wrap: 'text-2xl',
			signMargin: 'mr-1 mt-1',
			supMargin: 'ml-[1px] mt-[5px]',
			supSize: 'text-sm'
		}
	};

	const s = $derived(sizes[size]);
	const colorClass = $derived(isDebit ? 'text-gray-900' : 'text-green-600');
</script>

<div class="flex items-start font-bold {colorClass} {s.wrap} {className}">
	{#if showSign}
		<span class={s.signMargin}>{isDebit ? '-' : '+'}</span>
	{/if}
	<div class="flex items-start">
		{whole}<span class="{s.supMargin} {s.supSize} leading-none">,{cents}</span>
	</div>
</div>
