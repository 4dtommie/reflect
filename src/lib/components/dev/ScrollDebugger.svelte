<script lang="ts">
  import { scrollPositions } from '$lib/stores/scrollPositions';
  import { mobileScrollY } from '$lib/stores/mobileScroll';
  import { page } from '$app/stores';

  function logScrollState() {
    const positions = $scrollPositions;
    const appContent = document.querySelector('.mobile-content') as HTMLElement | null;
    console.group('scroll-debugger');
    console.debug('url:', $page.url.href);
    console.debug('scrollPositions store:', positions);
    console.debug('mobileScrollY store:', $mobileScrollY);
    if (appContent) console.debug('.mobile-content scrollTop:', appContent.scrollTop);
    else console.debug('no .mobile-content found');
    console.groupEnd();
  }
</script>

<div class="fixed bottom-4 right-4 z-50">
  <button
    on:click={logScrollState}
    class="rounded-full bg-white px-3 py-2 text-sm shadow-md"
    aria-label="log scroll state"
  >
    debug scroll
  </button>
</div>
