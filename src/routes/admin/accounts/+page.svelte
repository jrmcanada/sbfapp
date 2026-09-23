<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const pending = $derived(data.profiles.filter((p) => p.status === 'pending'));
	const decided = $derived(data.profiles.filter((p) => p.status !== 'pending'));
</script>

<svelte:head><title>Accounts · SBF</title></svelte:head>

<div class="accounts-page">
	<header class="toolbar">
		<Button href={resolve('/')} variant="ghost">Home</Button>
	</header>

	<h1>Accounts</h1>

	{#if data.loadError}
		<p class="error" role="alert">Couldn't load accounts: {data.loadError}</p>
	{:else}
		<section>
			<h2>Pending ({pending.length})</h2>
			{#if pending.length === 0}
				<p class="empty">No accounts waiting for approval.</p>
			{:else}
				<ul class="list">
					{#each pending as profile (profile.id)}
						<li class="account">
							<span>{profile.display_name}</span>
							<div class="actions">
								<form method="POST" action="?/approve" use:enhance>
									<input type="hidden" name="id" value={profile.id} />
									<Button type="submit" size="sm">Approve</Button>
								</form>
								<form method="POST" action="?/reject" use:enhance>
									<input type="hidden" name="id" value={profile.id} />
									<Button type="submit" size="sm" variant="destructive">Reject</Button>
								</form>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<section>
			<h2>Everyone else</h2>
			{#if decided.length === 0}
				<p class="empty">No other accounts yet.</p>
			{:else}
				<ul class="list">
					{#each decided as profile (profile.id)}
						<li class="account">
							<span>{profile.display_name}</span>
							<span class="status"
								>{profile.status}{profile.role === 'admin' ? ' · admin' : ''}</span
							>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}
</div>

<style>
	.accounts-page {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
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
		margin-bottom: 0.5rem;
	}

	.list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.account {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		background: var(--card);
	}

	.actions {
		display: flex;
		gap: 0.5rem;
	}

	.status {
		font-size: 0.85rem;
		color: var(--muted-foreground);
		text-transform: capitalize;
	}

	.empty {
		color: var(--muted-foreground);
	}

	.error {
		color: var(--destructive);
	}
</style>
