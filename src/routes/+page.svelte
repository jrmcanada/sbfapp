<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
</script>

<svelte:head><title>SBF</title></svelte:head>

<main class="home">
	<h1>Sudbury Bible Fellowship</h1>
	<Button href={resolve('/website')}>View the website</Button>
	<Button href={resolve('/calendar')}>View the calendar</Button>
	<Button href={resolve('/messages')}>Listen to messages</Button>
</main>

<style>
	.home {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 1rem;
		padding: 2rem 1rem;
	}

	h1 {
		font-size: 1.5rem;
		font-weight: 600;
	}
</style>
