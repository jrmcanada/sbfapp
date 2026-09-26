<script lang="ts">
	import { resolve } from '$app/paths';
	import { Calendar, Globe, PlayCircle } from 'lucide-svelte';
	import Logo from '$lib/components/Logo.svelte';
	import NavCard from '$lib/components/NavCard.svelte';
	import NotificationControl from '$lib/components/NotificationControl.svelte';
</script>

<svelte:head><title>SBF</title></svelte:head>

<main class="home">
	<header class="band">
		<Logo variant="light" size={32} />
		<span class="word">SBF</span>
	</header>

	<div class="heading">
		<h1>Welcome back</h1>
		<p>Everything for Sudbury Bible Fellowship, in one place.</p>
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
		gap: 0.55rem;
		background: var(--primary);
		padding: 1.1rem 1.1rem 1.3rem;
	}

	.word {
		font-family: var(--font-display);
		color: var(--primary-foreground);
		font-weight: 600;
		font-size: 1.33rem;
		line-height: 1;
		letter-spacing: 0.02em;
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
