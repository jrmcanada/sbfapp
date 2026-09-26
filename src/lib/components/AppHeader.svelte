<script lang="ts">
	import Logo from '$lib/components/Logo.svelte';
	import { Button } from '$lib/components/ui/button';

	let { signedIn, displayName }: { signedIn: boolean; displayName: string | null } = $props();
</script>

<header class="band">
	<div class="brand">
		<Logo variant="light" size={32} />
		<span class="word">SBF</span>
	</div>
	{#if signedIn}
		<div class="session">
			<span>{displayName}</span>
			<form class="signout" method="POST" action="/auth/signout">
				<Button type="submit" variant="ghost" size="sm">Sign out</Button>
			</form>
		</div>
	{/if}
</header>

<style>
	.band {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		width: 100%;
		max-width: 32rem;
		background: var(--primary);
		color: var(--primary-foreground);
		padding: 1.1rem 1.1rem 1.3rem;
		/* A plain strip above the band, so iOS's translucent status bar blurs
		   background instead of the band's edge. The floor is the device's
		   actual safe-area inset, for larger notches / Dynamic Island. */
		margin: max(3.35rem, env(safe-area-inset-top, 0px)) auto 0;
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
</style>
