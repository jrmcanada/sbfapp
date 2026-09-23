<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Account pending · SBF</title></svelte:head>

<div class="pending-page">
	{#if data.status === 'rejected'}
		<h1>Access not approved</h1>
		<p>Your request wasn't approved. Contact the church office if you think this is a mistake.</p>
	{:else}
		<h1>Awaiting approval</h1>
		<p>Your account is waiting for an admin to approve it. Check back soon.</p>
	{/if}
</div>

<style>
	.pending-page {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 1rem;
		padding: 2rem 1rem;
		max-width: 28rem;
		margin: 0 auto;
	}

	h1 {
		font-size: 1.5rem;
		font-weight: 600;
	}

	p {
		color: var(--muted-foreground);
	}
</style>
