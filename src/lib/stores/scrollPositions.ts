import { writable } from 'svelte/store';

/**
 * Store for preserving scroll positions across navigation.
 * Maps page path to scroll position.
 */
export const scrollPositions = writable<Record<string, number>>({});

/**
 * Save scroll position for a given path
 */
export function saveScrollPosition(path: string, scrollY: number) {
	scrollPositions.update((positions) => ({
		...positions,
		[path]: scrollY
	}));
}

/**
 * Get saved scroll position for a path
 */
export function getScrollPosition(path: string): number {
	let pos = 0;
	scrollPositions.subscribe((positions) => {
		pos = positions[path] || 0;
	})();
	return pos;
}
