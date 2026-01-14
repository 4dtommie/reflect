import { writable, derived } from 'svelte/store';
import { getThemeConfig, type ThemeName, type ThemeConfig } from '$lib/theme/themeConfig';

/**
 * Current design theme name
 */
export const mobileThemeName = writable<ThemeName>('nn-original');

/**
 * Current theme configuration (derived from theme name)
 */
export const mobileTheme = derived(mobileThemeName, ($name) => getThemeConfig($name));

/**
 * Helper to set theme from URL parameter
 */
export function setThemeFromUrl(searchParams: URLSearchParams): void {
	const designTheme = searchParams.get('designTheme') as ThemeName | null;
	if (designTheme === 'nn-original' || designTheme === 'improved') {
		mobileThemeName.set(designTheme);
	}
}
