<script lang="ts">
	import { resolve } from '$app/paths';
	import { Calendar, Globe, PlayCircle, Send } from 'lucide-svelte';
	import Logo from '$lib/components/Logo.svelte';
	import NavCard from '$lib/components/NavCard.svelte';
	import NotificationControl from '$lib/components/NotificationControl.svelte';
	import { Button } from '$lib/components/ui/button';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>SBF</title></svelte:head>

<main class="home">
	<header class="band">
		<div class="brand">
			<Logo variant="light" size={32} />
			<span class="word">SBF</span>
		</div>
		{#if data.signedIn}
			<div class="session">
				<span>{data.displayName}</span>
				<form class="signout" method="POST" action="/auth/signout">
					<Button type="submit" variant="ghost" size="sm">Sign out</Button>
				</form>
			</div>
		{/if}
	</header>

	<div class="heading">
		<h1>Welcome back</h1>
		<p>What's happening at Sudbury Bible Fellowship?</p>
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

	.band {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		background: var(--primary);
		color: var(--primary-foreground);
		padding: 1.1rem 1.1rem 1.3rem;
		margin-top: max(3.35rem, env(safe-area-inset-top, 0px));
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 0.55rem;
	}

	.word {
		font-family: var(--font-display);
		font-weight: 600;
		font-size: 1.33rem;
		line-height: 1;
		letter-spacing: 0.02em;
	}

	.session {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.85rem;
	}

	.session span {
		display: inline-flex;
		align-items: center;
		height: 1.75rem;
		line-height: 1;
	}

	.signout :global(button) {
		border-color: color-mix(in srgb, var(--primary-foreground) 35%, transparent);
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
