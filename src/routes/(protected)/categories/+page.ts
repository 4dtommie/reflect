export async function load({ fetch, parent }: { fetch: typeof globalThis.fetch; parent: () => Promise<any> }) {
	const { user } = await parent();
	
	if (!user) {
		return {
			categories: []
		};
	}

	try {
		const response = await fetch('/api/categories');
		if (!response.ok) {
			return {
				categories: []
			};
		}
		const data = await response.json();
		
		return {
			categories: data.categories || []
		};
	} catch (error) {
		console.error('Error loading categories:', error);
		return {
			categories: []
		};
	}
}

