import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyUser } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const { username, password } = await request.json();

		if (!username || !password) {
			return json({ error: 'Username and password are required' }, { status: 400 });
		}

		const user = await verifyUser(username, password);

		if (!user) {
			return json({ error: 'Invalid username or password' }, { status: 401 });
		}

		// Create session
		cookies.set('session_id', user.id.toString(), {
			path: '/',
			httpOnly: true,
			sameSite: 'strict',
			secure: process.env.NODE_ENV === 'production',
			maxAge: 60 * 60 * 24 * 7 // 7 days
		});

		return json({
			user: {
				id: user.id,
				username: user.username
			}
		});
	} catch (err) {
		console.error('Signin error:', err);
		return json({ error: 'Failed to sign in' }, { status: 500 });
	}
};

