import { fail } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabase';
import { parseEventsFile } from '$lib/server/events';
import { requireAdmin } from '$lib/server/requireAdmin';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, locals }) => {
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
	}
};
