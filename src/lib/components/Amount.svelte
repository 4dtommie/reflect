<script lang="ts">
	let {
		value,
		/** 
		 * sm: 16px inline
		 * md: 16px main + 12px superscript decimals
		 * lg: 20px main + 16px superscript decimals
		 */
		size = 'md',
		showDecimals = true,
		isDebit = false,
		hideEuro = false,
		locale = 'NL',
		class: className = ''
	}: {
		value: number;
		size?: 'sm' | 'md' | 'lg';
		showDecimals?: boolean;
		isDebit?: boolean;
		hideEuro?: boolean;
		locale?: string;
		class?: string;
	} = $props();

	// Convert locale shorthand to full locale code
	const localeCode = $derived(locale === 'NL' ? 'nl-NL' : locale);
	const isDutchLocale = $derived(localeCode === 'nl-NL');
	const decimalSeparator = $derived(isDutchLocale ? ',' : '.');

	// Format the amount parts
	const formatted = $derived.by(() => {
		const absValue = Math.abs(value);
		const whole = Math.floor(absValue).toLocaleString(localeCode);
		const cents = Math.round((absValue - Math.floor(absValue)) * 100).toString().padStart(2, '0');
		
		return {
			euro: hideEuro ? '' : '€ ',
			whole,
			decimals: showDecimals ? `${decimalSeparator}${cents}` : ''
		};
	});

	const colorClass = $derived(isDebit ? 'text-base-content' : 'text-success');
</script>

{#if size === 'sm' || !showDecimals}
	<!-- Small size: 16px, all inline -->
	<span class="inline-flex items-baseline font-medium {colorClass} {className}" style="font-size: 16px;">
		{formatted.euro}{formatted.whole}{formatted.decimals}
	</span>
{:else if size === 'md'}
	<!-- Medium size: 16px main + 12px superscript decimals -->
	<span class="inline-flex items-start font-medium {colorClass} {className}">
		<span style="font-size: 16px;">{formatted.euro}{formatted.whole}</span>
		{#if formatted.decimals}
			<span class="ml-[2px] mt-[3px] leading-none" style="font-size: 12px;">{formatted.decimals}</span>
		{/if}
	</span>
{:else}
	<!-- Large size: 20px main + 16px superscript decimals -->
	<span class="inline-flex items-start font-medium {colorClass} {className}">
		<span style="font-size: 20px;">{formatted.euro}{formatted.whole}</span>
		{#if formatted.decimals}
			<span class="ml-[1px] mt-[3px] leading-none" style="font-size: 16px;">{formatted.decimals}</span>
		{/if}
	</span>
{/if}
