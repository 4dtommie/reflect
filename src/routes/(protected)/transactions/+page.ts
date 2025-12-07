export async function load({ fetch, parent, url }: { fetch: typeof globalThis.fetch; parent: () => Promise<any>; url: URL }) {
	const { user } = await parent();

	// Get category filter from URL query params
	const categoryParam = url.searchParams.get('category');

	if (!user) {
		return { transactions: [], categories: [], categoryParam };
	}

	try {
		// Calculate date 6 months ago
		const sixMonthsAgo = new Date();
		sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
		const startDate = sixMonthsAgo.toISOString();

		// Fetch transactions and categories in parallel
		const [transactionsResponse, categoriesResponse] = await Promise.all([
			fetch(`/api/transactions?page=1&pageSize=5000&startDate=${startDate}`),
			fetch('/api/categories')
		]);

		let transactionsData: any = { transactions: [], stats: null };
		let categoriesData: any = { categories: [] };

		if (transactionsResponse.ok) {
			transactionsData = await transactionsResponse.json();
		}

		if (categoriesResponse.ok) {
			categoriesData = await categoriesResponse.json();
		}

		// Map monthlyTotals dates for client-side use and ensure weeklyAverages is included
		const mappedStats = transactionsData.stats ? {
			...transactionsData.stats,
			monthlyTotals: transactionsData.stats.monthlyTotals.map((m: any) => ({
				...m,
				date: new Date(m.year, m.month, 1)
			})),
			weeklyAverages: transactionsData.stats.weeklyAverages || {}
		} : null;

		return {
			transactions: transactionsData.transactions || [],
			stats: mappedStats,
			categories: categoriesData.categories || [],
			categoryParam
		};
	} catch (error) {
		console.error('Error loading transactions data:', error);
		return { transactions: [], stats: null, categories: [], categoryParam };
	}
}

