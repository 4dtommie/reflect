import type { Handle } from '@sveltejs/kit';
import { db } from '$lib/server/db';

/**
 * Check if two dates are the same calendar day
 */
function isSameDay(date1: Date, date2: Date): boolean {
	return date1.toDateString() === date2.toDateString();
}

/**
 * Check if date1 is the day before date2
 */
function isConsecutiveDay(date1: Date, date2: Date): boolean {
	const day1 = new Date(date1);
	day1.setHours(0, 0, 0, 0);
	const day2 = new Date(date2);
	day2.setHours(0, 0, 0, 0);
	const diffMs = day2.getTime() - day1.getTime();
	const diffDays = diffMs / (1000 * 60 * 60 * 24);
	return diffDays === 1;
}

/**
 * Update user activity and streak
 */
async function updateUserActivity(userId: number): Promise<void> {
	const now = new Date();

	try {
		const user = await db.user.findUnique({
			where: { id: userId },
			select: { last_active_at: true, login_streak: true, streak_updated_at: true }
		});

		if (!user) return;

		const lastActive = user.last_active_at;
		const streakUpdated = user.streak_updated_at;
		let newStreak = user.login_streak;

		// Only update streak once per day
		if (!streakUpdated || !isSameDay(streakUpdated, now)) {
			if (lastActive && isConsecutiveDay(lastActive, now)) {
				// Consecutive day - increment streak
				newStreak = user.login_streak + 1;
			} else if (!lastActive || !isSameDay(lastActive, now)) {
				// First visit or gap in days - reset streak to 1
				newStreak = 1;
			}

			// Update user with new activity data
			await db.user.update({
				where: { id: userId },
				data: {
					last_active_at: now,
					login_streak: newStreak,
					streak_updated_at: now
				}
			});
		} else {
			// Just update last_active_at (same day)
			await db.user.update({
				where: { id: userId },
				data: { last_active_at: now }
			});
		}
	} catch (error) {
		// Don't fail the request if activity update fails
		console.error('Failed to update user activity:', error);
	}
}

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

				// Update activity and streak (fire and forget - don't await)
				updateUserActivity(user.id);
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
