<script lang="ts">
    import { ArrowRight } from 'lucide-svelte';
    import MobileLink from './MobileLink.svelte';

    interface Props {
        label: string;
        href?: string;
        onclick?: () => void;
        animate?: boolean;
        class?: string;
    }

    let { label, href, onclick, animate = true, class: className = '' }: Props = $props();
</script>

{#if href}
    <MobileLink href={href} {animate} class="flex items-center font-heading text-base font-medium {className}">
        {label}
        <ArrowRight class="ml-1 h-5 w-5 text-mediumOrange-600" strokeWidth={2} />
    </MobileLink>
{:else}
    <button {onclick} class="flex items-center font-heading text-base font-medium {className}">
        {label}
        <ArrowRight class="ml-1 h-5 w-5 text-mediumOrange-600" strokeWidth={2} />
    </button>
{/if}
