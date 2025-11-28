import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { seedDatabase } from '../../../../prisma/seed';

export const POST: RequestHandler = async ({ locals }) => {
	// Check authentication
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	try {
		console.log('🗑️  Resetting environment...');
		
		// Run the seed function which deletes all data and recreates default categories
		await seedDatabase();
		
		console.log('✅ Environment reset complete');
		
		return json({ 
			success: true,
			message: 'Environment reset successfully. All transactions and categories have been deleted and default categories have been recreated.'
		});
	} catch (err) {
		console.error('❌ Error resetting environment:', err);
		throw error(500, `Failed to reset environment: ${err instanceof Error ? err.message : 'Unknown error'}`);
	}
};

