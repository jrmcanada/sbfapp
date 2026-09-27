import { fail } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabase';
import { isValidCalendarDate, parseEventsFile, parseTimeField } from '$lib/server/events';
import { requireAdmin } from '$lib/server/requireAdmin';
import { splitByToday, type CalendarEvent } from '$lib/calendar';
import { todayInChurchZone } from '$lib/format';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Events are publicly readable, so the admin's own session is enough here.
	const { data, error } = await locals.supabase
		.from('events')
		.select('id, title, description, start_date, end_date, start_time');

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
	},

	edit: async ({ request, locals }) => {
		requireAdmin(locals);
		const formData = await request.formData();
		const idRaw = formData.get('id');
		if (typeof idRaw !== 'string') {
			return fail(400, { editError: 'Missing event id.', editingId: null });
		}
		const id = idRaw;

		const startDate = formData.get('start_date');
		const endDate = formData.get('end_date');
		const startTimeRaw = formData.get('start_time');
		const title = formData.get('title');
		const description = formData.get('description');

		if (
			typeof startDate !== 'string' ||
			typeof endDate !== 'string' ||
			typeof startTimeRaw !== 'string' ||
			typeof title !== 'string' ||
			typeof description !== 'string'
		) {
			return fail(400, { editError: 'Missing fields.', editingId: id });
		}

		// Same validation as the bulk upload (events.ts) — a single event's
		// worth of it, since this form edits one row at a time.
		if (!isValidCalendarDate(startDate) || !isValidCalendarDate(endDate)) {
			return fail(400, { editError: 'Not a real calendar date.', editingId: id });
		}
		if (endDate < startDate) {
			return fail(400, { editError: 'End date is before start date.', editingId: id });
		}
		const time = parseTimeField(startTimeRaw.trim());
		if (!time.ok) {
			return fail(400, {
				editError: 'Invalid time — expected 24-hour HH:MM (e.g. 09:30) or blank.',
				editingId: id
			});
		}
		if (title.trim() === '') {
			return fail(400, { editError: 'Title is required.', editingId: id });
		}

		const { error } = await supabaseAdmin
			.from('events')
			.update({
				start_date: startDate,
				end_date: endDate,
				start_time: time.value,
				title: title.trim(),
				description: description.trim() || null
			})
			.eq('id', id);
		if (error) return fail(500, { editError: error.message, editingId: id });

		return { edited: true };
	}
};
