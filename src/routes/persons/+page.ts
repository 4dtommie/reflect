export const load = async ({ fetch }: { fetch: typeof globalThis.fetch }) => {
	try {
		const response = await fetch('/api/people');
		if (!response.ok) {
			throw new Error('Failed to fetch people');
		}
		const people = await response.json();
		return {
			people
		};
	} catch (error) {
		console.error('Error loading people:', error);
		return {
			people: []
		};
	}
};

