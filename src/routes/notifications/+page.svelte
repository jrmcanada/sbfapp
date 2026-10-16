<script lang="ts">
	import { resolve } from '$app/paths';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import NotificationControl from '$lib/components/NotificationControl.svelte';
	import { Button } from '$lib/components/ui/button';
	import { formatDateTime } from '$lib/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Notifications · SBF</title></svelte:head>

<AppHeader signedIn={data.signedIn} displayName={data.displayName} />

<div class="notifications-page">
	<header class="toolbar">
		<Button href={resolve('/')} variant="outline">Home</Button>
	</header>

	<h1>Notifications</h1>

	<NotificationControl />

	<h2>Last 30 days</h2>

	{#if data.historyError}
		<p class="empty">Couldn't load recent notifications.</p>
	{:else if data.history.length === 0}
		<p class="empty">No notifications in the last 30 days.</p>
	{:else}
		<ul class="list">
			{#each data.history as notification (notification.id)}
				<li class="notification">
					<p class="title">{notification.title}</p>
					<p class="body">{notification.body}</p>
					<p class="meta">{formatDateTime(notification.sent_at)}</p>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.notifications-page {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1rem;
		max-width: 40rem;
		margin: 0 auto;
	}

	.toolbar {
		display: flex;
		gap: 0.5rem;
	}

	h1 {
		font-size: 1.25rem;
		font-weight: 600;
	}

	h2 {
		font-size: 1rem;
		font-weight: 600;
		margin-top: 0.5rem;
	}

	.list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.notification {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		padding: 0.75rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		background: var(--card);
	}

	.title {
		font-weight: 600;
	}

	.body {
		/* Keep the line breaks the admin typed. */
		white-space: pre-line;
	}

	.meta {
		font-size: 0.85rem;
		color: var(--muted-foreground);
	}

	.empty {
		color: var(--muted-foreground);
	}
</style>
