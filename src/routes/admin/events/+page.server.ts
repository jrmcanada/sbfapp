import { fail } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabase';
import { parseEventsFile } from '$lib/server/events';
import { requireAdmin } from '$lib/server/requireAdmin';
import { splitByToday, type CalendarEvent } from '$lib/calendar';
import { todayInChurchZone } from '$lib/format';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Events are publicly readable, so the admin's own session is enough here.
	const { data, error } = await locals.supabase
		.from('events')
		.select('id, title, description, start_date, end_date');

	const { upcoming, past } = splitByToday((data ?? []) as CalendarEvent[], todayInChurchZone());
	return { upcoming, past, loadError: error?.message ?? null };
};

export const actions: Actions = {
	upload: async ({ request, locals }) => {
		requireAdmin(locals);
		const formData = await request.formData();
		const file = formData.get('file');

		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { errors: [{ line: 0, message: 'Choose a file to upload.' }] });
		}

		const content = await file.text();
		const { events, errors } = parseEventsFile(content);

		if (errors.length > 0) {
			return fail(400, { errors });
		}

		const { error } = await supabaseAdmin.from('events').insert(events);
		if (error) {
			return fail(500, { errors: [{ line: 0, message: error.message }] });
		}

		return { success: true, count: events.length };
	},

	delete: async ({ request, locals }) => {
		requireAdmin(locals);
		const id = (await request.formData()).get('id');
		if (typeof id !== 'string') return fail(400, { deleteError: 'Missing event id.' });

		// No client role can write to events (no RLS write policy), so the
		// secret-key client does it.
		const { error } = await supabaseAdmin.from('events').delete().eq('id', id);
		if (error) return fail(500, { deleteError: error.message });

		return { deleted: true };
	}
};
