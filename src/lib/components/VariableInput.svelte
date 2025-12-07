<script lang="ts">
	import { onMount } from 'svelte';

	let {
		value = $bindable(''),
		placeholder = 'Type here...',
		availableVariables = [] as string[]
	} = $props();

	let editor: HTMLDivElement;
	let showSuggestions = $state(false);
	let suggestionFilter = $state('');
	let selectedSuggestionIndex = $state(0);
	let cursorPosition = $state<{ top: number; left: number }>({ top: 0, left: 0 });

	// Filtered variables based on input
	let filteredVariables = $derived(
		availableVariables.filter((v) => v.toLowerCase().startsWith(suggestionFilter.toLowerCase()))
	);

	// Public method to insert variable from outside
	export function insertVariable(variable: string) {
		// Just append to end if not focused, or insert at cursor if we could track it?
		// For simplicity/reliability with manual buttons, let's append to value
		// IF the editor isn't focused. If it IS focused, insertBadgeAtCursor would be better but
		// usually clicking a button blurs the editor.

		// Simplest reliable way: append to value text
		// Check if keys have space to decide if we need {{}}
		// The parent currently sends raw name "amount". We need to wrap it.
		// Actually parent sends `{{amount}}` string usually in the += logic.
		// But let's assume this method takes the raw variable name.

		const newVal = value + `{{${variable}}}`;
		value = newVal;
		// Rendering will happen via effect since value changed
	}

	// When value changes from outside (and we are not focusing it), render.
	$effect(() => {
		// If editor exists and is not active, or if it is empty, sync from value
		if (editor && document.activeElement !== editor) {
			renderFromValue();
		}
	});

	function parseMessageParts(template: string): Array<{ type: 'text' | 'var'; value: string }> {
		const parts: Array<{ type: 'text' | 'var'; value: string }> = [];
		const regex = /\{\{(\w+)\}\}/g;
		let lastIndex = 0;
		let match;

		while ((match = regex.exec(template)) !== null) {
			if (match.index > lastIndex) {
				parts.push({ type: 'text', value: template.slice(lastIndex, match.index) });
			}
			parts.push({ type: 'var', value: match[1] });
			lastIndex = regex.lastIndex;
		}

		if (lastIndex < template.length) {
			parts.push({ type: 'text', value: template.slice(lastIndex) });
		}

		return parts;
	}

	function createBadge(name: string) {
		const span = document.createElement('span');
		span.className = 'badge badge-primary badge-sm mx-0.5 align-middle font-mono';
		span.contentEditable = 'false';
		span.dataset.variable = name;
		span.textContent = name;
		// Prevent deletion issues by making it atomic
		span.style.userSelect = 'none';
		return span;
	}

	function renderFromValue() {
		if (!editor) return;
		// If value is empty, clear editor to show placeholder (via CSS empty pseudo-class ideally, or handle logic)
		if (!value) {
			editor.innerHTML = '';
			return;
		}

		const parts = parseMessageParts(value);
		const fragment = document.createDocumentFragment();

		parts.forEach((part) => {
			if (part.type === 'var') {
				fragment.appendChild(createBadge(part.value));
			} else {
				fragment.appendChild(document.createTextNode(part.value));
			}
		});

		editor.innerHTML = '';
		editor.appendChild(fragment);
	}

	function serializeEditor(): string {
		if (!editor) return '';
		let result = '';

		function walk(node: Node) {
			if (node.nodeType === Node.TEXT_NODE) {
				result += (node.textContent || '').replace(/\u00A0/g, ' ');
			} else if (node.nodeType === Node.ELEMENT_NODE) {
				const el = node as HTMLElement;
				if (el.tagName === 'BR') {
					result += '\n';
				} else if (el.dataset.variable) {
					result += `{{${el.dataset.variable}}}`;
				} else {
					el.childNodes.forEach(walk);
					// Block elements might need newlines
					if (
						getComputedStyle(el).display === 'block' ||
						el.tagName === 'DIV' ||
						el.tagName === 'P'
					) {
						result += '\n'; // simplified
					}
				}
			}
		}

		editor.childNodes.forEach(walk);
		return result.trim().replace(/\n+/g, '\n');
	}

	function getCaretCoordinates() {
		const selection = window.getSelection();
		if (!selection || rangeCount() === 0) return { top: 0, left: 0 };
		const range = selection.getRangeAt(0);
		const rect = range.getBoundingClientRect();
		// Fixed position menu uses viewport coords directly
		return {
			top: rect.bottom,
			left: rect.left
		};
	}

	function rangeCount() {
		const selection = window.getSelection();
		return selection ? selection.rangeCount : 0;
	}

	function handleInput() {
		const selection = window.getSelection();
		let handled = false;

		if (selection && selection.rangeCount > 0) {
			const range = selection.getRangeAt(0);

			if (range.startContainer.nodeType === Node.TEXT_NODE) {
				const textNode = range.startContainer as Text;
				const text = textNode.textContent || '';
				const cursorOffset = range.startOffset;
				const textBefore = text.slice(0, cursorOffset);

				// 1. Detect closed variable {{var}} (Badge replacement)
				const matchClosed = textBefore.match(/\{\{([\w]+)\}\}$/);
				if (matchClosed) {
					insertBadgeAtCursor(matchClosed[1], matchClosed[0].length);
					handled = true;
				}

				// 2. Detect open variable {{var (Autocomplete)
				// Look for last occurrence of {{ that isn't closed
				const openMatch = textBefore.match(/\{\{([\w]*)$/);
				if (openMatch) {
					const varNameFragment = openMatch[1];
					// Check if valid variable exists starting with this logic?
					// For now always show if we are in {{...
					showSuggestions = true;
					suggestionFilter = varNameFragment;
					selectedSuggestionIndex = 0;
					cursorPosition = getCaretCoordinates();
				} else {
					showSuggestions = false;
				}
			}
		}

		if (!handled) {
			// update value if we didn't do a badge replacement (which does its own update)
			value = serializeEditor();
		} else {
			// Badge replacement happened, hide suggestions
			showSuggestions = false;
			value = serializeEditor();
		}
	}

	function insertBadgeAtCursor(varName: string, lengthToDelete: number) {
		const selection = window.getSelection();
		if (!selection || selection.rangeCount === 0) return;
		const range = selection.getRangeAt(0);

		// We assume we are in a text node and cursor is at end of the sequence
		const textNode = range.startContainer;
		const startOffset = range.startOffset - lengthToDelete;

		if (startOffset < 0) return; // safety

		const rangeToReplace = document.createRange();
		rangeToReplace.setStart(textNode, startOffset);
		rangeToReplace.setEnd(textNode, range.startOffset);
		rangeToReplace.deleteContents();

		const badge = createBadge(varName);
		rangeToReplace.insertNode(badge);

		const space = document.createTextNode('\u00A0');
		if (badge.nextSibling) {
			badge.parentNode?.insertBefore(space, badge.nextSibling);
		} else {
			badge.parentNode?.appendChild(space);
		}

		rangeToReplace.setStart(space, 1);
		rangeToReplace.setEnd(space, 1);
		selection.removeAllRanges();
		selection.addRange(rangeToReplace);
	}

	function replaceSuggestion(variable: string) {
		const selection = window.getSelection();
		if (!selection || selection.rangeCount === 0) return;

		// We need to find the {{filter part and replace it
		const range = selection.getRangeAt(0);
		const textNode = range.startContainer;
		if (textNode.nodeType !== Node.TEXT_NODE) return;

		const text = textNode.textContent || '';
		const cursorOffset = range.startOffset;
		const textBefore = text.slice(0, cursorOffset);
		const match = textBefore.match(/\{\{([\w]*)$/);

		if (match) {
			const lengthToDelete = match[0].length;
			insertBadgeAtCursor(variable, lengthToDelete);
			showSuggestions = false;
			value = serializeEditor();
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (showSuggestions && filteredVariables.length > 0) {
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				selectedSuggestionIndex = (selectedSuggestionIndex + 1) % filteredVariables.length;
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				selectedSuggestionIndex =
					(selectedSuggestionIndex - 1 + filteredVariables.length) % filteredVariables.length;
			} else if (e.key === 'Enter' || e.key === 'Tab') {
				e.preventDefault();
				replaceSuggestion(filteredVariables[selectedSuggestionIndex]);
			} else if (e.key === 'Escape') {
				showSuggestions = false;
			}
		}
	}
	function portal(node: HTMLElement) {
		document.body.appendChild(node);
		return {
			destroy() {
				if (node.parentNode) {
					node.parentNode.removeChild(node);
				}
			}
		};
	}
</script>

<div
	bind:this={editor}
	class="textarea-bordered textarea h-auto min-h-[5rem] w-full p-2 leading-normal whitespace-pre-wrap"
	contenteditable="true"
	role="textbox"
	tabindex="0"
	oninput={handleInput}
	onkeydown={handleKeyDown}
	data-placeholder={placeholder}
></div>

{#if showSuggestions && filteredVariables.length > 0}
	<ul
		use:portal
		class="menu fixed z-[9999] w-56 rounded-box bg-base-100 p-1 shadow-lg ring-1 ring-base-300"
		style="top: {cursorPosition.top + 5}px; left: {cursorPosition.left}px;"
	>
		{#each filteredVariables as variable, i}
			<li>
				<button
					class={i === selectedSuggestionIndex ? 'active' : ''}
					onmousedown={(e) => {
						e.preventDefault(); // prevent blur
						replaceSuggestion(variable);
					}}
				>
					{variable}
				</button>
			</li>
		{/each}
	</ul>
{/if}

<style>
	/* Placeholder simulation */
	[contenteditable]:empty:before {
		content: attr(data-placeholder);
		color: oklch(var(--bc) / 0.5);
		pointer-events: none;
		display: block; /* For filtering empty state */
	}
</style>
