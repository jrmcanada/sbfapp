# Delivery log

## Current

- **Feature:** none in flight — Phase 1 merged to `master`.
- **Next action:** write the Phase 2 (Calendar) spec.

## Done

- **Phase 0 — Scaffold** (2026-09-22). SvelteKit + Svelte 5, strict TS, Tailwind v4,
  shadcn-svelte (hand-authored `components.json`; CLI requires an interactive
  preset), Vitest, Playwright, Netlify adapter, SBF brand theme. Commit `362d3a4`.
- **Phase 1 — Website view** (2026-09-23). `/website` route iframing sbf.church,
  linked from `/`. Built on `feat/website-view`, re-verified independently
  (check, lint, unit + e2e all pass) and merged to `master` (fast-forward,
  no PR — no GitHub remote configured yet). Commit `5444f3f`.

## Decisions

- 2026-09-23: Website view is its own `/website` route, linked from `/`.
- 2026-09-23: Loading message sits behind the iframe instead of using a `load` handler, which can miss a load that fires before hydration.
- 2026-09-23: Website view embeds sbf.church via iframe (framing verified), with a
  permanent "Open in browser" link-out as fallback.
- 2026-09-23: Confirmed live (not just in theory) that sbf.church's Cloudflare
  bot-challenge blocks the iframe via `X-Frame-Options: SAMEORIGIN` on the
  challenge page — hit this on the very first real browser check, so it's a
  real, not rare, failure mode. Decided to accept it as-is per the spec's
  existing scope (no frame-failure detection); the always-visible "Open in
  browser" link is the intended escape hatch, not a fallback triggered by
  detecting failure.
- 2026-09-23: No GitHub remote yet — staying local (`git init`, commits on
  `master`, no push/PR) until asked to set one up.

## Open questions

- Notification delivery mechanism (masterplan) — needed before Phase 4/5 notifications.
- Calendar/messages integration mechanism — check per feature (Phases 2–3).
