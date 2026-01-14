<script lang="ts" module>
	import { setContext, getContext } from 'svelte';
	import type { ThemeConfig } from './themeConfig';

	const THEME_CONTEXT_KEY = Symbol('mobile-theme');

	export function setThemeContext(theme: ThemeConfig) {
		setContext(THEME_CONTEXT_KEY, theme);
	}

	export function getThemeContext(): ThemeConfig | undefined {
		return getContext<ThemeConfig>(THEME_CONTEXT_KEY);
	}
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { nnOriginalTheme } from './themeConfig';

	interface Props {
		theme?: ThemeConfig;
		children: Snippet;
	}

	let { theme = nnOriginalTheme, children }: Props = $props();

	// Provide theme to all descendants
	$effect(() => {
		setThemeContext(theme);
	});
</script>

{@render children()}
