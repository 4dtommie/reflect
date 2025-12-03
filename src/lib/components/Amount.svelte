<script lang="ts">
	let {
		value,
		size = 'medium',
		showDecimals = true,
		isDebit = false,
		hideEuro = false,
		locale = 'NL' // Default to Dutch locale
	}: {
		value: number;
		size?: 'small' | 'medium' | 'large';
		showDecimals?: boolean;
		isDebit?: boolean;
		hideEuro?: boolean;
		locale?: string;
	} = $props();

	// Convert locale shorthand to full locale code
	const localeCode = $derived(locale === 'NL' ? 'nl-NL' : locale);

	// Format the amount parts
	const formatted = $derived.by(() => {
		const isDutchLocale = localeCode === 'nl-NL';
		const decimalSeparator = isDutchLocale ? ',' : '.';
		
		if (hideEuro) {
			// Format without currency symbol
			if (showDecimals) {
				const formatted = new Intl.NumberFormat(localeCode, {
					minimumFractionDigits: 2,
					maximumFractionDigits: 2
				}).format(Math.abs(value));
				const parts = formatted.split(decimalSeparator);
				return {
					main: parts[0],
					decimals: parts[1] ? `${decimalSeparator}${parts[1]}` : ''
				};
			} else {
				const formatted = new Intl.NumberFormat(localeCode, {
					minimumFractionDigits: 0,
					maximumFractionDigits: 0
				}).format(Math.abs(value));
				return {
					main: formatted,
					decimals: ''
				};
			}
		} else {
			// Format with currency symbol
			if (showDecimals) {
				const formatted = new Intl.NumberFormat(localeCode, {
					style: 'currency',
					currency: 'EUR',
					minimumFractionDigits: 2,
					maximumFractionDigits: 2
				}).format(Math.abs(value));

				// Handle euro sign placement and split into main part and decimals
				// Dutch format: "€ 1.234,56" or "1.234,56 €"
				// English format: "€1,234.56" or "$1,234.56"
				let withSpace = formatted;
				if (isDutchLocale) {
					// Dutch: ensure space after euro sign if not already present
					withSpace = formatted.replace(/€(\d)/, '€ $1').replace(/€\s*(\d)/, '€ $1');
				} else {
					// English: add space after euro sign
					withSpace = formatted.replace('€', '€ ');
				}
				
				const parts = withSpace.split(decimalSeparator);
				return {
					main: parts[0],
					decimals: parts[1] ? `${decimalSeparator}${parts[1]}` : ''
				};
			} else {
				const formatted = new Intl.NumberFormat(localeCode, {
					style: 'currency',
					currency: 'EUR',
					minimumFractionDigits: 0,
					maximumFractionDigits: 0
				}).format(Math.abs(value));

				// Handle euro sign placement
				let withSpace = formatted;
				if (isDutchLocale) {
					withSpace = formatted.replace(/€(\d)/, '€ $1').replace(/€\s*(\d)/, '€ $1');
				} else {
					withSpace = formatted.replace('€', '€ ');
				}

				return {
					main: withSpace,
					decimals: ''
				};
			}
		}
	});

	const colorClass = $derived(isDebit ? 'text-base-content' : 'text-success');

	const sizeClasses = {
		small: {
			main: 'text-sm',
			decimals: 'text-sm'
		},
		medium: {
			main: 'text-base',
			decimals: 'text-base'
		},
		large: {
			main: 'text-2xl',
			decimals: 'text-2xl'
		}
	};
</script>

{#if size === 'large' && showDecimals && formatted.decimals}
	<!-- Large version with decimals aligned at top -->
	<span class="inline-flex items-baseline gap-0.5 {colorClass}">
		<span class="font-medium {sizeClasses[size].main}">{formatted.main}</span>
		<span class="font-medium {sizeClasses[size].decimals}">{formatted.decimals}</span>
	</span>
{:else}
	<!-- Small/Medium version or without decimals -->
	<span class="font-medium {sizeClasses[size].main} {colorClass}">
		{formatted.main}{formatted.decimals}
	</span>
{/if}

