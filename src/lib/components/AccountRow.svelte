<script lang="ts">
	import { enhance } from '$app/forms';
	import type { Account } from '$lib/accounts';
	import ConfirmDelete from '$lib/components/ConfirmDelete.svelte';
	import { Button } from '$lib/components/ui/button';
	import { formatDate } from '$lib/format';

	let { account, isSelf }: { account: Account; isSelf: boolean } = $props();

	const notificationsText = $derived(
		account.deviceCount === 0
			? 'Notifications off'
			: `Notifications on · ${account.deviceCount} device${account.deviceCount === 1 ? '' : 's'}`
	);
</script>

<li class="account">
	<div class="details">
		<span class="name">{account.display_name}{isSelf ? ' (you)' : ''}</span>
		<span class="meta">{account.email ?? 'No email on file'}</span>
		<span class="meta">Joined {formatDate(account.created_at)} · {notificationsText}</span>
	</div>

	<div class="actions">
		{#if account.status === 'pending'}
			<form method="POST" action="?/approve" use:enhance>
				<input type="hidden" name="id" value={account.id} />
				<Button type="submit" size="sm">Approve</Button>
			</form>
			<form method="POST" action="?/reject" use:enhance>
				<input type="hidden" name="id" value={account.id} />
				<Button type="submit" size="sm" variant="destructive">Reject</Button>
			</form>
		{:else if account.status === 'approved' && !isSelf}
			<form method="POST" action="?/setRole" use:enhance>
				<input type="hidden" name="id" value={account.id} />
				<input type="hidden" name="role" value={account.role === 'admin' ? 'member' : 'admin'} />
				<Button type="submit" size="sm" variant="outline">
					{account.role === 'admin' ? 'Make Regular' : 'Make Admin'}
				</Button>
			</form>
		{/if}

		{#if !isSelf}
			<ConfirmDelete id={account.id} />
		{/if}
	</div>
</li>

<style>
	.account {
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

	.name {
		font-weight: 600;
	}

	.meta {
		font-size: 0.8rem;
		color: var(--muted-foreground);
		overflow-wrap: anywhere;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
</style>
