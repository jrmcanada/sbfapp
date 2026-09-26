<script lang="ts">
	import { resolve } from '$app/paths';
	import { Bell, CalendarDays, Users } from 'lucide-svelte';
	import NavCard from '$lib/components/NavCard.svelte';
	import { Button } from '$lib/components/ui/button';
</script>

<svelte:head><title>Admin · SBF</title></svelte:head>

<div class="admin-page">
	<header class="toolbar">
		<Button href={resolve('/')} variant="ghost">Home</Button>
	</header>

	<h1>Admin</h1>

	<div class="cards">
		<NavCard
			icon={Users}
			label="Accounts"
			sub="Approve, manage and remove accounts"
			href={resolve('/admin/accounts')}
		/>
		<NavCard
			icon={CalendarDays}
			label="Events"
			sub="Upload calendar events"
			href={resolve('/admin/events')}
		/>
		<NavCard
			icon={Bell}
			label="Notifications"
			sub="Send a notification, see what's been sent"
			href={resolve('/admin/notifications')}
		/>
	</div>
</div>

<style>
	.admin-page {
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

	.cards {
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
	}
</style>
