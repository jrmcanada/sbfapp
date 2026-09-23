<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { Button } from '$lib/components/ui/button';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

{#if data.signedIn}
	<div class="session-bar">
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
		padding: 0.5rem 1rem;
		font-size: 0.85rem;
		color: var(--muted-foreground);
		border-bottom: 1px solid var(--border);
	}
</style>
