<script lang="ts">
	let {
		value,
		size = 'medium',
		showDecimals = true,
		isDebit = false
	}: {
		value: number;
		size?: 'small' | 'medium' | 'large';
		showDecimals?: boolean;
		isDebit?: boolean;
	} = $props();

	// Format the amount parts
	const formatted = $derived.by(() => {
		if (showDecimals) {
			const formatted = new Intl.NumberFormat('en-US', {
				style: 'currency',
				currency: 'EUR',
				minimumFractionDigits: 2,
				maximumFractionDigits: 2
			}).format(Math.abs(value));

			// Add space after euro sign and split into main part and decimals
			const withSpace = formatted.replace('€', '€ ');
			const parts = withSpace.split('.');
			return {
				main: parts[0],
				decimals: parts[1] ? `.${parts[1]}` : ''
			};
		} else {
			const formatted = new Intl.NumberFormat('en-US', {
				style: 'currency',
				currency: 'EUR',
				minimumFractionDigits: 0,
				maximumFractionDigits: 0
			}).format(Math.abs(value));

			// Add space after euro sign
			const withSpace = formatted.replace('€', '€ ');

			return {
				main: withSpace,
				decimals: ''
			};
		}
	});

	const colorClass = $derived(isDebit ? 'text-base-content' : 'text-success');

	const sizeClasses = {
		small: {
			main: 'text-sm',
			decimals: 'text-xs'
		},
		medium: {
			main: 'text-base',
			decimals: 'text-xs'
		},
		large: {
			main: 'text-2xl',
			decimals: 'text-xs'
		}
	};
</script>

{#if size === 'large' && showDecimals && formatted.decimals}
	<!-- Large version with decimals aligned at top -->
	<span class="inline-flex items-start gap-0.5 {colorClass}">
		<span class="font-medium {sizeClasses[size].main}">{formatted.main}</span>
		<span class="font-normal {sizeClasses[size].decimals} leading-none pt-0.5">{formatted.decimals}</span>
	</span>
{:else}
	<!-- Small/Medium version or without decimals -->
	<span class="font-medium {sizeClasses[size].main} {colorClass}">
		{formatted.main}{formatted.decimals}
	</span>
{/if}

