# UrSpace — Changelog

Newest first. Each entry records the date, the change, affected files, the
reason, the commit reference, tests performed and deployment status.
"Not recorded" means no evidence exists in the repository or in the verification
sources available at the time of writing.

---

## 2026-11-27 — Provider-agnostic REST API implemented; app migrated

**Change:** all application data now flows through `/api/v1` → `lib/domain` →
`lib/ports` → `lib/providers/supabase`. Server Components use the same domain
in-process; client forms use typed HTTP adapters. 25 route handlers cover health,
session, notes, profile/avatar/password, public settings and administration.

**Login is untouched by explicit constraint.** Signup, password login, logout,
password recovery and Google/GitHub OAuth remain in `app/auth/actions.ts`,
`components/social-auth-buttons.tsx`, `/auth/callback`, `/auth/confirm` and
`proxy.ts`. The API only reads the existing session; there is no login endpoint.

**Data-access changes**
- Added `lib/contracts`, `lib/ports`, `lib/domain`, `lib/api`, `lib/api-client`
  and `lib/providers/supabase`.
- Removed note/account/admin Server Actions and `lib/admin.ts`; `lib/notes.ts`
  keeps only `summarizeNotes`.
- Supabase access uses explicit columns, bounded pagination (max 100) and
  provider-error translation. Service role is used only for account creation.
- Public settings use a 30-second per-instance cache with immediate invalidation
  after an owner update.

**Verification**
- `npx tsc --noEmit`, `npm run lint`, `npm run build` pass.
- `npm test`: **74/74 pass across 10 files**.
- Live local: health and public settings `200`; signed-out and invalid-bearer
  requests `401` with the error envelope; unknown route `404`.
- Browser: `/dashboard` redirects to `/login`; Google and GitHub buttons reach
  the providers with `redirect_to=/auth/callback`.
- Public pages `/`, `/login`, `/signup`, `/forgot-password`, `/reset-password`,
  `/terms` return `200`.

**Measured load-shape evidence**
- Settings cache test: three reads produce **one** provider query; invalidation
  causes exactly one new query.
- Notes list fetches one page with explicit columns; it runs a count only when
  the page size cannot prove the total, and a summary query only when needed.
- No timing benchmark was run; no speedup percentage is claimed.

**Not verified / limitations**
- Authenticated Notes CRUD, profile writes, admin role policies and two-account
  isolation need a test account.
- Account provisioning needs `SUPABASE_SERVICE_ROLE_KEY`, absent locally and on
  Vercel.
- No deployment of this change yet.

**Commit/deploy:** see the final implementation log entry; deployment is reported
separately and is not implied by this entry.

## 2026-11-26 — Phase 4 design approved; Phase 1 scope fixed

**Change:** documentation only. The revised app-wide API architecture was
approved with amendments, and the Phase 1 file/verification plan was recorded.
No application code was written.

**Approved decisions**
- App-wide architecture; Notes is the first implementation module.
- Domain-owned authorization with RLS retained as an additional layer.
- Server Components use an in-process client; no self-HTTP.
- Server Actions are **evaluated individually** in Phase 6 — redundant ones are
  removed, legitimate ones preserved (amends the earlier blanket removal).
- The existing Supabase session cookie format is kept; no custom session system
  and no forced re-authentication.
- Google and GitHub OAuth must keep working in every phase.
- No schema migration without separate approval; phases stay reversible.

**Phase 1 scope recorded** (`API_MIGRATION.md` §4.1): contracts, session/profile
ports, Supabase adapters, HTTP kit, shared server/browser clients, session-path
rewiring in `lib/auth.ts` and `proxy.ts`, and unit tests. No product endpoints,
no page/action changes, no notes/settings/admin adapters, no OAuth change.

**Files updated**
- `docs/API_DESIGN.md` — approval record, amended decisions, revised roadmap
  exit criteria.
- `docs/API_MIGRATION.md` — expanded Phase 1 file list, tests, non-goals and
  rollback; Phase 6 Server Action/bearer wording amended.
- `docs/IMPLEMENTATION_PLAN.md`, `docs/TESTING_CHECKLIST.md` — status and
  Phase 1 checks.

**Tests performed**
- None applicable: no code changed. Existing `tsc`/lint/Vitest/build results
  from `b1315d1` still apply. Phase 1 checks are recorded as `[ ]`.

**Deployment status:** unchanged. Production remains
`https://urspace-seven.vercel.app` at `b1315d1`.

---

## 2026-11-26 — Phase 4 revised: app-wide API-driven architecture and migration audit

**Change:** documentation only. No route handler, Server Action, database
object, policy, environment variable or deployment was modified.

**Files added**
- `docs/API_MIGRATION.md` — every Supabase import and operation (14 files,
  20 Server Actions, table-by-table inventory), the module coverage matrix, the
  phased migration (7 phases), risks, boundary enforcement and the
  provider-swap playbook.

**Files rewritten**
- `docs/API_DESIGN.md` — replaced the notes-only design with the app-wide,
  provider-agnostic architecture: layering, enforceable dependency rule,
  dual transport (browser HTTP / RSC in-process), contract conventions, endpoint
  catalog for every module, domain-owned authorization, ports and adapters, and
  the revised roadmap.

**Files updated**
- `docs/POSTMAN.md` — cookie-first authentication, the transitional bearer
  bridge, per-module folder plan.
- `docs/IMPLEMENTATION_PLAN.md` — Phase 4 rewritten as a 7-phase programme with
  app-wide scope.
- `docs/ARCHITECTURE.md` §11, `docs/PROJECT_OVERVIEW.md`,
  `docs/TESTING_CHECKLIST.md` §12, `README.md` — status, links and planned
  module checks.

**Reason:** the goal is not an API for Notes alone. UrSpace should depend on its
own backend contract for all modules, keep Supabase-specific logic behind
adapters, and be able to replace the provider without rewriting the frontend.
The notes-only design could not deliver that: it left auth, profile, admin and
public settings on direct SDK access, and left the browser importing Supabase
for OAuth.

**Audit findings recorded**
- 14 files import Supabase; the only browser-side call is OAuth in
  `components/social-auth-buttons.tsx`; avatar uploads already go through a
  Server Action.
- Public components (`PlatformNotice`, `SocialSignupOptions`) import the admin
  data module for platform settings.
- `lib/admin.ts` performs no role checks itself; admin pages rely on the layout
  guard plus RLS.
- Audit coverage is inconsistent: tutor note CRUD is not audited, admin edits
  are.
- `avatar_url` stores an absolute Supabase URL, and `NEXT_PUBLIC_SUPABASE_*`
  exposes the provider in the bundle.

**Decisions recorded**
- Domain-owned authorization with RLS retained as defence-in-depth (required for
  portability).
- Browser → `/api/v1`; Server Components → the same domain in-process, no
  self-HTTP.
- Provider ports + Supabase adapters are the only Supabase import site.
- Migration order: Notes → Identity → Public → Admin → Decommission → optional
  provider-swap readiness.
- No schema, feature or copy changes.

**Tests performed**
- Documentation links verified; Postman collection still parses as v2.1 JSON.
- No application file changed, so `tsc`, lint, Vitest and build results from
  `b1315d1` remain unchanged.

**Not verified**
- No API endpoint exists, so no request was executed. The migration phases are
  unstarted and every API check remains unchecked in `TESTING_CHECKLIST.md` §12.

**Deployment status:** unchanged. Production remains
`https://urspace-seven.vercel.app` at `b1315d1`; this commit is documentation
only.

---

## 2026-11-26 — Phase 4: API architecture, endpoint specification and Postman preparation

**Change:** documentation and test tooling only. No route handler, Server Action,
database object, policy, environment variable or deployment was modified.

**Files added**
- `docs/API_DESIGN.md` — audit of the current data flow, the proposed
  `/api/v1` Notes REST contract, security model, error taxonomy, roadmap
  (Stages 1–6), and open questions for review.
- `docs/POSTMAN.md` — import steps, variables, authentication setup, example
  requests/responses, expected status codes and the Stage 3/5 test matrix.
- `docs/postman/urspace-api.postman_collection.json` — Postman v2.1 collection
  with Auth, Notes and Negative-test folders; targets the specified endpoints
  and returns 404 until Stage 2 is implemented.

**Files updated**
- `docs/IMPLEMENTATION_PLAN.md` — Phase 4 section replaced with the design
  summary, task status and "awaiting approval" state.
- `docs/ARCHITECTURE.md` — corrected the browser→Supabase claim (avatar uploads
  are server-side actions; the browser only starts OAuth) and added the planned
  API layer section.
- `docs/PROJECT_OVERVIEW.md`, `docs/TESTING_CHECKLIST.md`, `README.md` — status
  and documentation links.

**Reason:** Phase 4 begins with an audit and an approved contract. The existing
app has no API layer: reads happen in Server Components through `lib/notes.ts`
and `lib/admin.ts`, writes happen in Server Actions, and the only route handlers
are `/auth/callback` and `/auth/confirm`. Building endpoints before agreeing on
authentication, ownership semantics and error shape would risk exposing the
staff-visible RLS surface through a personal endpoint.

**Decisions recorded**
- `/api/v1/notes` is always the authenticated caller's own collection; staff
  oversight is deferred to a separate staff namespace.
- Two credentials, one authorization model: cookie session for the browser and a
  validated Supabase bearer token for Postman/scripts; no service-role key.
- One shared notes service so handlers and actions cannot drift.
- Page-based pagination consistent with `lib/admin.ts`; cursor pagination
  deferred.
- No database changes.

**Tests performed**
- `node -e` JSON parse of the Postman collection — valid (Postman v2.1 schema).
- Documentation reviewed against the code paths it cites; no application files
  changed, so `tsc`, lint and Vitest results are unchanged from `b1315d1`.

**Not verified**
- No endpoint exists, so no request in the collection has been executed. No
  Postman run, no live API response and no authenticated API test occurred.

**Deployment status:** unchanged. Production remains
`https://urspace-seven.vercel.app` at `b1315d1`; this commit is documentation
only.

---

## 2026-11-26 — Phase 3 revision: larger editor, Notes options, top-bar menu

**Change:** UI only. The note editor now uses most of the viewport, the wallpaper
control moved out of the top bar into a Notes options menu, and the top bar was
reduced to the identity pill plus a settings gear that opens the existing
navigation, theme and logout controls.

**Files changed**
- `components/app-header.tsx` — client component: brand, identity pill
  (avatar + display name, visible on every breakpoint) and a gear button that
  opens a dropdown with the nav links, theme toggle and logout. The standalone
  wallpaper button was removed.
- `components/nav-links.tsx` — added a `layout="menu"` variant for the dropdown;
  the existing inline row layout is unchanged.
- `components/note-options-menu.tsx` (new) — Notes options dropdown in the notes
  section, containing the writing-area wallpaper entry and its current value.
- `app/background-settings.tsx` — `useNoteEditorWallpaper()` also exposes
  `openSettings()`; the backdrop relies on the themed scrim instead of a
  per-image inline opacity.
- `app/(tutor)/dashboard/notebook.tsx`, `dashboard/page.tsx` — the editor card is
  full width until `xl`, where the notes list becomes a 24rem side column; reduced
  card padding and heading rhythm; page container widened to `max-w-7xl`.
- `components/note-editor-form.tsx`, `components/app-shell.tsx` — tighter
  vertical rhythm around the editor.
- `app/(account)/settings/page.tsx` — section retitled "Notes".
- `app/globals.css` — the editor shell is now a positioned flex column; the
  wallpaper layer is absolutely positioned with `object-fit: cover` inside it;
  larger responsive writing height (up to `clamp(20rem, 46vh, 34rem)` at `lg`)
  with no max-height cap; theme-aware `--wallpaper-wash` dimmer; header menu and
  Notes options styles.

**Reason:** the previous Phase 3 pass left the composer in a small half-width
column, kept a separate wallpaper button in the header and positioned the photo
without a sized container. This revision makes the writing area the focus,
contextualises the wallpaper under Notes, and guarantees the photo covers the
editor box at every size.

**Behaviour changes**
- The editor is substantially wider (full width below `xl`, the dominant column
  above it) and taller, with less surrounding padding.
- Wallpaper is chosen from Note options in the notes section or Settings → Notes.
  The saved `urspace:background` value is unchanged and still applies only inside
  the editor.
- The wallpaper layer is clipped to the editor and always covers it edge-to-edge;
  the dimmer uses a dark wash in both themes, so the editor keeps light-on-dark
  text and the existing contrast overrides remain valid.
- The top bar keeps the profile picture and username bubble; a single gear menu
  holds navigation, theme and logout. No navigation target or action was removed.

**Tests performed**
- `npx tsc --noEmit` — clean.
- `npm run lint` — 0 problems.
- `npm test` — 34/34 pass.
- `npm run build` — success.

**Measured layout check**
- A temporary unauthenticated harness rendered the real header and dashboard
  (removed before commit). At 1440 the composer card was 768 px wide with a
  708×414 writing area and the notes column 384 px; at 834 the card was 753 px
  wide; at 390 and 320 there was no horizontal overflow, and the header, the
  settings menu panel and the note options panel all fit inside the viewport.
  The wallpaper layer measured 227×411 inside a 229×413 shell — an exact fill
  inside the 1 px border.

**Not verified**
- No paint-level/screenshot review of the editor or the dropdowns: the automated
  browser tab ran hidden, so captures came back blank and clicks did not commit.
  The checks above are computed layout and CSS values, not a viewed page.
  Authenticated pages are still unreachable (no owner/admin account; login
  blocked by Phase 1 items).

**Commit:** `5d6f215`.

**Deployment status:** deployed to production on `https://urspace-seven.vercel.app`
(Vercel project `urspace`, deployment `dpl_Bv999pKUkApFYbwHM2vJcTvmUJap`), state
`READY`, promoted to production. `/` and `/login` return 200. The live CSS bundle
contains the header-menu, note-options and editor-wallpaper rules, the larger
`clamp(20rem, 46vh, 34rem)` writing height and the mobile note-options override;
the old `app-background-photo` layer is absent.

---

## 2026-11-26 — Phase 3: editor-scoped wallpapers and theme/surface consistency

**Change:** UI only. The photo background moved out of the application shell and
into the note editor; light/dark surfaces, elevation and dark-mode contrast were
tightened; dashboard spacing and alignment were reviewed.

**Files changed**
- `app/background-settings.tsx` — the provider exposes
  `useNoteEditorWallpaper()` / `NoteEditorBackdrop`, adds a static `AppBackdrop`,
  and describes the feature as a writing-area wallpaper.
- `app/rich-text-editor.tsx` — renders the wallpaper inside `.note-editor-shell`
  and sets `data-wallpaper` for the contrast overrides.
- `app/(tutor)/layout.tsx`, `app/(account)/layout.tsx`,
  `app/(admin)/layout.tsx` — render `<AppBackdrop />`; no photo layer.
- `app/globals.css` — opaque panel/control surfaces, warm elevation tokens, a
  darker dark-mode background with lighter panels, editor wallpaper contrast
  rules, `.ui-surface-card` / `.ui-shadow-panel`.
- `app/(tutor)/dashboard/page.tsx`, `dashboard/notebook.tsx` — card/panel
  cohesion, consistent spacing, top-aligned two-column layout.
- `app/(account)/settings/page.tsx` — “Note editor wallpaper” section copy.
- `components/app-header.tsx`, `components/note-editor-form.tsx`,
  `app/(tutor)/notes/[id]/note-detail.tsx`, `app/(account)/profile/page.tsx`,
  `app/(admin)/admin/notes/[id]/page.tsx`, `components/admin/settings-form.tsx`
  — hardcoded colours replaced with theme tokens and shared shadows.
- `README.md`, `docs/*` — status and changelog updates.

**Reason:** Phase 3A requires wallpapers to be editor-only, and Phase 3B asks for
cohesive light/dark surfaces, readable dark-mode text and a reviewed dashboard
layout. Authentication, database, Supabase configuration, server actions and the
API layer were not modified.

**Behaviour changes**
- A chosen wallpaper now appears only behind the editor content; dashboard,
  login, navigation, settings, profile and admin keep their themed surfaces.
- The existing `localStorage` keys (`urspace:background`, `urspace:theme`) are
  reused, so a previously chosen photo carries over to the editor.
- Panels are opaque instead of translucent, making the card/panel/background
  hierarchy explicit in both themes.

**Tests performed**
- `npx tsc --noEmit` — clean.
- `npm run lint` — 0 problems.
- `npm test` — 34/34 pass.
- `npm run build` — success, 25 route entries.

**Not verified**
- No browser or screenshot review of the wallpaper, dark-mode contrast, or the
  dashboard at desktop/tablet/mobile widths. Authenticated pages are not
  reachable in this session (no owner/admin account; login blocked by Phase 1
  items), so those visual checks remain outstanding.

**Commit:** `da9eaec`.

**Deployment status:** deployed to production on `https://urspace-seven.vercel.app`
(Vercel project `urspace`, deployment `dpl_5A5atWGCdCmqq6MQCKKNPDSsgct2`), state
`READY`, promoted to production. `/` and `/login` return 200; the production CSS
bundle contains the new editor-wallpaper rules and no longer contains the
app-wide photo layer. The authenticated editor itself was not opened in this
session.

---

## 2026-11-26 — Phase 0: documentation and project audit

**Change:** added the Phase 0 documentation set and recorded the audit findings.
No application code, database object, environment variable or deployment was
modified.

**Files added**
- `docs/PROJECT_OVERVIEW.md`
- `docs/ARCHITECTURE.md`
- `docs/AUTHENTICATION.md`
- `docs/ENVIRONMENT_SETUP.md`
- `docs/KNOWN_ISSUES.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/TESTING_CHECKLIST.md`
- `docs/CHANGELOG.md`

**Files updated**
- `docs/IMPLEMENTATION_LOG.md` — Phase 0 audit entry.

**Reason:** the project brief requires an accurate, evidence-based baseline
before any backend, authentication or UI work.

**Commit:** not committed. Local `main` is 4 commits behind `origin/main`
(`4c24808`) and the working tree holds a superseded staged auth fix; committing
would either fail to push or revert the deployed OAuth recovery. Reconciliation
requires approval (see `KNOWN_ISSUES.md` KI-01).

**Tests performed**
- `npx tsc --noEmit` — clean.
- `npm run lint` — 0 problems.
- `npm test` — 34/34 pass.
- `npm run build` — success, 25 route entries.
- Live Supabase read-only checks: tables, RLS, policies, triggers, functions,
  storage, counts, providers.
- Live Vercel checks: projects, deployments, environment-variable **names**,
  domains, HTTP status of both aliases.

**Deployment status:** unchanged. Production remains `urspace-seven.vercel.app`
at commit `4c24808`, `READY`.

---

## 2026-11-14 — Wallpaper scope recorded (remote `main`)

**Change:** documentation only — recorded that wallpapers are intended to be
restricted to the note editor.

**Files:** `docs/IMPLEMENTATION_LOG.md`, `README.md`.

**Reason:** capture the Phase 3A scope decision before implementation.

**Commits:** `4c24808` (log entry), `8bd23d6` (README).

**Tests:** none required (documentation).

**Deployment:** Vercel rebuilt and promoted `4c24808` to production.

---

## 2026-11-14 — Login shows profile-recovery error (remote `main`)

**Change:** `/login` renders a friendly alert for `?error=profile`.

**Files:** `app/(public)/login/page.tsx`.

**Reason:** users whose OAuth callback could not repair a missing profile
previously arrived with no explanation.

**Commit:** `cdac273`.

**Tests:** not recorded. The related recovery path cannot succeed in production
while the service-role key is absent, so this messaging is likely to be the
visible outcome rather than a fix.

**Deployment:** included in `4c24808` production build.

---

## 2026-11-14 — OAuth callback profile recovery (remote `main`)

**Change:** `/auth/callback` now re-reads the profile, repairs a missing row with
the service-role Admin API (role `tutor`, status `active`), tolerates a
concurrent unique violation, records the provider on the audit entry, and
redirects to `error=profile` when recovery is impossible.

**Files:** `lib/auth-callback.ts` (+71/−15).

**Reason:** three authenticated users have no `profiles` row and previously
bounced at the dashboard guard.

**Commit:** `7724205`.

**Tests:** not recorded. **Not verified live** — the deployed code requires
`SUPABASE_SERVICE_ROLE_KEY`, which is not configured on Vercel.

**Deployment:** included in `4c24808` production build.

---

## 2026-11-14 — Landing page copy update

**Change:** landing page text adjustments.

**Files:** `app/(public)/page.tsx`.

**Commit:** `73587e0`. **Tests:** not recorded. **Deployment:** deployed.

---

## 2026-11-14 — Branded favicon; temporary auth debug logging removed

**Change:** added `app/icon.svg` and `apple-icon.png`, replaced `favicon.ico`,
and removed temporary debug logging from `lib/auth-callback.ts` and `proxy.ts`.

**Files:** `app/icon.svg`, `app/apple-icon.png`, `app/favicon.ico`,
`lib/auth-callback.ts`, `proxy.ts`.

**Commit:** `2aa7fa1`. **Tests:** not recorded. **Deployment:** deployed.

---

## 2026-11-14 — Full UrSpace application implementation

**Change:** introduced the complete application surface over the original
`localStorage` notebook:

- Authentication (email/password, six social buttons, recovery, suspension)
  and auth callback/confirm route handlers.
- Route groups for public, tutor, account and admin areas with guarded layouts.
- Supabase-backed notes with tags, search, statistics and legacy import.
- Profiles, avatars (Storage) and password management.
- Admin/owner dashboards: tutor management, note oversight, audit log,
  platform settings.
- Public landing page, terms, platform notice.
- Design system, light/dark themes, five backgrounds, motion system.
- Database schema with RLS, triggers, `private` authorization helpers and
  `avatars` bucket; `owner-setup.sql`; `rls-tests.sql`.
- Unit tests (Vitest) and setup documentation.

**Files:** 97 files added/changed (see `168ea47`).

**Reason:** implement the UrSpace product brief.

**Commit:** `168ea47`.

**Tests recorded at the time:** lint, `tsc`, Vitest, production build passed;
public pages rendered; unauthenticated routes redirected. Authenticated flows
were **not** verified because the schema had not been applied at that point.

**Deployment:** later deployed via Vercel.

---

## 2026-10-30 — Merge PR #1 (`note-form`)

**Change:** merged the note-form feature branch into `main`.

**Commit:** `69ba6a7`. **Tests:** not recorded.

---

## 2026-10-30 — UrSpace notes, themes and backgrounds

**Change:** built the notes application foundation — notebook UI, rich-text
editor, tags, search, light/dark themes, photographic backgrounds.

**Commit:** `39a6049`. **Tests:** not recorded.

---

## 2026-10-29 — Initialise the Next.js notes app

**Change:** initial Next.js scaffold for the notes application.

**Commit:** `3fdf209`. **Tests:** not recorded.
