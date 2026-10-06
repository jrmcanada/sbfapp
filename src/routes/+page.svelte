<script lang="ts">
	import { resolve } from '$app/paths';
	import { Calendar, Globe, PlayCircle, Send, Shield } from 'lucide-svelte';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import NavCard from '$lib/components/NavCard.svelte';
	import NotificationControl from '$lib/components/NotificationControl.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>SBF</title></svelte:head>

<main class="home">
	<AppHeader signedIn={data.signedIn} displayName={data.displayName} />

	<div class="heading">
		<h1>Welcome back</h1>
		<p>Yo, Mike!</p>
	</div>

	<div class="cards">
		<NavCard icon={Globe} label="Website" sub="Browse sbf.church" href={resolve('/website')} />
		<NavCard
			icon={Calendar}
			label="Calendar"
			sub="See what's coming up"
			href={resolve('/calendar')}
		/>
		<NavCard
			icon={PlayCircle}
			label="Messages"
			sub="Listen to recent messages"
			href={resolve('/messages')}
		/>
		<NotificationControl />
		{#if data.isAdmin}
			<NavCard
				icon={Shield}
				label="Admin"
				sub="Accounts, events and notifications"
				href={resolve('/admin')}
			/>
			<NavCard
				icon={Send}
				label="Send Notification"
				sub="Write a message for everyone"
				href={resolve('/admin/notifications')}
			/>
		{/if}
	</div>
</main>

<style>
	.home {
		display: flex;
		flex-direction: column;
		max-width: 32rem;
		margin: 0 auto;
	}

	.heading {
		padding: 1.1rem 1.1rem 0.2rem;
	}

	.heading h1 {
		font-size: 1.3rem;
		margin: 0 0 0.2rem;
	}

	.heading p {
		margin: 0;
		font-size: 0.85rem;
		color: var(--muted-foreground);
	}

	.cards {
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
		padding: 1rem 1.1rem 1.5rem;
	}
</style>
