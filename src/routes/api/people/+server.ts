import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

export const GET: RequestHandler = async ({ locals }) => {
	// Require authentication
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	try {
		// Only get people for the current user
		const people = await db.person.findMany({
			where: {
				userId: locals.user.id
			},
			orderBy: {
				createdAt: 'desc'
			}
		});

		return json(people);
	} catch (err) {
		console.error('Error fetching people:', err);
		return json({ error: 'Failed to fetch people' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	// Require authentication
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	try {
		const body = await request.json();
		const { name, age, city } = body;

		if (!name || !age || !city) {
			return json({ error: 'Missing required fields: name, age, city' }, { status: 400 });
		}

		// Link person to current user
		const person = await db.person.create({
			data: {
				name,
				age: parseInt(age.toString()),
				city,
				userId: locals.user.id
			}
		});

		return json(person, { status: 201 });
	} catch (err) {
		console.error('Error creating person:', err);
		return json({ error: 'Failed to create person' }, { status: 500 });
	}
};

