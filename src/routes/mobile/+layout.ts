import type { LayoutLoad } from './$types';

export const load: LayoutLoad = ({ url, depends }) => {
    // Declare dependency on URL to ensure this load function re-runs on navigation
    depends(`url:${url.pathname}`);
    return {
        url: url.pathname
    };
};
