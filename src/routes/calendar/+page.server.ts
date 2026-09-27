import { parseMonthParam } from '$lib/calendar';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals: { supabase } }) => {
	const { year, month } = parseMonthParam(url.searchParams.get('month'));

	const { data, error } = await supabase
		.from('events')
		.select('id, title, description, start_date, end_date, start_time')
		.order('start_date', { ascending: true })
		.order('start_time', { ascending: true, nullsFirst: false });

	if (error) {
		return { year, month, events: [], loadError: error.message };
	}

	return { year, month, events: data, loadError: null };
};
