import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
    const response = await fetch('/api/recurring');
    const data = await response.json();

    return {
        ...data
    };
};
