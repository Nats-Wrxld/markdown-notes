# UrSpace — Testing Checklist

**Last audit:** 2026-11-26 (Phase 0).
**Legend:** `[x]` passed · `[ ]` not run / not passed · `[!]` failed or blocked.
Each result states **when** and **how** it was checked. Nothing is marked as
passing because the code merely exists.

Environment for the Phase 0 run:
- Local tree at `notes/` (commit `73587e0` + staged auth changes).
- Live Supabase project `xwebcsemorzywsxdhtja` (read-only queries).
- Live site `https://urspace-seven.vercel.app`.

---

## 1. Build and static checks

| # | Check | Command | Result |
| --- | --- | --- | --- |
| 1.1 | TypeScript | `npx tsc --noEmit` | `[x]` exit 0, no output (2026-11-26) |
| 1.2 | Lint | `npm run lint` | `[x]` exit 0, no warnings (2026-11-26) |
| 1.3 | Unit tests | `npm test` | `[x]` 34/34 pass, 4 files (2026-11-26) |
| 1.4 | Production build | `npm run build` | `[x]` success, 25 route entries (2026-11-26) |
| 1.5 | No secrets in tracked files | secret sweep | `[x]` service-role key referenced only via `process.env` in `lib/supabase/admin.ts`; `.env*` gitignored except `.env.example` |

Unit-test coverage (34 tests): link-protocol allowlist, Tiptap document
allowlist, text extraction, tag normalisation, Zod validation (including that
`owner` cannot be requested through account creation), password-strength
scoring, role helpers/routing, note statistics.

---

## 2. Backend connectivity

| # | Check | Method | Result |
| --- | --- | --- | --- |
| 2.1 | Supabase project exists and is active | Management API | `[x]` `xwebcsemorzywsxdhtja`, `ACTIVE_HEALTHY`, PostgreSQL 17.11 |
| 2.2 | All five tables exist | `pg` catalogue query | `[x]` profiles, notes, audit_logs, platform_settings, user_preferences |
| 2.3 | RLS enabled on every table | `pg_class` / `pg_policies` | `[x]` 5/5 enabled; 21 policies present |
| 2.4 | Auth trigger installed | `pg_trigger` | `[x]` `on_auth_user_created` on `auth.users` |
| 2.5 | Protected-field and ownership triggers | `pg_trigger` | `[x]` `profiles_protect_fields`, `notes_protect_owner`, three `set_updated_at` triggers |
| 2.6 | `ensure_profile()` deployed | `pg_proc` | `[!]` **absent** — only in local uncommitted SQL |
| 2.7 | Avatars bucket exists | `storage.buckets` | `[x]` `avatars`, public |
| 2.8 | App can reach Supabase from the live deployment | live HTTP | `[!]` pages render, but no authenticated session was exercised; not proven |
| 2.9 | Server-action write path works | live | `[ ]` not run (would create production data) |
| 2.10 | `db/rls-tests.sql` | SQL editor | `[ ]` not run in this audit |

---

## 3. Authentication

| # | Check | Result |
| --- | --- | --- |
| 3.1 | Email/password signup | `[ ]` not run |
| 3.2 | Email/password login | `[x]` verified 2026-11-28 (live deployment + local; temporary account, since deleted) |
| 3.3 | Logout | `[x]` verified 2026-11-28 (live + local): session cookies cleared, lands on `/login`, refresh stays signed out |
| 3.4 | Password reset request | `[ ]` not run |
| 3.5 | Password reset completion | `[ ]` not run |
| 3.6 | Google OAuth — configured at Supabase | `[x]` 1 identity recorded |
| 3.7 | Google OAuth — full round-trip | `[ ]` not run |
| 3.8 | GitHub OAuth — configured at Supabase | `[x]` 1 identity recorded |
| 3.9 | GitHub OAuth — full round-trip | `[ ]` not run |
| 3.10 | Microsoft/Facebook/X/Apple | `[!]` no identities; assumed unconfigured |
| 3.11 | Signed-in visitor on `/login` is redirected | `[x]` verified 2026-11-28 live → `/dashboard` |
| 3.12 | Invalid login shows exactly "Wrong email or password" | `[ ]` not run |
| 3.13 | Callback without code → `/login?error=link` | `[ ]` not run live (logic inspected) |
| 3.14 | Callback with `?error=` → `/login?error=oauth` | `[ ]` not run live (logic inspected) |
| 3.15 | `error=profile` alert renders | `[!]` present on `origin/main`, absent in local tree |
| 3.16 | Session refresh via `proxy.ts` | `[ ]` not run |
| 3.17 | Live `/login` reachable | `[x]` HTTP 200 (2026-11-26) |

---

## 4. Profile creation and recovery

| # | Check | Result |
| --- | --- | --- |
| 4.1 | New email signup creates exactly one profile | `[ ]` not run |
| 4.2 | New OAuth signup creates exactly one profile | `[ ]` not run |
| 4.3 | Role defaults to `tutor` for public signups | `[x]` verified in trigger SQL; no live signup performed |
| 4.4 | Display name falls back provider name → email local part | `[x]` verified in SQL |
| 4.5 | Missing profile is repaired at OAuth callback | `[!]` deployed code requires service-role key, which is absent |
| 4.6 | Missing profile at password login | `[!]` returns "Wrong email or password" (3 such accounts exist) |
| 4.7 | No duplicate profiles on repeated login | `[ ]` not run |
| 4.8 | Profile count matches auth users | `[!]` 5 profiles vs 8 auth users |

---

## 5. Roles and permissions

| # | Check | Result |
| --- | --- | --- |
| 5.1 | Owner exists | `[!]` none |
| 5.2 | Admin exists | `[!]` none |
| 5.3 | Tutor exists | `[x]` 5 profiles, all active tutors |
| 5.4 | Tutor cannot open `/admin` | `[ ]` not run (no signed-in session) |
| 5.5 | Admin cannot open `/admin/settings` | `[ ]` not run |
| 5.6 | Staff cannot modify the owner row | `[x]` enforced in `resolveTarget` + trigger (code inspection) |
| 5.7 | Admin cannot create an admin | `[x]` enforced in server action; schema rejects `owner` (unit-tested) |
| 5.8 | Owner can toggle public signup | `[x]` current value `true` readable in DB; action not exercised |
| 5.9 | Role change is owner-only | `[x]` trigger verified live |

---

## 6. User data separation

| # | Check | Result |
| --- | --- | --- |
| 6.1 | Notes are scoped by `user_id` in DAL queries | `[x]` code inspection |
| 6.2 | RLS blocks cross-tutor note access | `[x]` policy verified live; not exercised with two sessions |
| 6.3 | `/notes/[id]` of another tutor → 404 | `[ ]` not run |
| 6.4 | Avatars restricted to own folder | `[x]` storage policies verified live |
| 6.5 | `user_preferences` own-row only | `[x]` policies verified; table unused by code |

---

## 7. Notes functionality

| # | Check | Result |
| --- | --- | --- |
| 7.1 | Create note | `[ ]` not run |
| 7.2 | Edit note | `[ ]` not run |
| 7.3 | Delete note (with confirmation) | `[ ]` not run |
| 7.4 | Rich-text toolbar (headings, marks, lists, links) | `[ ]` not run |
| 7.5 | Search across title/body/tags | `[ ]` not run |
| 7.6 | Tag filter and statistics | `[ ]` not run |
| 7.7 | Legacy `localStorage` import | `[ ]` not run |
| 7.8 | Notes exist in the database | `[!]` 0 rows — no live note has ever been saved |

**Consequence:** note CRUD is implemented and unit-tested at the document layer
but has **never been proven end-to-end** against the live database.

---

## 8. Wallpaper feature (Phase 3A)

| # | Check | Result |
| --- | --- | --- |
| 8.1 | Wallpaper selectable for the writing area | `[x]` implemented — Notes options menu and Settings → Notes (per-note storage not implemented) |
| 8.2 | Wallpaper rendered only inside the editor | `[x]` `NoteEditorBackdrop` inside `.note-editor-shell` (code + build) |
| 8.3 | App background unaffected | `[x]` static `AppBackdrop`; no photo layer in the shells |
| 8.4 | Text readability over wallpaper | `[x]` dark `--wallpaper-wash` + light text/code/link overrides — **not visually checked** |
| 8.5 | Wallpaper fills the editor without gaps or stretching | `[x]` absolute layer + `object-fit: cover`; not visually checked at each breakpoint |
| 8.6 | Works in light and dark themes | `[x]` wallpaper contrast is theme-independent — not visually checked |
| 8.7 | Existing app-wide background removed | `[x]` replaced by the static themed backdrop (intended change) |

---

## 9. Themes and appearance

| # | Check | Result |
| --- | --- | --- |
| 9.1 | Light/dark toggle | `[ ]` not run |
| 9.2 | No flash of wrong theme on load | `[x]` bootstrap script present in `app/layout.tsx` (inspection) |
| 9.3 | Theme persists across reloads | `[ ]` not run |
| 9.4 | Five photographic backgrounds render | `[ ]` not run (assets present) |
| 9.5 | Reduced-motion honoured | `[x]` CSS media block + `useReducedMotion()` guards present |

---

## 10. Responsive layout

| # | Check | Result |
| --- | --- | --- |
| 10.1 | Mobile layout | `[ ]` not visually checked |
| 10.2 | Tablet layout | `[ ]` not visually checked |
| 10.3 | Desktop layout | `[ ]` not visually checked |
| 10.4 | No horizontal overflow | `[ ]` not checked |

Responsive classes exist throughout; nothing was rendered at multiple sizes in
this audit.

---

## 11. Deployment verification

| # | Check | Result |
| --- | --- | --- |
| 11.1 | Vercel production deployment `READY` | `[x]` `urspace` project, commit `da9eaec` (`READY`, promoted) |
| 11.2 | Canonical alias serves the app | `[x]` `https://urspace-seven.vercel.app/` → 200, correct `<title>` |
| 11.3 | `/login` on production | `[x]` 200 |
| 11.4 | Duplicate project alias | `[!]` `https://markdown-notes-jet.vercel.app/` → **500** |
| 11.5 | All required env vars on production | `[!]` service-role key missing |
| 11.6 | Deployment logs inspected | `[ ]` not inspected |
| 11.7 | Supabase Site URL / redirect allow-list matches production | `[ ]` unverified |
| 11.8 | OAuth round-trip on production | `[ ]` not run |

---

## 12. API tests (Phase 4)

**Status: implemented and partially verified (2026-11-27).** TypeScript, lint,
74 unit tests and the production build pass. Public/unauthenticated endpoints
were exercised against the local dev server. Authenticated CRUD, role policies
and two-account isolation remain `[ ]` because no test account exists and
`SUPABASE_SERVICE_ROLE_KEY` is absent locally and on Vercel.

Legend: `[x]` verified · `[!]` partially verified / limitation recorded · `[ ]`
not run.

### 12.1 Contract (local dev server)

| # | Check | Expected | Result |
| --- | --- | --- | --- |
| 12.1 | `POST /auth/v1/token` with test account | `200`, access token | `[ ]` no account |
| 12.2 | `GET /api/v1/notes` | `200`, `data` + `meta` | `[ ]` auth required |
| 12.3 | `POST /api/v1/notes` | `201`, `Location`, note id | `[ ]` auth required |
| 12.4 | `GET /api/v1/notes/{id}` | `200`, own note | `[ ]` auth required |
| 12.5 | `PATCH /api/v1/notes/{id}` | `200`, field changed, others kept | `[ ]` auth required |
| 12.6 | `DELETE /api/v1/notes/{id}` | `204`, empty body | `[ ]` auth required |
| 12.7 | Repeat delete | `404`, `not_found` | `[ ]` auth required |
| 12.8 | `Cache-Control` and `Vary` headers | `private, no-store`; cookie + authorization | `[x]` live: health 200 had both headers + `X-Request-Id` |

### 12.2 Authentication and authorization

| # | Check | Expected | Result |
| --- | --- | --- | --- |
| 12.9 | No credential | `401 unauthenticated` | `[x]` live: GET/POST notes, admin overview |
| 12.10 | Malformed/expired bearer | `401` | `[x]` live: `Bearer not-a-token` → 401 |
| 12.11 | Cookie session from the browser | `200` | `[ ]` no account |
| 12.12 | Account A reads B's note id | `404` | `[ ]` no two accounts |
| 12.13 | Account A patches/deletes B's note | `404`; B unchanged | `[ ]` no two accounts |
| 12.14 | Suspended account | `403 account_suspended` | `[ ]` unit only |
| 12.15 | Cookie mutation with foreign `Origin` | `403 csrf_origin_mismatch` | `[ ]` no session |
| 12.16 | Direct PostgREST read of B's row with A's JWT | empty result (RLS) | `[ ]` not run |
| 12.17 | Service-role key referenced anywhere under `app/api/` | absent | `[x]` only `lib/providers/supabase/client.ts`

### 12.3 Validation and abuse

| # | Check | Expected | Result |
| --- | --- | --- | --- |
| 12.18 | Empty title / empty body / bad tag shape | `400` with `details` | `[x]` unit: contracts + domain |
| 12.19 | `user_id` supplied in POST body | `400`; no row written | `[x]` unit: strict schema rejects unknown keys |
| 12.20 | Malformed UUID in path | `400` | `[!]` code path exists; not exercised live |
| 12.21 | Body over 256 KB | `413` | `[ ]` not run |
| 12.22 | Non-JSON content type | `415` | `[ ]` not run live |
| 12.23 | `javascript:` link inside body | rejected as invalid body | `[x]` unit: existing note-document tests |
| 12.24 | 5xx response body | generic message + request id | `[x]` unit: `api-http.test.ts` |

### 12.4 Module coverage (planned, per migration phase)

Each module must pass its own contract, authorization and regression checks
before it is considered migrated. See
[API_MIGRATION.md](API_MIGRATION.md) §2 for the module map.

| # | Module | Checks required | Result |
| --- | --- | --- | --- |
| 12.25 | Auth/session | signup, login, logout, password forgot/reset, session probe, suspended routing | `[!]` login flow intentionally unchanged; session probe signed-out verified |
| 12.26 | OAuth | Google and GitHub initiation; callback unchanged | `[x]` both reached the providers with `redirect_to=/auth/callback`; full round-trip `[ ]` |
| 12.27 | Me/profile | read, rename, password change, avatar upload/replace/remove, 2 MB and MIME limits | `[ ]` no account |
| 12.28 | Notes | CRUD, import ≤500, pagination, tag filter, title search | `[ ]` no account; unit coverage only |
| 12.29 | Public settings | signed-out read; signup toggle honoured; notice rendered; no admin-module import | `[x]` live 200; cache test proves 3 reads → 1 query |
| 12.30 | Admin overview | counts and recent lists match the previous implementation | `[ ]` no staff account |
| 12.31 | Admin tutors | list/search/filter, create, rename, suspend/reactivate, reset link, no self/owner modification | `[ ]` no staff account |
| 12.32 | Admin admins | owner-only list/create; admin gets `403` | `[ ]` no owner account |
| 12.33 | Admin notes | staff list/detail/edit/delete, tutor isolation, audit entry per mutation | `[ ]` no staff account |
| 12.34 | Admin audit | staff read only; no HTTP write path | `[ ]` no staff account |
| 12.35 | Admin settings | owner read/write; staff `403`; public page reflects changes | `[ ]` no owner account |
| 12.36 | Provider boundary | no `@supabase/*` import outside provider, except the documented auth exception | `[!]` remaining: OAuth button, browser factory, `proxy.ts` |
| 12.37 | Behaviour parity | dashboard, note detail, profile, admin, landing render as before | `[!]` public pages and signed-out redirects verified; authenticated pages require an account |

Authentication for these runs requires a working test account; creating one is
blocked by KI-02/KI-04 until the backend items in Phase 1 are resolved.

### 12.5 Phase 1 foundation checks (planned)

Phase 1 adds no product endpoints. These checks prove the foundation without
changing user-visible behaviour.

| # | Check | Method | Result |
| --- | --- | --- | --- |
| 12.38 | Contract schemas accept valid and reject invalid input | `npm test` `contracts.test.ts` | `[x]` 11 tests |
| 12.39 | Provider rows map to domain/DTO shapes correctly | `npm test` `provider-mappers.test.ts` | `[x]` 8 tests |
| 12.40 | Provider errors map to the documented status codes | `npm test` `api-http.test.ts` | `[x]` 5 tests |
| 12.41 | Browser client parses success and error envelopes | `npm test` `api-client.test.ts` | `[x]` 5 tests |
| 12.42 | Session guards behave unchanged | signed out: `/dashboard` → `/login`; `/admin` → `/login` | `[x]` browser: `/dashboard` landed on `/login` |
| 12.43 | Session refresh still sets cookies | real request; inspect `Set-Cookie` | `[ ]` no account; `proxy.ts` unchanged |
| 12.44 | `lib/auth.ts` and `proxy.ts` have no Supabase import | grep | `[!]` `lib/auth.ts` clean; `proxy.ts` intentionally untouched |
| 12.45 | App parity | `/` 200, `/login` 200, dashboard/admin redirects, no console errors | `[x]` except a dev-only partial-prefetch insight on the redirect; no runtime errors |
| 12.46 | Build and static checks | `npx tsc --noEmit`, `npm run lint`, `npm run build` | `[x]` all pass |
| 12.47 | Optional health smoke route | `GET /api/v1/health` → 200 `{ data: { status: "ok" } }` | `[x]` live |

---

## 13. What this audit did NOT do

- Did not sign in, create accounts, notes, or change any data.
- Did not exercise social login, suspension, admin flows or note CRUD.
- Did not open the site in a browser or take screenshots.
- Did not read decrypted environment-variable values.
- Did not apply SQL, deploy, or modify production configuration.
- Did not run `db/rls-tests.sql`.
