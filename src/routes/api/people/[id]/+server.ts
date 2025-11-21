import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

export const GET: RequestHandler = async ({ params, locals }) => {
	// Require authentication
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

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

		// Ensure user owns this person
		if (person.userId !== locals.user.id) {
			throw error(403, 'Forbidden');
		}

		return json(person);
	} catch (err) {
		if (err instanceof Error && err.message === 'Forbidden') {
			throw err;
		}
		console.error('Error fetching person:', err);
		return json({ error: 'Failed to fetch person' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	// Require authentication
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	try {
		const id = parseInt(params.id);

		if (isNaN(id)) {
			return json({ error: 'Invalid ID' }, { status: 400 });
		}

		// Check if person exists and belongs to user
		const existingPerson = await db.person.findUnique({
			where: { id }
		});

		if (!existingPerson) {
			return json({ error: 'Person not found' }, { status: 404 });
		}

		if (existingPerson.userId !== locals.user.id) {
			throw error(403, 'Forbidden');
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
	} catch (err) {
		if (err instanceof Error && err.message === 'Forbidden') {
			throw err;
		}
		console.error('Error updating person:', err);
		return json({ error: 'Failed to update person' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	// Require authentication
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	try {
		const id = parseInt(params.id);

		if (isNaN(id)) {
			return json({ error: 'Invalid ID' }, { status: 400 });
		}

		// Check if person exists and belongs to user
		const existingPerson = await db.person.findUnique({
			where: { id }
		});

		if (!existingPerson) {
			return json({ error: 'Person not found' }, { status: 404 });
		}

		if (existingPerson.userId !== locals.user.id) {
			throw error(403, 'Forbidden');
		}

		await db.person.delete({
			where: { id }
		});

		return json({ success: true });
	} catch (err) {
		if (err instanceof Error && err.message === 'Forbidden') {
			throw err;
		}
		console.error('Error deleting person:', err);
		return json({ error: 'Failed to delete person' }, { status: 500 });
	}
};

