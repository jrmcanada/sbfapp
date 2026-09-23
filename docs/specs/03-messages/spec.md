# Spec — Messages (Phase 3)

Traces to `docs/masterplan.md` → Features §3, Build order Phase 3.

## Goal

Let a member play recent church messages without leaving the app.

## Feasibility (checked 2026-09-23)

sbf.church/messages/ is a static, server-rendered archive (641 messages at
time of writing). Unlike Calendar, its data is genuinely good:

- Every row (`<tr class="messages--row">`) carries structured attributes:
  `data-date` (ISO `YYYY-MM-DD`), `data-title`, `data-speaker`, `data-tags`
  (pipe-delimited).
- Every row links to a direct MP3 URL (`messages.sbf.church/published/*.mp3`)
  with no Cloudflare challenge, `Accept-Ranges: bytes` (proper seeking), and
  no CORS restriction relevant to `<audio>` playback (playback doesn't need
  CORS the way `fetch()` would).
- No RSS/podcast feed exists (checked — every guessed path returns the same
  Cloudflare-protected catch-all, same as Phase 2's finding).

## Integration mechanism (decided, revised 2026-09-23)

**Client-side** fetch of `https://sbf.church/messages/` (`+page.ts` with
`ssr = false`), parsed for the first 10 rows (the site lists newest-first
already). No database — pulled live on every visit, same shape as Phase 1's
website view. No re-hosting: the `<audio>` element's `src` points straight
at sbf.church's own MP3 URL.

Originally planned as a server-side fetch, like Phase 1/2. Reworked after
finding sbf.church's Cloudflare bot management reliably (not
intermittently — tested repeatedly) blocks Node's `fetch()` and even a
genuine headless-browser request, regardless of headers, with no way to
retry around it — this would have meant the feature simply never working
once deployed, not a rare edge case. sbf.church sends
`Access-Control-Allow-Origin: *`, explicitly permitting cross-origin
browser reads, so the fetch runs in the visitor's own browser instead,
where it isn't automated traffic. Verified working end-to-end against the
live site (real message titles rendered), not just in theory.

**Accepted risk** (recorded in masterplan Decisions): this is fragile to
sbf.church changing its message-list template. Unlike Calendar, there's no
admin fallback — a site redesign means a code fix here, not a re-upload.

## Scope

- New route `/messages`: the 10 most recent messages, each showing title
  (linking to that message's own page on sbf.church, e.g.
  `/messages/2026-07-05-am-tony-martin-.../`), speaker, date, and a native
  `<audio controls preload="none">` player pointed at that message's MP3
  URL. `preload="none"` so visiting the page doesn't kick off 10
  simultaneous downloads. Some dates have more than one message (AM/PM
  services) — the parser must key each message by its unique page URL, not
  by title or date.
- A permanent link to `https://sbf.church/messages/` for anyone who wants
  the full archive, search, or tags — none of that is rebuilt in-app.
- Parsing lives in a pure, unit-testable function (`$lib/messages.ts` — not
  `$lib/server/`, since it must run client-side; same shape as Phase 2's
  `events.ts` parser) so malformed/unexpected HTML is handled deliberately,
  not by accident.
- Fallback state: if the fetch fails or parsing finds zero messages (site
  down, blocked, or redesigned), show a plain message plus the link to
  sbf.church/messages/ directly — same philosophy as Phase 1's "Open in
  browser" fallback, not a blank page or a stack trace.
- Home page (`/`) also links to `/messages`.
- No auth, no database, no admin involvement — matches Phase 1, not Phase 2.

## Out of scope

- Search, filtering, or tags UI (the real site already has this).
- Pagination past the initial 10.
- Coordinating playback across multiple `<audio>` elements (e.g. pausing
  others when one starts) — each player behaves independently for now.
- Any caching/revalidation layer beyond SvelteKit's normal per-request load.

## Acceptance criteria

1. `/messages` shows the 10 most recent messages with title, speaker, and
   date.
2. Each message has a working `<audio>` element whose `src` is that
   message's direct MP3 URL.
3. A link to `https://sbf.church/messages/` is present.
4. If parsing yields zero messages, a fallback message and the link-out
   appear instead of a blank page.
5. `/` links to `/messages`.
6. `parseMessagesHtml` has unit tests covering well-formed input and
   malformed/empty input (returns `[]`, doesn't throw). Playwright e2e
   covers 1, 2, 3, 4, 5 against **mocked** responses (`page.route()`) —
   unlike server-side fetches, a client-side fetch is a genuine
   browser-made request Playwright can intercept, so these tests are
   deterministic and don't depend on live content or sbf.church's
   Cloudflare mood. Typecheck, lint, and tests pass.

## Resolved questions

- 2026-09-23: Messages are scraped client-side from sbf.church/messages
  (revised from server-side — see Integration mechanism), not iframed
  (same Cloudflare risk as Phase 1) and not admin-entered (the site's own
  data is good enough, unlike Calendar).
- 2026-09-23: Shows the 10 most recent messages; the full archive stays on
  sbf.church's own site via a link-out.
