import { writable } from 'svelte/store';

/**
 * Store for tracking mobile navigation direction.
 * true = navigating back (shallower depth)
 * false = navigating forward (deeper depth)
 */
export const mobileNavDirection = writable<'forward' | 'back'>('forward');
