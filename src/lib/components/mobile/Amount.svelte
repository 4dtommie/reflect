<script lang="ts">
	interface Props {
		amount: number;
		size?: 'sm' | 'md' | 'lg' | 'xl';
		showSign?: boolean;
		showSymbol?: boolean;
		flat?: boolean;
		class?: string;
	}

	let {
		amount,
		size = 'md',
		showSign = true,
		showSymbol = false,
		flat = false,
		class: className = ''
	}: Props = $props();

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
			signMargin: 'mr-0.5',
			supMargin: '',
			supSize: 'text-sm'
		},
		md: {
			wrap: 'text-[19px]', // Increased size
			signMargin: 'mr-0.5',
			supMargin: 'ml-[2px] mt-[3px]', // Slightly increased (was 1px)
			supSize: 'text-sm' // Standardized to 14px
		},
		lg: {
			wrap: 'text-lg',
			signMargin: 'mr-0.5',
			supMargin: 'ml-[0.5px] mt-[2px]', // Slightly increased (was 1px)
			supSize: 'text-[13px]'
		},
		xl: {
			wrap: 'text-2xl',
			signMargin: 'mr-0.5',
			supMargin: 'ml-[1px] mt-[3px]', // Slightly increased (was 2px)
			supSize: 'text-sm'
		}
	};

	const s = $derived(sizes[size]);
	// Only apply color when showing sign (for transactions), otherwise inherit from parent
	const colorClass = $derived(showSign ? (isDebit ? 'text-gray-1000' : 'text-green-600') : '');
</script>

<div class="inline-flex items-baseline font-bold {colorClass} {s.wrap} {className}">
	{#if showSymbol}
		<span class="mr-1">€</span>
	{/if}
	{#if showSign}
		<span class={s.signMargin}>{isDebit ? '-' : '+'}</span>
	{/if}
	{#if flat}
		<span>{whole},{cents}</span>
	{:else}
		<div class="flex {size === 'sm' ? 'items-baseline' : 'items-start'}">
			{whole}<span class="{s.supMargin} {s.supSize} leading-none">,{cents}</span>
		</div>
	{/if}
</div>
