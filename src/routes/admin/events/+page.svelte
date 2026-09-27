<script lang="ts">
	import { enhance } from '$app/forms';
	import AdminNav from '$lib/components/AdminNav.svelte';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import ConfirmDelete from '$lib/components/ConfirmDelete.svelte';
	import { Button } from '$lib/components/ui/button';
	import { formatDay, formatTime12h } from '$lib/format';
	import type { PageProps } from './$types';

	type EventItem = (typeof data.upcoming)[number];

	let { data, form }: PageProps = $props();

	let submitting = $state(false);
	let fileInput = $state<HTMLInputElement | null>(null);
	let fileName = $state<string | null>(null);

	let editingId = $state<string | null>(null);
	let editDraft = $state({
		start_date: '',
		end_date: '',
		start_time: '',
		title: '',
		description: ''
	});

	function metaLine(event: EventItem): string {
		const range = dateRange(event.start_date, event.end_date);
		return event.start_time ? `${range} · ${formatTime12h(event.start_time)}` : range;
	}

	function dateRange(start: string, end: string): string {
		return start === end ? formatDay(start) : `${formatDay(start)} – ${formatDay(end)}`;
	}

	function startEdit(event: EventItem) {
		editingId = event.id;
		editDraft = {
			start_date: event.start_date,
			end_date: event.end_date,
			// Postgres returns "HH:MM:SS"; the time input only wants "HH:MM"
			// (seconds are never meaningful here — parseTimeField never sets them).
			start_time: event.start_time?.slice(0, 5) ?? '',
			title: event.title,
			description: event.description ?? ''
		};
	}

	function cancelEdit() {
		editingId = null;
	}
</script>

<svelte:head><title>Events · SBF</title></svelte:head>

{#snippet eventList(events: EventItem[], emptyText: string)}
	{#if events.length === 0}
		<p class="empty">{emptyText}</p>
	{:else}
		<ul class="list">
			{#each events as event (event.id)}
				<li class="event">
					{#if editingId === event.id}
						<form
							class="edit-form"
							method="POST"
							action="?/edit"
							use:enhance={() => {
								submitting = true;
								return async ({ result, update }) => {
									if (result.type === 'success') editingId = null;
									await update();
									submitting = false;
								};
							}}
						>
							<input type="hidden" name="id" value={event.id} />
							<div class="edit-row">
								<label>
									Start date
									<input type="date" name="start_date" bind:value={editDraft.start_date} required />
								</label>
								<label>
									End date
									<input type="date" name="end_date" bind:value={editDraft.end_date} required />
								</label>
								<label>
									Time
									<input type="time" name="start_time" bind:value={editDraft.start_time} />
								</label>
							</div>
							<label>
								Title
								<input type="text" name="title" bind:value={editDraft.title} required />
							</label>
							<label>
								Description
								<textarea name="description" bind:value={editDraft.description} rows="2"></textarea>
							</label>
							{#if form?.editError && form?.editingId === event.id}
								<p class="error" role="alert">{form.editError}</p>
							{/if}
							<div class="actions">
								<Button type="submit" size="sm" disabled={submitting}>
									{submitting ? 'Saving…' : 'Save'}
								</Button>
								<Button type="button" size="sm" variant="ghost" onclick={cancelEdit}>Cancel</Button>
							</div>
						</form>
					{:else}
						<div class="details">
							<span class="title">{event.title}</span>
							<span class="meta">{metaLine(event)}</span>
						</div>
						<div class="actions">
							<Button size="sm" variant="outline" onclick={() => startEdit(event)}>Edit</Button>
							<ConfirmDelete id={event.id} />
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
{/snippet}

<AppHeader signedIn={data.signedIn} displayName={data.displayName} />

<div class="admin-page">
	<AdminNav current="events" />

	<h1>Upload events</h1>
	<p class="hint">
		One event per line: <code>YYYY-MM-DD[ to YYYY-MM-DD] | HH:MM | Title | Description</code>. Time
		is 24-hour (e.g. <code>09:30</code>) or left blank for no fixed time. Description is optional.
		Lines starting with <code>#</code> are ignored. Uploading adds to the existing events — it doesn't
		replace them.
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

	.edit-form {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		width: 100%;
	}

	.edit-row {
		display: flex;
		gap: 0.6rem;
		flex-wrap: wrap;
	}

	.edit-form label {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		font-size: 0.8rem;
		color: var(--muted-foreground);
		flex: 1;
		min-width: 8rem;
	}

	.edit-form input,
	.edit-form textarea {
		font: inherit;
		padding: 0.4rem 0.5rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--background);
		color: var(--foreground);
	}
</style>
