<script lang="ts">
	import { enhance } from '$app/forms';
	import AdminNav from '$lib/components/AdminNav.svelte';
	import ConfirmDelete from '$lib/components/ConfirmDelete.svelte';
	import { Button } from '$lib/components/ui/button';
	import { formatDay } from '$lib/format';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let submitting = $state(false);
	let fileInput = $state<HTMLInputElement | null>(null);
	let fileName = $state<string | null>(null);

	function dateRange(start: string, end: string): string {
		return start === end ? formatDay(start) : `${formatDay(start)} – ${formatDay(end)}`;
	}
</script>

<svelte:head><title>Events · SBF</title></svelte:head>

{#snippet eventList(events: typeof data.upcoming, emptyText: string)}
	{#if events.length === 0}
		<p class="empty">{emptyText}</p>
	{:else}
		<ul class="list">
			{#each events as event (event.id)}
				<li class="event">
					<div class="details">
						<span class="title">{event.title}</span>
						<span class="meta">{dateRange(event.start_date, event.end_date)}</span>
					</div>
					<div class="actions">
						<ConfirmDelete id={event.id} />
					</div>
				</li>
			{/each}
		</ul>
	{/if}
{/snippet}

<div class="admin-page">
	<AdminNav current="events" />

	<h1>Upload events</h1>
	<p class="hint">
		One event per line: <code>YYYY-MM-DD[ to YYYY-MM-DD] | Title | Description</code>. Description
		is optional. Lines starting with <code>#</code> are ignored. Uploading adds to the existing events
		— it doesn't replace them.
	</p>

	<form
		class="upload"
		method="POST"
		action="?/upload"
		enctype="multipart/form-data"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				await update();
				submitting = false;
			};
		}}
	>
		<input
			bind:this={fileInput}
			type="file"
			name="file"
			accept=".txt,text/plain"
			hidden
			onchange={() => (fileName = fileInput?.files?.[0]?.name ?? null)}
		/>
		<Button type="button" variant="outline" onclick={() => fileInput?.click()}>Browse</Button>
		<span class="file-name">{fileName ?? 'No file chosen'}</span>
		<Button type="submit" disabled={submitting || !fileName}>
			{submitting ? 'Uploading…' : 'Upload'}
		</Button>
	</form>

	{#if form?.success}
		<p class="success" role="status">Added {form.count} event{form.count === 1 ? '' : 's'}.</p>
	{/if}

	{#if form?.errors}
		<div class="errors" role="alert">
			<p>Fix these and re-upload — nothing was added:</p>
			<ul>
				{#each form.errors as err (err.line)}
					<li>{err.line > 0 ? `Line ${err.line}: ` : ''}{err.message}</li>
				{/each}
			</ul>
		</div>
	{/if}

	<h2>Upcoming events ({data.upcoming.length})</h2>
	{#if data.loadError}
		<p class="error" role="alert">Couldn't load events: {data.loadError}</p>
	{:else}
		{@render eventList(data.upcoming, 'No upcoming events.')}

		<details class="past">
			<summary>Past events ({data.past.length})</summary>
			{@render eventList(data.past, 'No past events.')}
		</details>
	{/if}

	{#if form?.deleteError}
		<p class="error" role="alert">{form.deleteError}</p>
	{/if}
</div>

<style>
	.admin-page {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1rem;
		max-width: 36rem;
		margin: 0 auto;
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

	.hint {
		font-size: 0.85rem;
		color: var(--muted-foreground);
	}

	.hint code {
		background: var(--muted);
		border-radius: var(--radius-sm);
		padding: 0.05rem 0.3rem;
	}

	.upload {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.file-name {
		font-size: 0.85rem;
		color: var(--muted-foreground);
		overflow-wrap: anywhere;
	}

	.success {
		color: var(--foreground);
	}

	.errors,
	.error {
		color: var(--destructive);
	}

	.errors {
		border: 1px solid var(--destructive);
		border-radius: var(--radius-md);
		padding: 0.75rem;
	}

	.errors ul {
		margin-left: 1.25rem;
		list-style: disc;
	}

	.list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	.event {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem 0.75rem;
		padding: 0.6rem 0.75rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		background: var(--card);
	}

	.details {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.title {
		font-weight: 600;
		overflow-wrap: anywhere;
	}

	.meta,
	.empty {
		font-size: 0.8rem;
		color: var(--muted-foreground);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.past summary {
		cursor: pointer;
		font-weight: 600;
	}
</style>
