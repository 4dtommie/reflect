import { writable } from 'svelte/store';

/**
 * Theme name type - 'nn-original' or 'improved'
 */
export type ThemeName = 'nn-original' | 'improved';

/**
 * Current design theme name
 */
export const mobileThemeName = writable<ThemeName>('nn-original');

/**
 * Helper to set theme from URL parameter
 */
export function setThemeFromUrl(searchParams: URLSearchParams): void {
	const designTheme = searchParams.get('designTheme') as ThemeName | null;
	if (designTheme === 'nn-original' || designTheme === 'improved') {
		mobileThemeName.set(designTheme);
	}
}
