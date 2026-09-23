<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();

	let submitting = $state(false);
</script>

<svelte:head><title>Send a notification · SBF</title></svelte:head>

<div class="notifications-page">
	<header class="toolbar">
		<Button href={resolve('/')} variant="ghost">Home</Button>
		<Button href={resolve('/admin/events')} variant="ghost">Events</Button>
		<Button href={resolve('/admin/accounts')} variant="ghost">Accounts</Button>
	</header>

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

	.toolbar {
		display: flex;
		gap: 0.5rem;
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
</style>
