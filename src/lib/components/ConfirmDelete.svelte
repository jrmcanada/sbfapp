<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';

	// Posts `id` to the page's `?/delete` action, but only after a second click.
	let { id }: { id: string } = $props();

	let confirming = $state(false);
</script>

{#if confirming}
	<form
		method="POST"
		action="?/delete"
		use:enhance={() =>
			async ({ update }) => {
				await update();
				confirming = false;
			}}
	>
		<input type="hidden" name="id" value={id} />
		<Button type="submit" size="sm" variant="destructive">Confirm delete</Button>
	</form>
	<Button size="sm" variant="ghost" onclick={() => (confirming = false)}>Cancel</Button>
{:else}
	<Button size="sm" variant="ghost" onclick={() => (confirming = true)}>Delete</Button>
{/if}
