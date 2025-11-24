export async function load({ fetch, parent }: { fetch: typeof globalThis.fetch; parent: () => Promise<any> }) {
	const { user } = await parent();
	
	if (!user) {
		return { transactions: [] };
	}

	try {
		// Use the API endpoint instead of direct DB access
		const response = await fetch('/api/transactions?page=1&pageSize=100');
		if (!response.ok) {
			return { transactions: [], stats: null };
		}
		const data = await response.json();
		
		// Map monthlyTotals dates for client-side use and ensure weeklyAverages is included
		const mappedStats = data.stats ? {
			...data.stats,
			monthlyTotals: data.stats.monthlyTotals.map((m: any) => ({
				...m,
				date: new Date(m.year, m.month, 1)
			})),
			weeklyAverages: data.stats.weeklyAverages || {}
		} : null;

		return { 
			transactions: data.transactions || [],
			stats: mappedStats
		};
	} catch (error) {
		console.error('Error loading transactions:', error);
		return { transactions: [], stats: null };
	}
}

