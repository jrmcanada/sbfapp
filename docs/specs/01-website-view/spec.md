# Spec — Website view (Phase 1)

Traces to `docs/masterplan.md` → Features §1, Build order Phase 1.

## Goal

Let a member view sbf.church inside the app without leaving it.

## Integration mechanism (decided)

Embed https://sbf.church/ in an `<iframe>`.

Feasibility checked 2026-09-23: the live site sends no `X-Frame-Options` or
`Content-Security-Policy` `frame-ancestors` header to a real browser, and it
rendered inside a cross-origin iframe in testing. Its Cloudflare bot challenge
page does send `X-Frame-Options: SAMEORIGIN`. A visitor who gets challenged
will see a blank or refused frame, which is why the link-out below is required.

## Scope

- New route `/website` showing sbf.church in a full-height iframe (fills the
  viewport below any app chrome, no double scrollbars on mobile).
- An always-visible "Open in browser" link to https://sbf.church/ that opens a
  new tab (`target="_blank"`, `rel="noopener noreferrer"`). This is the fallback
  for when the frame can't load. The app can't detect a failed cross-origin
  frame, so the link doesn't depend on detecting one.
- A link back to `/` (there's no nav shell yet, so the page needs its own way
  home).
- A loading message layered behind the iframe, so the site covers it once it
  paints. (A `load` handler can miss an event that fires before hydration.)
- The iframe has an accessible `title` ("Sudbury Bible Fellowship website").
- Home page (`/`) replaces the SvelteKit placeholder with a link to `/website`.
  Nothing else on the home page is in scope.
- No database, no server load function, no auth (auth lands in Phase 5).

## Out of scope

- App-wide navigation shell / tab bar (decide when Phase 2 adds a second
  feature route).
- Deep-linking into specific sbf.church pages, or syncing the iframe's URL with
  the app's.
- Removing `src/routes/demo` (separate cleanup).

## Acceptance criteria

1. Visiting `/website` shows sbf.church inside the page.
2. "Open in browser" opens https://sbf.church/ in a new tab.
3. The loading message is hidden once the site renders in the frame.
4. `/` links to `/website`.
5. Playwright e2e covers 1, 2 (attributes), and 4. Typecheck, lint and tests pass.

## Resolved questions

- 2026-09-23: The website lives on its own `/website` route, reached from `/`.
