export type ProfileStatus = 'pending' | 'approved' | 'rejected';

export type GateInput = {
	hasSession: boolean;
	profileStatus: ProfileStatus | null;
	isAdmin: boolean;
	routeId: string;
};

/**
 * Pure gating decision, kept separate from hooks.server.ts so the full rule
 * set is unit-testable without a real session or database — see
 * docs/specs/04a-accounts-auth/spec.md's Testing approach.
 */
export function decideRedirect({
	hasSession,
	profileStatus,
	isAdmin,
	routeId
}: GateInput): string | null {
	if (routeId === '/auth/callback') return null;

	if (!hasSession) {
		return routeId === '/login' ? null : '/login';
	}

	if (profileStatus !== 'approved') {
		return routeId === '/pending' ? null : '/pending';
	}

	if (routeId.startsWith('/admin') && !isAdmin) {
		return '/';
	}

	if (routeId === '/login' || routeId === '/pending') {
		return '/';
	}

	return null;
}
