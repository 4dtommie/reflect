import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

export const GET: RequestHandler = async () => {
	try {
		const people = await db.person.findMany({
			orderBy: {
				createdAt: 'desc'
			}
		});

		return json(people);
	} catch (error) {
		console.error('Error fetching people:', error);
		return json({ error: 'Failed to fetch people' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { name, age, city } = body;

		if (!name || !age || !city) {
			return json({ error: 'Missing required fields: name, age, city' }, { status: 400 });
		}

		const person = await db.person.create({
			data: {
				name,
				age: parseInt(age.toString()),
				city
			}
		});

		return json(person, { status: 201 });
	} catch (error) {
		console.error('Error creating person:', error);
		return json({ error: 'Failed to create person' }, { status: 500 });
	}
};

