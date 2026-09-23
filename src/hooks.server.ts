import { createServerClient } from '@supabase/ssr';
import { redirect, type Handle } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import { decideRedirect } from '$lib/server/authGate';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookies) => {
				cookies.forEach(({ name, value, options }) => {
					event.cookies.set(name, value, { ...options, path: '/' });
				});
			}
		}
	});

	// getSession() alone only decodes the cookie locally; getUser() round-trips
	// to Supabase Auth to confirm the session is still actually valid. Every
	// gating decision below uses this validated version, never a bare
	// getSession().
	event.locals.safeGetSession = async () => {
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();
		if (!session) return { session: null, user: null };

		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();
		if (error) return { session: null, user: null };

		return { session, user };
	};

	const { session, user } = await event.locals.safeGetSession();
	event.locals.session = session;
	event.locals.user = user;

	event.locals.profile = null;
	if (user) {
		const { data } = await event.locals.supabase
			.from('profiles')
			.select('status, role')
			.eq('id', user.id)
			.single();
		event.locals.profile = data;
	}

	const routeId = event.route.id ?? event.url.pathname;
	const target = decideRedirect({
		hasSession: session !== null,
		profileStatus: event.locals.profile?.status ?? null,
		isAdmin: event.locals.profile?.role === 'admin',
		routeId
	});

	if (target && target !== routeId) {
		redirect(303, target);
	}

	return resolve(event);
};
