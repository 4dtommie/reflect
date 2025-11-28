export async function load({ fetch, parent }: { fetch: typeof globalThis.fetch; parent: () => Promise<any> }) {
	const { user } = await parent();
	
	if (!user) {
		return {
			merchants: [],
			categories: []
		};
	}

	try {
		// Fetch merchants and categories in parallel
		const [merchantsResponse, categoriesResponse] = await Promise.all([
			fetch('/api/merchants'),
			fetch('/api/categories')
		]);

		const merchants = merchantsResponse.ok ? (await merchantsResponse.json()).merchants || [] : [];
		const categories = categoriesResponse.ok ? (await categoriesResponse.json()).categories || [] : [];

		return {
			merchants,
			categories
		};
	} catch (error) {
		console.error('Error loading merchants:', error);
		return {
			merchants: [],
			categories: []
		};
	}
}

