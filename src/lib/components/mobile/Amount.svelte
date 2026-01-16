<script lang="ts">
	interface Props {
		amount: number;
		/** 
		 * sm: 16px inline (no superscript decimals)
		 * md: 16px main + 12px superscript decimals (for transaction lists)
		 * lg: 20px main + 16px superscript decimals (for product cards)
		 * huge: 24px main + 18px superscript decimals (for product detail headers)
		 */
		size?: 'sm' | 'md' | 'lg' | 'huge';
		showSign?: boolean;
		showSymbol?: boolean;
		class?: string;
	}

	let {
		amount,
		size = 'md',
		showSign = true,
		showSymbol = false,
		class: className = ''
	}: Props = $props();

	// Derived state
	const isDebit = $derived(amount < 0);
	const absAmount = $derived(Math.abs(amount));
	const whole = $derived(Math.floor(absAmount).toLocaleString('nl-NL'));
	const cents = $derived(
		Math.round((absAmount - Math.floor(absAmount)) * 100)
			.toString()
			.padStart(2, '0')
	);

	// Only apply color when showing sign (for transactions), otherwise inherit from parent
	const colorClass = $derived(showSign ? (isDebit ? 'text-gray-1000' : 'text-green-600') : '');
</script>

<div class="inline-flex items-baseline font-bold {colorClass} {className}">
	{#if showSymbol}
		{#if size === 'sm' || size === 'md'}
			<span class="mr-1" style="font-size:16px; line-height:1">€</span>
		{:else if size === 'lg'}
			<span class="mr-1" style="font-size:20px; line-height:1">€</span>
		{:else}
			<span class="mr-1" style="font-size:32px; line-height:1">€</span>
		{/if}
	{/if}
	{#if showSign}
		<span class="mr-0.5">{isDebit ? '-' : '+'}</span>
	{/if}
	
	{#if size === 'sm'}
		<!-- Small size: 16px, all inline -->
		<span style="font-size: 16px;">{whole},{cents}</span>
	{:else if size === 'md'}
		<!-- Medium size: 16px main + 12px superscript decimals -->
		<div class="flex items-start">
			<span style="font-size: 16px;">{whole}</span>
			<span class="ml-[2px] mt-[3px] leading-none" style="font-size: 12px;">,{cents}</span>
		</div>
	{:else if size === 'lg'}
		<!-- Large size: 20px main + 16px superscript decimals -->
		<div class="flex items-start">
			<span style="font-size: 20px;">{whole}</span>
			<span class="ml-[1px] mt-[3px] leading-none" style="font-size: 16px;">,{cents}</span>
		</div>
	{:else}
		<!-- Huge size: 32px main + 20px superscript decimals (adjusted) -->
		<div class="flex items-start">
			<span style="font-size: 32px; line-height:1">{whole}</span>
			<span class="ml-[1px] leading-none" style="font-size: 16px; line-height:1; align-self:flex-start">,{cents}</span>
		</div>
	{/if}
</div>
