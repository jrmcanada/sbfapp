<script lang="ts">
	import { enhance } from '$app/forms';
	import AdminNav from '$lib/components/AdminNav.svelte';
	import { Button } from '$lib/components/ui/button';
	import { formatDateTime } from '$lib/format';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let submitting = $state(false);
</script>

<svelte:head><title>Send a notification · SBF</title></svelte:head>

<div class="notifications-page">
	<AdminNav current="notifications" />

	<h1>Send a notification</h1>

	<form
		method="POST"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				await update();
				submitting = false;
			};
		}}
	>
		<label>
			Title
			<input type="text" name="title" required maxlength="100" />
		</label>
		<label>
			Message
			<textarea name="body" required rows="4"></textarea>
		</label>
		<Button type="submit" disabled={submitting}>{submitting ? 'Sending…' : 'Send'}</Button>
	</form>

	{#if form?.success}
		<p class="success" role="status">
			Sent to {form.sent} device{form.sent === 1 ? '' : 's'}.
			{#if form.removed > 0}
				Removed {form.removed} expired subscription{form.removed === 1 ? '' : 's'}.
			{/if}
		</p>
	{/if}

	{#if form?.error}
		<p class="error" role="alert">{form.error}</p>
	{/if}

	<details class="history">
		<summary>History ({data.history.length})</summary>
		{#if data.historyError}
			<p class="error" role="alert">Couldn't load history: {data.historyError}</p>
		{:else if data.history.length === 0}
			<p class="empty">Nothing has been sent yet.</p>
		{:else}
			<ul class="history-list">
				{#each data.history as item (item.id)}
					<li class="history-item">
						<strong>{item.title}</strong>
						<p>{item.body}</p>
						<span class="meta">
							{item.sender} · {item.sent_at ? formatDateTime(item.sent_at) : 'Not delivered'}
						</span>
					</li>
				{/each}
			</ul>
		{/if}
	</details>
</div>

<style>
	.notifications-page {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1rem;
		max-width: 32rem;
		margin: 0 auto;
	}

	h1 {
		font-size: 1.25rem;
		font-weight: 600;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.9rem;
		color: var(--muted-foreground);
	}

	input,
	textarea {
		font: inherit;
		padding: 0.5rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--card);
		color: var(--foreground);
	}

	.success {
		color: var(--foreground);
	}

	.error {
		color: var(--destructive);
	}

	.history summary {
		cursor: pointer;
		font-weight: 600;
	}

	.history-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: 0.75rem;
	}

	.history-item {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		padding: 0.6rem 0.75rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		background: var(--card);
	}

	.history-item p {
		font-size: 0.9rem;
		white-space: pre-line;
	}

	.meta,
	.empty {
		font-size: 0.8rem;
		color: var(--muted-foreground);
	}
</style>
