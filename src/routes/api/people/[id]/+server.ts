import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const id = parseInt(params.id);

		if (isNaN(id)) {
			return json({ error: 'Invalid ID' }, { status: 400 });
		}

		const person = await db.person.findUnique({
			where: { id }
		});

		if (!person) {
			return json({ error: 'Person not found' }, { status: 404 });
		}

		return json(person);
	} catch (error) {
		console.error('Error fetching person:', error);
		return json({ error: 'Failed to fetch person' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const id = parseInt(params.id);

		if (isNaN(id)) {
			return json({ error: 'Invalid ID' }, { status: 400 });
		}

		const body = await request.json();
		const { name, age, city } = body;

		if (!name || !age || !city) {
			return json({ error: 'Missing required fields: name, age, city' }, { status: 400 });
		}

		const person = await db.person.update({
			where: { id },
			data: {
				name,
				age: parseInt(age.toString()),
				city
			}
		});

		return json(person);
	} catch (error) {
		console.error('Error updating person:', error);
		return json({ error: 'Failed to update person' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const id = parseInt(params.id);

		if (isNaN(id)) {
			return json({ error: 'Invalid ID' }, { status: 400 });
		}

		await db.person.delete({
			where: { id }
		});

		return json({ success: true });
	} catch (error) {
		console.error('Error deleting person:', error);
		return json({ error: 'Failed to delete person' }, { status: 500 });
	}
};

