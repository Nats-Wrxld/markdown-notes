# UrSpace — Implementation Plan

**Document status:** Phase 0 audit, 2026-11-26.
This plan is synchronised with the repository and the live Supabase/Vercel
state as of that date. A phase is only marked complete when its completion
requirement is satisfied by evidence, not by code existing.

---

## Status legend

**Existing / verified** · **In progress** · **Planned** · **Blocked** ·
**Verified** (implemented and tested). A planned feature is never described as
existing.

---

## Phase 0 — Documentation and project audit

**Objective:** establish an accurate baseline of what exists before changing
anything.

**Completion requirement:** documentation describes the current application,
with every claim verified or explicitly labelled unverified.

### Tasks

| # | Task | Status |
| --- | --- | --- |
| 0.1 | Inspect repository structure and application areas | Complete |
| 0.2 | Document architecture and verified stack versions | Complete — `ARCHITECTURE.md`, `PROJECT_OVERVIEW.md` |
| 0.3 | Trace authentication, profiles, roles, notes, "workspaces" | Complete — `AUTHENTICATION.md`, `ARCHITECTURE.md` |
| 0.4 | Identify existing database tables and relationships | Complete — verified live (5 tables, 21 policies, 7 triggers) |
| 0.5 | Check Supabase project status | Complete — `xwebcsemorzywsxdhtja`, ACTIVE_HEALTHY |
| 0.6 | Identify required environment variables (names only) | Complete — `ENVIRONMENT_SETUP.md` |
| 0.7 | Document GitHub → Vercel deployment process | Complete — 2 projects found, 1 live |
| 0.8 | Record existing bugs and previously pushed changes | Complete — `KNOWN_ISSUES.md` §4 |
| 0.9 | Create the testing checklist | Complete — `TESTING_CHECKLIST.md` |
| 0.10 | Write the eight required documents | Complete |
| 0.11 | Present the audit report | Complete (delivered with this change) |

**Phase 0 status: COMPLETE (documentation).**
Caveat: the eight documents are written to the working tree but **not committed**
because of KI-01 (local `main` is 4 commits behind `origin/main` and the tree
holds a superseded staged auth fix). Committing requires approval to reconcile.

**Dependencies:** none.
**Blocked items:** none inside Phase 0.

---

## Phase 1 — Restore and verify the backend

**Objective:** a verified, correctly configured backend that the app can use.

**Completion requirement:** Supabase connectivity and required backend
configuration verified.

**Current status: NOT STARTED formally — pre-audited.** All findings below were
gathered read-only during Phase 0; no corrective action has been taken.

### Findings already established (read-only)

| Check | Result |
| --- | --- |
| Correct project | `xwebcsemorzywsxdhtja` ("markdown-notes"), ACTIVE_HEALTHY, PostgreSQL 17.11 |
| Tables | `profiles`, `notes`, `audit_logs`, `platform_settings`, `user_preferences` |
| RLS | Enabled on all five; 21 policies including 4 on `storage.objects` |
| Triggers | 7 verified, including `on_auth_user_created`, `profiles_protect_fields`, `notes_protect_owner` |
| Functions | 4 `private` helpers + `handle_new_user`, `protect_profile_fields`, `protect_note_owner`, `set_updated_at` |
| `ensure_profile()` | **Absent** (declared only in local uncommitted SQL) |
| Storage | `avatars` bucket exists and is public |
| Accounts | 8 auth users; 5 profiles, all tutors; 0 admins, 0 owners |
| Notes | 0 rows |
| Audit | 22 entries, last 2026-11-14 |
| Google / GitHub OAuth | 1 identity each — configured at Supabase layer |
| Other providers | No identities |
| Vercel env | 2 public Supabase vars; **service-role key missing** |
| App connectivity | Live `/` and `/login` return 200 on `urspace-seven.vercel.app` |

### Tasks (all pending approval where they write to production)

| # | Task | Status | Blocked by |
| --- | --- | --- | --- |
| 1.1 | Reconcile git state so new work is based on `origin/main` | **Blocked** | KI-01, needs approval |
| 1.2 | Add `SUPABASE_SERVICE_ROLE_KEY` to the canonical Vercel project | **Blocked** | Approval (production security config) |
| 1.3 | Confirm Supabase Site URL + four redirect URLs | Planned | Dashboard access not available to agent |
| 1.4 | Confirm Google/GitHub provider settings | Planned | Same |
| 1.5 | Provision the owner (`db/owner-setup.sql`) | **Blocked** | Approval (production data write) |
| 1.6 | Restore the 3 missing profiles (KI-04) | **Blocked** | Approval (production data write) |
| 1.7 | Choose canonical Vercel project; retire the broken duplicate | **Blocked** | Approval (destructive) |
| 1.8 | Verify app↔Supabase connectivity for an authenticated session | Planned | 1.2/1.5 |
| 1.9 | Run `db/rls-tests.sql` | Planned | Schema already applied; requires SQL editor access |

**Do not modify authentication logic until connectivity is confirmed.**

---

## Phase 2 — Authentication and account routing

**Objective:** new and existing users authenticate correctly and reach only
authorised data.

**Status: Planned / Blocked** (depends on Phase 1).

| # | Task | Status |
| --- | --- | --- |
| 2.1 | Google sign-up and login, verified end-to-end | Planned |
| 2.2 | GitHub sign-up and login, verified end-to-end | Planned |
| 2.3 | Existing users return to the same account | Planned (blocked by KI-04) |
| 2.4 | New users get exactly one profile | Planned (trigger exists; duplicate prevention to be tested) |
| 2.5 | Safe handling of missing profiles | **Blocked** — deployed path needs KI-02; local path needs KI-05 |
| 2.6 | Role-based routing (`/admin` vs `/dashboard`) | Planned (blocked by KI-03) |
| 2.7 | Individual user data separation | Planned (RLS in place; needs two live tutors) |
| 2.8 | Suspension handling | Planned |
| 2.9 | Authentication failure handling / friendly errors | Partially existing |
| 2.10 | Account switching (log out → different account) | Planned |
| 2.11 | Prevent accidental duplicate profiles | Planned (unique PK + `23505` tolerance; verify) |

**Completion requirement:** proven with real accounts, not by inspection.

---

## Phase 3 — User interface improvements

**Status: Implemented (2026-11-26).** Wallpapers are editor-scoped; runtime visual verification is outstanding (see `CHANGELOG.md`).

### 3A. Wallpaper feature — note editor only (Implemented)

Requirements, as agreed:
- Wallpaper selectable for the note editor.
- Rendered **inside** the writing area, behind note content.
- **Must not** become the application background.
- Dashboard, login, navigation, settings keep their existing surfaces.
- Text remains readable over any wallpaper.
- Works in light and dark themes.

Current state: implemented. The app-wide photo background was removed; the
remaining shells keep their static themed backdrop (KI-07 resolved).

### 3B. Interface improvements (Implemented — visual review pending)

- Card/panel cohesion across dashboard, admin and profile.
- Light-mode consistency.
- Dark-mode contrast and surface hierarchy.
- Dashboard layout review.
- Responsive behaviour review.
- Preserve UrSpace branding; no redesign for its own sake.

**Completion requirement:** verified across supported sizes and both themes.
Build, typecheck, lint and unit tests pass; visual checks at each size are still outstanding.

---

## Phase 4 — API assignment

**Status: NOT STARTED. Must not begin before earlier phases are complete.**

Planned approach (for approval when reached):
- Next.js Route Handlers under `app/api/`.
- Supabase remains the storage/auth layer.
- Endpoints around notes (list, create, read, update, delete) with Zod
  validation, session-based authorization and consistent error shapes.
- Postman collection plus documented run/test instructions.

---

## Phase 5 — Final verification and deployment

**Status: Planned** (runs after Phases 2–4).

Required: lint, production build, Google/GitHub auth, new and existing accounts,
role routing, data separation, note creation/editing, wallpaper inside the
editor, light/dark themes, responsive layouts, Postman API tests (once Phase 4
exists), Vercel logs, live application.

---

## Current position

| Item | Value |
| --- | --- |
| Current phase | **Phase 0 complete; Phase 3 UI implemented; Phase 1/2 backend work pending** |
| Next action | Backend configuration (Phase 1.2 onward); review the Phase 3 UI on the deployed build |
| Phase 1 completion | Not met — service-role key, owner, and profile restoration outstanding |
| Phase 2 completion | Not met |
| Phase 3 completion | Code complete and locally verified; visual verification pending |
| Phase 4 | Not started |
| Phase 5 | Not started |

---

## Completed tasks (verified this audit)

- Repository, route groups, components and libraries inspected.
- All eight documentation files created (this commit).
- Live Supabase schema, RLS, triggers, functions, storage, account and note
  counts verified read-only.
- Live Vercel projects, deployments, aliases and environment-variable **names**
  verified.
- Local checks executed: `npx tsc --noEmit` (clean), `npm run lint` (clean),
  `npm test` (34/34), `npm run build` (25 routes, success).
- Live HTTP checks: `/` 200, `/login` 200 on the canonical alias; 500 on the
  duplicate alias.

## Pending tasks

- Phase 1.1–1.9 (see table).
- Phase 2 verification matrix.
- Phase 3 visual review across desktop/tablet/mobile and both themes.
- Phase 4 API.
- Phase 5 verification.

## Blocked tasks

| Task | Reason | Needs |
| --- | --- | --- |
| Commit/push documentation | Local branch behind remote; staged superseded fix | Approval to reconcile (KI-01) |
| Service-role key on Vercel | Production security configuration | Explicit approval (KI-02) |
| Owner provisioning | Writes production data | Explicit approval (KI-03) |
| Missing-profile restoration | Writes production data | Explicit approval (KI-04) |
| Retiring duplicate Vercel project | Destructive | Explicit approval (KI-06) |
| Supabase dashboard URL/provider checks | No dashboard tool access in this session | User confirmation or dashboard access |

## Approved changes log

| Date | Change | Approved by | Status |
| --- | --- | --- | --- |
| 2026-11-26 | Phase 0 documentation set created | Project brief (Phase 0 mandate) | Committed and pushed after git reconciliation |
| 2026-11-26 | Phase 3 UI: editor-scoped wallpaper, light/dark surface pass, dashboard spacing | Project brief (Phase 3 mandate) | Applied and pushed to `main` |
| — | No backend, auth, data or production changes | — | None requested |
