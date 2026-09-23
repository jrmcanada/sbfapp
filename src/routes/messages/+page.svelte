<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const ARCHIVE_URL = 'https://sbf.church/messages/';

	function formatDate(iso: string): string {
		return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric',
			timeZone: 'UTC'
		});
	}
</script>

<svelte:head><title>Messages · SBF</title></svelte:head>

<div class="messages-page">
	<header class="toolbar">
		<Button href={resolve('/')} variant="ghost">Home</Button>
		<Button href={ARCHIVE_URL} target="_blank" rel="noopener noreferrer" variant="outline">
			Full archive
		</Button>
	</header>

	<h1>Recent messages</h1>

	{#if data.messages.length === 0}
		<p class="empty">
			{data.loadError ? "Couldn't load recent messages." : 'No messages found.'} Browse the
			<a href={ARCHIVE_URL} target="_blank" rel="noopener noreferrer">full archive on sbf.church</a> instead.
		</p>
	{:else}
		<ul class="list">
			{#each data.messages as message (message.url)}
				<li class="message">
					<!-- message.url is always an sbf.church URL, not an internal route -->
					<!-- eslint-disable svelte/no-navigation-without-resolve -->
					<a class="title" href={message.url} target="_blank" rel="noopener noreferrer"
						>{message.title}</a
					>
					<!-- eslint-enable svelte/no-navigation-without-resolve -->
					<p class="meta">{message.speaker} · {formatDate(message.date)}</p>
					<audio controls preload="none" src={message.mp3Url}></audio>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.messages-page {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1rem;
		max-width: 40rem;
		margin: 0 auto;
	}

	.toolbar {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	h1 {
		font-size: 1.25rem;
		font-weight: 600;
	}

	.list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.message {
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
		color: var(--foreground);
	}

	.meta {
		font-size: 0.85rem;
		color: var(--muted-foreground);
	}

	audio {
		width: 100%;
	}

	.empty {
		color: var(--muted-foreground);
	}
</style>
