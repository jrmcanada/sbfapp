<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';

	type Section = 'accounts' | 'events' | 'notifications';

	let { current }: { current: Section } = $props();

	const sections = [
		{ key: 'accounts', label: 'Accounts', href: '/admin/accounts' },
		{ key: 'events', label: 'Events', href: '/admin/events' },
		{ key: 'notifications', label: 'Notifications', href: '/admin/notifications' }
	] as const;
</script>

<header class="toolbar">
	<Button href={resolve('/')} variant="outline">Home</Button>
	<Button href={resolve('/admin')} variant="outline">Admin</Button>
	{#each sections.filter((s) => s.key !== current) as section (section.key)}
		<Button href={resolve(section.href)} variant="outline">{section.label}</Button>
	{/each}
</header>

<style>
	.toolbar {
		display: flex;
		gap: 0.5rem;
	}
</style>
