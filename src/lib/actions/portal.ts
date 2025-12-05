import { tick } from 'svelte';

/**
 * Usage: <div use:portal={'css-selector'}> or <div use:portal={element}>
 *
 * @param node
 * @param target
 */
export function portal(node: HTMLElement, target: string | HTMLElement = 'body') {
    let targetEl: HTMLElement | null;

    async function update(newTarget: string | HTMLElement) {
        target = newTarget;
        if (typeof target === 'string') {
            targetEl = document.querySelector(target);
            if (targetEl === null) {
                await tick();
                targetEl = document.querySelector(target);
            }
            if (targetEl === null) {
                throw new Error(`No element found matching css selector: "${target}"`);
            }
        } else if (target instanceof HTMLElement) {
            targetEl = target;
        } else {
            throw new TypeError(
                `Unknown portal target type: ${target === null ? 'null' : typeof target
                }. Allowed: string (CSS selector) or HTMLElement.`
            );
        }
        targetEl.appendChild(node);
        node.hidden = false;
    }

    function destroy() {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }

    update(target);
    return {
        update,
        destroy
    };
}
