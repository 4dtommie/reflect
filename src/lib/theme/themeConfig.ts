/**
 * Theme configuration for mobile design system
 * Supports switching between "NN Original", "Improved Design", and "Extreme" themes
 */

export type ThemeName = 'nn-original' | 'improved' | 'extreme';

export interface ListItemConfig {
	/** 'block' = individual card background, 'flat' = plain white */
	variant: 'block' | 'flat';
	/** Show dividers between items */
	showDividers: boolean;
	/** Rounded corners on items */
	roundedCorners: boolean;
}

export interface ListGroupConfig {
	/** 'card' = wrapped in Card component, 'flat' = no wrapper */
	variant: 'card' | 'flat';
	/** Inner padding */
	padding: string;
}

export interface ProductWidgetConfig {
	/** 'below' = buttons below card, 'integrated' = buttons inside card, 'classic' = NN classic with IBAN + gray action bar */
	actionsPosition: 'below' | 'integrated' | 'classic';
	/** Display style */
	style: 'carousel' | 'list';
}

export interface HeaderConfig {
	/** 'frosted' = blur bg, 'solid' = opaque, 'transparent' = see-through */
	style: 'frosted' | 'solid' | 'transparent';
	/** Custom title for home page (null = use greeting) */
	homeTitle: string | null;
}

export interface ActionButtonConfig {
	/** Button shape */
	shape: 'pill' | 'square';
	/** Button size */
	size: 'sm' | 'md';
}

export interface ThemeConfig {
	name: ThemeName;
	displayName: string;

	// Component variants
	listItem: ListItemConfig;
	listGroup: ListGroupConfig;
	productWidget: ProductWidgetConfig;
	header: HeaderConfig;
	actionButtons: ActionButtonConfig;

	// DaisyUI theme name (defined in tailwind.config.js)
	daisyTheme: 'nn-theme' | 'nn-improved';
}

/**
 * NN Original theme - matches current NN banking app design
 */
export const nnOriginalTheme: ThemeConfig = {
	name: 'nn-original',
	displayName: 'NN Original',

	listItem: {
		variant: 'flat',
		showDividers: false,
		roundedCorners: false
	},

	listGroup: {
		variant: 'card',
		padding: 'p-0'
	},

	productWidget: {
		actionsPosition: 'classic',
		style: 'list'
	},

	header: {
		style: 'frosted',
		homeTitle: 'Home'
	},

	actionButtons: {
		shape: 'pill',
		size: 'md'
	},

	daisyTheme: 'nn-theme'
};

/**
 * Improved design theme - modern, cleaner aesthetic
 */
export const improvedTheme: ThemeConfig = {
	name: 'improved',
	displayName: 'Improved design',

	listItem: {
		variant: 'block',
		showDividers: false,
		roundedCorners: true
	},

	listGroup: {
		variant: 'flat',
		padding: 'p-0'
	},

	productWidget: {
		actionsPosition: 'integrated',
		style: 'carousel'
	},

	header: {
		style: 'solid',
		homeTitle: null
	},

	actionButtons: {
		shape: 'square',
		size: 'sm'
	},

	daisyTheme: 'nn-improved'
};

/**
 * Get theme config by name
 */
export function getThemeConfig(name: ThemeName): ThemeConfig {
	switch (name) {
		case 'improved':
			return improvedTheme;
		case 'extreme':
			// For now, extreme uses improved as a base - can be customized later
			return { ...improvedTheme, name: 'extreme', displayName: 'Extreme' };
		case 'nn-original':
		default:
			return nnOriginalTheme;
	}
}

/**
 * All available themes
 */
export const themes: ThemeConfig[] = [
	nnOriginalTheme,
	improvedTheme,
	{ ...improvedTheme, name: 'extreme', displayName: 'Extreme' } as ThemeConfig
];
