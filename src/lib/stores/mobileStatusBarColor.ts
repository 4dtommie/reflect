import { writable } from 'svelte/store';

/**
 * Store to override the mobile status bar background color.
 * Set to null to use the default (based on route).
 * Set to a CSS color string to override.
 */
export const mobileStatusBarColor = writable<string | null>(null);
