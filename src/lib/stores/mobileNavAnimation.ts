import { writable } from 'svelte/store';

// Flag to indicate that the next navigation should animate
// Links set this to true before navigating, layout reads and resets it
export const shouldAnimateNavigation = writable(false);
