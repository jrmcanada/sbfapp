/**
 * Pure detection logic, kept separate from any browser API calls so it's
 * unit-testable without a DOM — see docs/specs/04b-push-notifications/spec.md.
 */

export function isIOS(userAgent: string, maxTouchPoints: number): boolean {
	if (/iPad|iPhone|iPod/.test(userAgent)) return true;
	// iPadOS 13+ reports its UA as "Macintosh" but still has touch support.
	return userAgent.includes('Macintosh') && maxTouchPoints > 1;
}

export function isStandalone(
	navigatorStandalone: boolean | undefined,
	matchesStandaloneMedia: boolean
): boolean {
	return navigatorStandalone === true || matchesStandaloneMedia;
}
