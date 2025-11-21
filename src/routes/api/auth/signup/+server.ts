import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createUser, getUserByUsername } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const { username, password } = await request.json();

		// Validation
		if (!username || !password) {
			return json({ error: 'Username and password are required' }, { status: 400 });
		}

		if (username.length < 3) {
			return json({ error: 'Username must be at least 3 characters' }, { status: 400 });
		}

		if (password.length < 6) {
			return json({ error: 'Password must be at least 6 characters' }, { status: 400 });
		}

		// Check if username already exists
		const existingUser = await getUserByUsername(username);
		if (existingUser) {
			return json({ error: 'Username already exists' }, { status: 409 });
		}

		// Create user
		const user = await createUser(username, password);

		// Create session
		cookies.set('session_id', user.id.toString(), {
			path: '/',
			httpOnly: true,
			sameSite: 'strict',
			secure: process.env.NODE_ENV === 'production',
			maxAge: 60 * 60 * 24 * 7 // 7 days
		});

		return json(
			{
				user: {
					id: user.id,
					username: user.username
				}
			},
			{ status: 201 }
		);
	} catch (err) {
		console.error('Signup error:', err);
		return json({ error: 'Failed to create account' }, { status: 500 });
	}
};

