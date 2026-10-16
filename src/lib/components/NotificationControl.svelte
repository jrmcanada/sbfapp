<script lang="ts">
	import { browser } from '$app/environment';
	import { Bell, BellOff, BellRing } from 'lucide-svelte';
	import NavCard from '$lib/components/NavCard.svelte';
	import {
		getPushStatus,
		subscribeToPush,
		unsubscribeFromPush,
		type PushStatus
	} from '$lib/notifications';

	let status = $state<PushStatus | 'checking'>('checking');
	let busy = $state(false);
	let error = $state<string | null>(null);

	$effect(() => {
		if (!browser) return;
		getPushStatus().then((result) => (status = result));
	});

	async function toggle() {
		busy = true;
		error = null;
		try {
			if (status === 'subscribed') {
				await unsubscribeFromPush();
				status = 'not-subscribed';
			} else {
				await subscribeToPush();
				status = 'subscribed';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Something went wrong.';
		} finally {
			busy = false;
		}
	}

	const sub = $derived(
		busy
			? 'Working…'
			: status === 'ios-not-installed'
				? 'Add to Home Screen first'
				: status === 'unsupported'
					? 'Not supported on this browser'
					: status === 'subscribed'
						? 'Tap to disable'
						: status === 'checking'
							? 'Checking…'
							: 'Tap to enable'
	);

	const icon = $derived(
		status === 'subscribed' ? BellRing : status === 'unsupported' ? BellOff : Bell
	);
	const canToggle = $derived(status === 'subscribed' || status === 'not-subscribed');
</script>

<NavCard
	{icon}
	label="Notifications"
	{sub}
	active={status === 'subscribed'}
	disabled={!canToggle || busy}
	onclick={canToggle ? toggle : undefined}
/>
{#if error}
	<p class="error" role="alert">{error}</p>
{/if}

<style>
	.error {
		color: var(--destructive);
		font-size: 0.85rem;
	}
</style>
