import type { Handle } from '@sveltejs/kit';
import { db } from '$lib/server/db';

// Validate session and attach user to event.locals
export const handle: Handle = async ({ event, resolve }) => {
	const sessionId = event.cookies.get('session_id');

	if (sessionId) {
		try {
			// Verify session and get user
			const userId = parseInt(sessionId);
			const user = await db.user.findUnique({
				where: { id: userId },
				select: { id: true, username: true }
			});

			if (user) {
				event.locals.user = user;
			} else {
				// Invalid user ID, clear cookie
				event.cookies.delete('session_id', { path: '/' });
			}
		} catch (error) {
			// Invalid session
			event.cookies.delete('session_id', { path: '/' });
		}
	}

	return resolve(event);
};

