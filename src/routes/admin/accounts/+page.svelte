<script lang="ts">
	import AccountRow from '$lib/components/AccountRow.svelte';
	import AdminNav from '$lib/components/AdminNav.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const sections = $derived([
		{ title: 'Pending', empty: 'No accounts waiting for approval.', accounts: data.groups.pending },
		{ title: 'Admins', empty: 'No admins.', accounts: data.groups.admins },
		{ title: 'Regular', empty: 'No regular accounts yet.', accounts: data.groups.regular },
		{ title: 'Rejected', empty: 'No rejected accounts.', accounts: data.groups.rejected }
	]);
</script>

<svelte:head><title>Accounts · SBF</title></svelte:head>

<div class="accounts-page">
	<AdminNav current="accounts" />

	<h1>Accounts</h1>

	{#if data.loadError}
		<p class="error" role="alert">Couldn't load accounts: {data.loadError}</p>
	{:else}
		{#if form?.error}
			<p class="error" role="alert">{form.error}</p>
		{/if}

		{#each sections as section (section.title)}
			<section>
				<h2>{section.title} ({section.accounts.length})</h2>
				{#if section.accounts.length === 0}
					<p class="empty">{section.empty}</p>
				{:else}
					<ul class="list">
						{#each section.accounts as account (account.id)}
							<AccountRow {account} isSelf={account.id === data.currentUserId} />
						{/each}
					</ul>
				{/if}
			</section>
		{/each}
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

	.empty {
		color: var(--muted-foreground);
	}

	.error {
		color: var(--destructive);
	}
</style>
