import { getToken } from '@auth/core/jwt';
import { getContext } from 'hono/context-storage';

/**
 * Server-side session helper used by API routes (via getSessionUserId).
 * Reads the Auth.js session JWT from cookies, or Authorization: Bearer.
 */
export async function auth() {
	try {
		const c = getContext();
		const req = c?.req?.raw;
		if (!req) return null;

		const isSecure = process.env.AUTH_URL?.startsWith('https') ?? false;
		const token = await getToken({
			req,
			secret: process.env.AUTH_SECRET,
			secureCookie: isSecure,
		});

		if (!token) return null;

		return {
			user: {
				id: token.sub,
				email: token.email,
				name: token.name,
				image: token.picture,
			},
			expires: token.exp != null ? String(token.exp) : undefined,
		};
	} catch {
		// Outside a Hono request context (e.g. scripts) — no session.
		return null;
	}
}
