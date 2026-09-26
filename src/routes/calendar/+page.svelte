<script lang="ts">
	import { resolve } from '$app/paths';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import { Button } from '$lib/components/ui/button';
	import { formatMonthParam, getMonthGrid, monthLabel, shiftMonth } from '$lib/calendar';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let selectedDate = $state<string | null>(null);

	$effect(() => {
		// Reset the selection whenever the visible month changes. The bare
		// reads below are intentional — they establish the effect's
		// reactive dependencies, not dead code.
		/* eslint-disable-next-line @typescript-eslint/no-unused-expressions */
		(data.year, data.month);
		selectedDate = null;
	});

	const grid = $derived(getMonthGrid(data.year, data.month, data.events));
	const label = $derived(monthLabel(data.year, data.month));
	const hasAnyEventThisMonth = $derived(
		grid.some((cell) => cell.inMonth && cell.events.length > 0)
	);
	const selectedCell = $derived(grid.find((cell) => cell.date === selectedDate) ?? null);

	const prevMonth = $derived(shiftMonth(data.year, data.month, -1));
	const nextMonth = $derived(shiftMonth(data.year, data.month, 1));

	const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

	function dayNumber(iso: string): number {
		return Number(iso.slice(8, 10));
	}
</script>

<svelte:head><title>Calendar · SBF</title></svelte:head>

<AppHeader signedIn={data.signedIn} displayName={data.displayName} />

<div class="calendar-page">
	<header class="toolbar">
		<Button href={resolve('/')} variant="ghost">Home</Button>
		<h1>{label}</h1>
		<nav class="nav">
			<Button
				href={`?month=${formatMonthParam(prevMonth.year, prevMonth.month)}`}
				variant="outline"
				size="sm">Prev</Button
			>
			<Button
				href={`?month=${formatMonthParam(nextMonth.year, nextMonth.month)}`}
				variant="outline"
				size="sm">Next</Button
			>
		</nav>
	</header>

	{#if data.loadError}
		<p class="error" role="alert">Couldn't load events: {data.loadError}</p>
	{:else}
		<div class="weekdays" aria-hidden="true">
			{#each weekdayLabels as label (label)}
				<span>{label}</span>
			{/each}
		</div>

		<div class="grid" role="grid" aria-label={label}>
			{#each grid as cell (cell.date)}
				<button
					type="button"
					class="day"
					class:out-of-month={!cell.inMonth}
					class:has-events={cell.events.length > 0}
					class:selected={selectedDate === cell.date}
					disabled={cell.events.length === 0}
					onclick={() => (selectedDate = cell.date)}
				>
					<span class="day-number">{dayNumber(cell.date)}</span>
					{#if cell.events.length > 0}
						<ul class="event-titles">
							{#each cell.events as event (event.id)}
								<li>{event.title}</li>
							{/each}
						</ul>
					{/if}
				</button>
			{/each}
		</div>

		{#if !hasAnyEventThisMonth}
			<p class="empty">No events this month.</p>
		{/if}

		{#if selectedCell}
			<section class="details" aria-live="polite">
				<h2>{selectedCell.date}</h2>
				{#each selectedCell.events as event (event.id)}
					<article class="event">
						<h3>{event.title}</h3>
						{#if event.description}
							<p>{event.description}</p>
						{/if}
					</article>
				{/each}
			</section>
		{/if}
	{/if}
</div>

<style>
	.calendar-page {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1rem;
		max-width: 48rem;
		margin: 0 auto;
	}

	.toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.toolbar h1 {
		font-size: 1.125rem;
		font-weight: 600;
	}

	.nav {
		display: flex;
		gap: 0.5rem;
	}

	.weekdays {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		text-align: center;
		font-size: 0.75rem;
		color: var(--muted-foreground);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 2px;
	}

	.day {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 0.25rem;
		min-width: 0;
		min-height: 4rem;
		padding: 0.25rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--card);
		color: var(--card-foreground);
		text-align: left;
		font: inherit;
		cursor: default;
	}

	.day.out-of-month {
		opacity: 0.4;
	}

	.day.has-events {
		cursor: pointer;
	}

	.day.selected {
		border-color: var(--ring);
		outline: 2px solid var(--ring);
		outline-offset: -2px;
	}

	.day-number {
		font-size: 0.8rem;
		color: var(--muted-foreground);
	}

	.event-titles {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
	}

	.event-titles li {
		font-size: 0.7rem;
		background: var(--accent);
		color: var(--accent-foreground);
		border-radius: var(--radius-sm);
		padding: 0 0.25rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.empty {
		color: var(--muted-foreground);
	}

	.error {
		color: var(--destructive);
	}

	.details {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		border-top: 1px solid var(--border);
		padding-top: 1rem;
	}

	.details h2 {
		font-size: 0.9rem;
		color: var(--muted-foreground);
	}

	.event h3 {
		font-size: 1rem;
		font-weight: 600;
	}
</style>
