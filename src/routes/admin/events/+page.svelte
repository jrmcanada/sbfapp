<script lang="ts">
	import { enhance } from '$app/forms';
	import AdminNav from '$lib/components/AdminNav.svelte';
	import { Button } from '$lib/components/ui/button';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();

	let submitting = $state(false);
</script>

<svelte:head><title>Upload events · SBF</title></svelte:head>

<div class="admin-page">
	<AdminNav current="events" />

	<h1>Upload events</h1>
	<p class="hint">
		One event per line: <code>YYYY-MM-DD[ to YYYY-MM-DD] | Title | Description</code>. Description
		is optional. Lines starting with <code>#</code> are ignored. Uploading adds to the existing events
		— it doesn't replace them.
	</p>

	<form
		method="POST"
		enctype="multipart/form-data"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				await update();
				submitting = false;
			};
		}}
	>
		<input type="file" name="file" accept=".txt,text/plain" required />
		<Button type="submit" disabled={submitting}>{submitting ? 'Uploading…' : 'Upload'}</Button>
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

	.hint {
		font-size: 0.85rem;
		color: var(--muted-foreground);
	}

	.hint code {
		background: var(--muted);
		border-radius: var(--radius-sm);
		padding: 0.05rem 0.3rem;
	}

	form {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.success {
		color: var(--foreground);
	}

	.errors {
		border: 1px solid var(--destructive);
		border-radius: var(--radius-md);
		padding: 0.75rem;
		color: var(--destructive);
	}

	.errors ul {
		margin-left: 1.25rem;
		list-style: disc;
	}
</style>
