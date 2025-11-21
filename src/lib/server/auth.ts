import bcrypt from 'bcryptjs';
import { db } from './db';

// Password hashing
export async function hashPassword(password: string): Promise<string> {
	return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
	return bcrypt.compare(password, hash);
}

// User operations
export async function createUser(username: string, password: string) {
	const hashedPassword = await hashPassword(password);

	return db.user.create({
		data: {
			username,
			password: hashedPassword
		},
		select: {
			id: true,
			username: true,
			createdAt: true
		}
	});
}

export async function getUserByUsername(username: string) {
	return db.user.findUnique({
		where: { username }
	});
}

export async function verifyUser(username: string, password: string) {
	const user = await getUserByUsername(username);
	if (!user) {
		return null;
	}

	const isValid = await verifyPassword(password, user.password);
	if (!isValid) {
		return null;
	}

	return {
		id: user.id,
		username: user.username
	};
}

