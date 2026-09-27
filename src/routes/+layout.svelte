<script lang="ts">
	import './layout.css';
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import { Button } from '$lib/components/ui/button';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	// These pages render their own AppHeader (with the name and Sign out), so
	// they skip the plain session bar every other page gets.
	const ownsHeader = [
		'/',
		'/calendar',
		'/messages',
		'/admin',
		'/admin/accounts',
		'/admin/events',
		'/admin/notifications'
	];

	// /website keeps the bar's height (so its own Home/Open in browser row
	// doesn't shift up into the area iOS blurs during the pull-down bounce)
	// but without the name/Sign out — the iframe fills the rest of the
	// screen, and Sign out is one tap away on Home.
	const blankSessionBar = ['/website'];
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

{#if data.signedIn && !ownsHeader.includes(page.route.id ?? '')}
	<div class="session-bar" class:blank={blankSessionBar.includes(page.route.id ?? '')}>
		<span>{data.displayName}</span>
		<form method="POST" action="/auth/signout">
			<Button type="submit" variant="ghost" size="sm">Sign out</Button>
		</form>
	</div>
{/if}

{@render children()}

<style>
	.session-bar {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: calc(0.5rem + env(safe-area-inset-top, 0px)) 1rem 0.5rem;
		font-size: 0.85rem;
		color: var(--muted-foreground);
		border-bottom: 1px solid var(--border);
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	.session-bar.blank {
		/* Reserves the same box (height, safe-area padding) without painting
		   or exposing its content — not display:none, which would collapse
		   the space and let the page below it butt up against the notch. */
		visibility: hidden;
	}

	.session-bar span {
		/* Matches the Sign out button's own fixed height (size="sm" = h-7)
		   and internal centering, so the two sit on the same visual baseline
		   instead of the button's fixed box and the span's natural line
		   height landing a pixel or two apart. */
		display: inline-flex;
		align-items: center;
		height: 1.75rem;
		line-height: 1;
	}
</style>
