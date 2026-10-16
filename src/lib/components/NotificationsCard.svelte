<script lang="ts">
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { Bell, BellRing } from 'lucide-svelte';
	import NavCard from '$lib/components/NavCard.svelte';
	import { getPushStatus, type PushStatus } from '$lib/notifications';

	// Home's link to /notifications. Shows this device's on/off status; the
	// toggle itself lives on that page (NotificationControl).
	let status = $state<PushStatus | 'checking'>('checking');

	$effect(() => {
		if (!browser) return;
		getPushStatus().then((result) => (status = result));
	});

	const on = $derived(status === 'subscribed');
	const sub = $derived(
		status === 'checking'
			? 'See recent notifications'
			: `${on ? 'On' : 'Off'} · See recent notifications`
	);
</script>

<NavCard
	icon={on ? BellRing : Bell}
	label="Notifications"
	{sub}
	active={on}
	href={resolve('/notifications')}
/>
