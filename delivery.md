# Delivery log

## Current

- **Feature:** Phase 1 — Website view (`docs/specs/01-website-view/spec.md`)
- **Branch:** `feat/website-view`
- **Status:** built and verified locally (check, lint, unit + e2e all pass; checked visually at 375px)
- **Next action:** push branch and open PR; then spec Phase 2 (Calendar).

## Done

- **Phase 0 — Scaffold** (2026-09-22). SvelteKit + Svelte 5, strict TS, Tailwind v4,
  shadcn-svelte (hand-authored `components.json`; CLI requires an interactive
  preset), Vitest, Playwright, Netlify adapter, SBF brand theme. Commit `362d3a4`.

## Decisions

- 2026-09-23: Website view is its own `/website` route, linked from `/`.
- 2026-09-23: Loading message sits behind the iframe instead of using a `load` handler, which can miss a load that fires before hydration.
- 2026-09-23: Website view embeds sbf.church via iframe (framing verified), with a
  permanent "Open in browser" link-out as fallback.

## Open questions

- Notification delivery mechanism (masterplan) — needed before Phase 4/5 notifications.
- Calendar/messages integration mechanism — check per feature (Phases 2–3).
