import { error } from '@sveltejs/kit';

type ProfileLike = { status: string; role: string } | null;

/**
 * Defense in depth for admin routes that use the secret-key client (which
 * bypasses RLS). hooks.server.ts already keeps non-admins out of /admin/*;
 * this makes each of those loads/actions refuse on its own too, so a future
 * change to the gate can't silently expose them.
 */
export function requireAdmin(locals: { profile: ProfileLike }): void {
	if (locals.profile?.role !== 'admin' || locals.profile.status !== 'approved') {
		error(403, 'Admins only.');
	}
}
