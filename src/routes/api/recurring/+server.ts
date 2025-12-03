import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { recurringService } from '$lib/server/recurring/recurringService';

export const GET: RequestHandler = async ({ locals }) => {
	// Check authentication
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	try {
		const data = await recurringService.getRecurringData(locals.user.id);

		// Log types for debugging
		const typeBreakdown = {
			subscription: data.subscriptions.filter((s) => s.type === 'subscription').length,
			variable_cost: data.subscriptions.filter((s) => s.type === 'variable_cost').length,
			salary: data.subscriptions.filter((s) => s.type === 'salary').length,
			tax: data.subscriptions.filter((s) => s.type === 'tax').length,
			other: data.subscriptions.filter(
				(s) => !['subscription', 'variable_cost', 'salary', 'tax'].includes(s.type || '')
			).length
		};
		console.log(
			`[API /recurring] Returning ${data.subscriptions.length} recurring transactions:`,
			typeBreakdown
		);
		data.subscriptions
			.filter((s) => s.type === 'variable_cost')
			.forEach((v) => console.log(`  - Variable cost: ${v.name} (type: ${v.type})`));

		return json(data);
	} catch (err) {
		console.error('Error fetching recurring transactions:', err);
		throw error(500, 'Failed to fetch recurring transactions');
	}
};

export const DELETE: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	try {
		await recurringService.deleteAllRecurring(locals.user.id);
		return json({ success: true });
	} catch (err) {
		console.error('Error deleting recurring transactions:', err);
		throw error(500, 'Failed to delete recurring transactions');
	}
};
