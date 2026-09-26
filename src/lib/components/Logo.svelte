<script lang="ts">
	type Props = {
		/** 'dark' for a light background, 'light' for a dark background (e.g. the header band). */
		variant?: 'dark' | 'light';
		size?: number;
		class?: string;
	};

	let { variant = 'dark', size = 22, class: className = '' }: Props = $props();

	const fill = $derived(variant === 'light' ? 'var(--primary-foreground)' : 'var(--primary)');
</script>

<!-- SBF's own building mark, from sbf.church's site header (assets/img/building-xs.svg). -->
<svg
	class={className}
	width={size}
	height={(size * 42.4) / 91.2}
	viewBox="0 0 91.2 42.4"
	{fill}
	aria-hidden="true"
>
	<rect x="16.3" y="39.1" width="3.3" height="3.3" />
	<rect x="35.8" y="39.1" width="3.3" height="3.3" />
	<rect x="26.1" y="39.1" width="3.3" height="3.3" />
	<rect x="45.6" y="39.1" width="3.3" height="3.3" />
	<rect x="39.1" y="29.3" width="6.5" height="9.8" />
	<path
		d="M88,24.4V9.8H52L32.6,0L0,16.4v3.1h3.3v19.5v3.3h3.3h3.3v-3.3H6.5v-9.8h3.3v-6.5H6.5v-3.3h3.3v3.3h6.5v6.5H9.8v9.8h6.5v-9.8h3.3v-6.5h-3.3v-3.3h3.3v3.3h6.5v6.5h-6.5v9.8h6.5v-9.8h3.3v-6.5h-3.3v-3.3h3.3v3.3h6.5v6.5h-6.5v9.8h6.5v-9.8h3.3v-6.5h-3.3v-3.3h3.3v3.3h6.5v6.5h3.3v-6.5h-3.3v-3.3h3.3v3.3h6.5v-3.3h3.3v3.3l0,0h-3.3v1.6l-3.3,1.6v3.3h-3.3v9.8h6.5v3.3h3.3v-13h3.3v9.8v0.4v2.9h19.5v-2.2h0V29.3h3.2v13H88v-13h3.3v-3.3L88,24.4z M7.5,16.3L32.6,3.6l25.1,12.6H7.5z M78.2,39.1H75v-6.5h-6.5v6.5h-3.3v-9.8h13.1V39.1z M59.4,26.1l12.3-6.1l12.3,6.1H59.4z"
	/>
</svg>
