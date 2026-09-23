<script lang="ts">
	import { browser } from '$app/environment';
	import { Button } from '$lib/components/ui/button';
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
</script>

{#if status === 'ios-not-installed'}
	<p class="hint">
		To get notifications on iPhone, first add this to your Home Screen: tap <strong>Share</strong>,
		then
		<strong>Add to Home Screen</strong>.
	</p>
{:else if status === 'subscribed' || status === 'not-subscribed'}
	<Button
		onclick={toggle}
		disabled={busy}
		variant={status === 'subscribed' ? 'outline' : 'default'}
	>
		{#if busy}
			Working…
		{:else if status === 'subscribed'}
			Disable notifications
		{:else}
			Enable notifications
		{/if}
	</Button>
	{#if error}
		<p class="error" role="alert">{error}</p>
	{/if}
{/if}

<style>
	.hint {
		color: var(--muted-foreground);
		font-size: 0.9rem;
		max-width: 24rem;
	}

	.error {
		color: var(--destructive);
		font-size: 0.85rem;
	}
</style>
