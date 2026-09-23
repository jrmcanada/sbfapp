<script lang="ts">
	import { supabase } from '$lib/supabase/client';
	import { Button } from '$lib/components/ui/button';

	let signingIn = $state(false);

	async function signIn() {
		signingIn = true;
		await supabase.auth.signInWithOAuth({
			provider: 'google',
			options: { redirectTo: `${window.location.origin}/auth/callback` }
		});
	}
</script>

<svelte:head><title>Sign in · SBF</title></svelte:head>

<div class="login-page">
	<h1>Sudbury Bible Fellowship</h1>
	<p>
		Sign in with your Google account to continue. New accounts need admin approval before they get
		access.
	</p>
	<Button onclick={signIn} disabled={signingIn}>
		{signingIn ? 'Redirecting…' : 'Sign in with Google'}
	</Button>
</div>

<style>
	.login-page {
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
