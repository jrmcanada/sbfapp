<script lang="ts">
	import { cn } from '$lib/utils';

	type Props = {
		// lucide-svelte ships legacy SvelteComponentTyped classes, which aren't
		// structurally assignable to Svelte 5's Component type regardless of
		// generics — any is the pragmatic escape from a third-party typing gap.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		icon: any;
		label: string;
		sub: string;
		href?: string;
		onclick?: () => void;
		active?: boolean;
		disabled?: boolean;
	};

	let { icon: Icon, label, sub, href, onclick, active = false, disabled = false }: Props = $props();
</script>

{#snippet content()}
	<span class={cn('icon-wrap', active && 'active')}>
		<Icon size={20} strokeWidth={1.8} />
	</span>
	<span class="text">
		<span class="label">{label}</span>
		<span class="sub">{sub}</span>
	</span>
	<span class="arrow" aria-hidden="true">›</span>
{/snippet}

{#if href}
	<!-- href always points within this app -->
	<!-- eslint-disable svelte/no-navigation-without-resolve -->
	<a {href} class="card">
		{@render content()}
	</a>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
{:else}
	<button type="button" class="card" {onclick} {disabled}>
		{@render content()}
	</button>
{/if}

<style>
	.card {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		background: var(--card);
		color: var(--card-foreground);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		padding: 0.8rem 0.9rem;
		text-align: left;
		font: inherit;
		box-shadow: 0 2px 8px -4px rgba(33, 0, 92, 0.12);
		transition: transform 0.1s ease;
	}

	.card:hover {
		background: var(--secondary);
	}

	.card:active:not(:disabled) {
		transform: translateY(1px);
	}

	.card:disabled {
		opacity: 0.6;
		cursor: default;
	}

	.icon-wrap {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: var(--radius-md);
		background: var(--secondary);
		color: var(--primary);
		flex-shrink: 0;
	}

	.icon-wrap.active {
		background: var(--accent);
		color: var(--accent-foreground);
	}

	.text {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.label {
		font-weight: 600;
		font-size: 0.9rem;
	}

	.sub {
		font-size: 0.78rem;
		color: var(--muted-foreground);
	}

	.arrow {
		margin-left: auto;
		color: var(--muted-foreground);
		font-size: 1.1rem;
	}
</style>
