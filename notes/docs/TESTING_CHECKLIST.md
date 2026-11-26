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
| 3.2 | Email/password login | `[ ]` not run |
| 3.3 | Logout | `[ ]` not run |
| 3.4 | Password reset request | `[ ]` not run |
| 3.5 | Password reset completion | `[ ]` not run |
| 3.6 | Google OAuth — configured at Supabase | `[x]` 1 identity recorded |
| 3.7 | Google OAuth — full round-trip | `[ ]` not run |
| 3.8 | GitHub OAuth — configured at Supabase | `[x]` 1 identity recorded |
| 3.9 | GitHub OAuth — full round-trip | `[ ]` not run |
| 3.10 | Microsoft/Facebook/X/Apple | `[!]` no identities; assumed unconfigured |
| 3.11 | Signed-in visitor on `/login` is redirected | `[ ]` not run |
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

Not applicable — no API layer exists. Do not run until Phase 4 is approved.

---

## 13. What this audit did NOT do

- Did not sign in, create accounts, notes, or change any data.
- Did not exercise social login, suspension, admin flows or note CRUD.
- Did not open the site in a browser or take screenshots.
- Did not read decrypted environment-variable values.
- Did not apply SQL, deploy, or modify production configuration.
- Did not run `db/rls-tests.sql`.
