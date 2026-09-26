<script lang="ts">
	import { browser } from '$app/environment';
	import { Bell, BellOff, BellRing } from 'lucide-svelte';
	import NavCard from '$lib/components/NavCard.svelte';
	import { isIOS, isStandalone } from '$lib/platform';
	import {
		getCurrentSubscription,
		pushSupported,
		subscribeToPush,
		unsubscribeFromPush
	} from '$lib/notifications';

	type Status = 'checking' | 'ios-not-installed' | 'unsupported' | 'subscribed' | 'not-subscribed';

	let status = $state<Status>('checking');
	let busy = $state(false);
	let error = $state<string | null>(null);

	$effect(() => {
		if (!browser) return;

		const ios = isIOS(navigator.userAgent, navigator.maxTouchPoints);
		const standalone = isStandalone(
			(navigator as Navigator & { standalone?: boolean }).standalone,
			window.matchMedia('(display-mode: standalone)').matches
		);

		if (ios && !standalone) {
			status = 'ios-not-installed';
			return;
		}

		if (!pushSupported()) {
			status = 'unsupported';
			return;
		}

		getCurrentSubscription().then((sub) => {
			status = sub ? 'subscribed' : 'not-subscribed';
		});
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
						? 'On for this device'
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
