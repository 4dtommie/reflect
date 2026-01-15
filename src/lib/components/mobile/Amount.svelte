<script lang="ts">
	interface Props {
		amount: number;
		size?: 'sm' | 'md' | 'lg' | 'small' | 'large' | 'xl';
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

	// Normalize size aliases to logical sizes and size configurations using semantic Tailwind sizes
	const sizes = {
		sm: {
			wrap: 'text-sm',
			signMargin: 'mr-0.5',
			supMargin: '',
			supSize: '!text-xs'
		},
		md: {
			wrap: 'text-base',
			signMargin: 'mr-0.5',
			supMargin: 'ml-[2px] mt-[3px]',
			supSize: '!text-xs'
		},
		lg: {
			wrap: 'text-xl',
			signMargin: 'mr-0.5',
			supMargin: 'ml-[1px] mt-[3px]',
			supSize: '!text-sm'
		}
	};

	// Compute `s` directly so classes are plain strings in the DOM
	const s = (() => {
		const norm = size === 'small' || size === 'sm' ? 'sm' : size === 'large' || size === 'xl' ? 'lg' : 'md';
		return sizes[norm];
	})();
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
			{whole}
			<span class="{s.supMargin} {s.supSize} leading-none" style="font-size: {s.supSize === '!text-xs' || s.supSize === 'text-xs' ? '12px' : s.supSize === '!text-sm' || s.supSize === 'text-sm' ? '14px' : '12px'}">,{cents}</span>
		</div>
	{/if}
</div>
