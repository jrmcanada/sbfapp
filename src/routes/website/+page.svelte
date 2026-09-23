<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';

	const SITE_URL = 'https://sbf.church/';
</script>

<svelte:head><title>Website · SBF</title></svelte:head>

<div class="website">
	<header class="toolbar">
		<Button href={resolve('/')} variant="ghost">Home</Button>
		<Button href={SITE_URL} target="_blank" rel="noopener noreferrer" variant="outline">
			Open in browser
		</Button>
	</header>

	<div class="frame">
		<!-- Sits behind the iframe; the site covers it once it paints. No load event
		     needed, which avoids missing one that fires before hydration. -->
		<p class="loading" aria-hidden="true">Loading sbf.church…</p>
		<iframe src={SITE_URL} title="Sudbury Bible Fellowship website"></iframe>
	</div>
</div>

<style>
	.website {
		display: flex;
		flex-direction: column;
		height: 100dvh;
	}

	.toolbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		border-bottom: 1px solid var(--border);
	}

	.frame {
		position: relative;
		flex: 1;
		min-height: 0;
	}

	.loading {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		color: var(--muted-foreground);
		z-index: 0;
	}

	iframe {
		position: relative;
		z-index: 1;
		display: block;
		width: 100%;
		height: 100%;
		border: 0;
	}
</style>
