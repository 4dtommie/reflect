import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
    const res = await fetch('/api/insights/capabilities');
    const data = await res.json();
    return {
        functions: data.functions,
        actions: data.actions
    };
};
