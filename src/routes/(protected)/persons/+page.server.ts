import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		return {
			people: []
		};
	}

	try {
		const people = await db.person.findMany({
			where: {
				userId: locals.user.id
			},
			orderBy: {
				createdAt: 'desc'
			}
		});

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

