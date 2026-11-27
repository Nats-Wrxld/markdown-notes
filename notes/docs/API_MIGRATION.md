# UrSpace — API Migration Audit and Strategy

**Status:** migration implemented 2026-11-27; authenticated verification pending.
**Companion:** [API_DESIGN.md](API_DESIGN.md) — target architecture and contract.
**Scope:** every existing Supabase interaction, the module coverage map, the
phased migration, risks, boundary enforcement and the provider-swap playbook.

### Implementation status (2026-11-27)

| Area | State |
| --- | --- |
| Contracts, ports, Supabase adapters | Implemented |
| Domain services (session, notes, profile, settings, admin, audit) | Implemented |
| HTTP kit + `/api/v1` routes (25 handlers) | Implemented |
| Browser + in-process server clients | Implemented |
| Notes UI, profile, public settings, admin UI | Migrated to the API/domain layer |
| Redundant Server Actions | Removed (note, account, admin); auth actions retained |
| Login, signup, logout, password reset, Google/GitHub OAuth | **Unchanged by explicit constraint** |
| Database schema / RLS | Unchanged |
| Verification | tsc, lint, 74 unit tests, build, public/unauth endpoints pass; authenticated CRUD unverified |

Remaining limitations are recorded in [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md)
§12 and [API_DESIGN.md](API_DESIGN.md) §10.

---

## 1. Complete Supabase interaction inventory

Verified by searching `@supabase/`, `lib/supabase`, `NEXT_PUBLIC_SUPABASE`,
`supabase.auth`, `supabase.storage`, `supabase.from` and `supabase.rpc` across
`app/`, `lib/`, `components/`, `proxy.ts` and `next.config.ts`.

### 1.1 Import sites (14 files)

| # | File | Imports | Surface |
| --- | --- | --- | --- |
| 1 | `lib/supabase/server.ts` | `@supabase/ssr` | Cookie-bound server client |
| 2 | `lib/supabase/client.ts` | `@supabase/ssr` | Browser client (**only** OAuth) |
| 3 | `lib/supabase/admin.ts` | `@supabase/supabase-js` | Service-role client, `server-only` |
| 4 | `lib/auth.ts` | server client | Session + profile |
| 5 | `lib/notes.ts` | server client | Note reads |
| 6 | `lib/admin.ts` | server client | Admin reads, public settings |
| 7 | `lib/audit.ts` | server client | Audit append |
| 8 | `lib/auth-callback.ts` | server + admin | Code exchange, profile repair |
| 9 | `app/auth/actions.ts` | server client | Auth actions |
| 10 | `app/(tutor)/actions.ts` | server client | Note writes |
| 11 | `app/(account)/actions.ts` | server client | Profile/avatar writes |
| 12 | `app/(admin)/actions.ts` | server + admin | Admin writes, provisioning |
| 13 | `components/social-auth-buttons.tsx` | `@supabase/ssr`, `@supabase/supabase-js` (**type**) | OAuth start in browser |
| 14 | `proxy.ts` | `@supabase/ssr` | Session refresh |

`next.config.ts` has no import, but derives `images.remotePatterns` from
`NEXT_PUBLIC_SUPABASE_URL`, coupling rendered image hosts to the provider.

### 1.2 Exact operations by table and API

| Table / API | Read | Write |
| --- | --- | --- |
| `notes` | `lib/notes.ts` (own list, own detail); `lib/admin.ts` (staff list, tutor notes, detail, counts, recent) | `insert` (create, bulk import); `update` (own, staff); `delete` (own, staff) |
| `profiles` | `lib/auth.ts` (guard); `lib/auth-callback.ts` (role/status); `app/auth/actions.ts` (post-login role); `lib/admin.ts` (lists, detail, owners, actors) | `update` (display name, avatar, staff rename, staff status); `insert` (OAuth repair, trigger) |
| `audit_logs` | `lib/admin.ts` (recent + paginated) | `insert` only (`lib/audit.ts`, admin actions, callback) |
| `platform_settings` | `lib/admin.ts` `getPlatformSettings`; `app/auth/actions.ts` signup gate; public notice/signup components via the admin DAL | `upsert` (owner settings) |
| `user_preferences` | **none** | **none** — table exists unused |
| `storage.objects` | Public URLs rendered through `avatar_url` | `upload`, `remove`, `getPublicUrl` in the avatar action |
| Supabase Auth | `getUser`, `exchangeCodeForSession` | `signUp`, `signInWithPassword`, `signOut`, `resetPasswordForEmail`, `updateUser`, `admin.createUser` |
| `next.config.ts` | Supabase Storage hostname for `next/image` | — |

### 1.3 Exported Server Actions to migrate

| File | Actions |
| --- | --- |
| `app/auth/actions.ts` | `signUp`, `logIn`, `logOut`, `requestPasswordReset`, `resetPassword` |
| `app/(tutor)/actions.ts` | `createNote`, `updateNote`, `deleteNote`, `importLocalNotes` |
| `app/(account)/actions.ts` | `updateDisplayName`, `changePassword`, `uploadAvatar`, `removeAvatar` |
| `app/(admin)/actions.ts` | `createAccount`, `setAccountStatus`, `updateAccountName`, `sendResetLink`, `adminUpdateNote`, `adminDeleteNote`, `updatePlatformSettings` |

Total: **20 actions**. No `supabase.rpc(...)` call exists (the old
`ensure_profile` idea was never shipped).

### 1.4 Client-side dependencies

| Dependency | Where | Consequence |
| --- | --- | --- |
| Browser Supabase client | `components/social-auth-buttons.tsx` | The only direct frontend→Supabase call; blocks provider independence |
| Provider types (`Provider`) | same file | Frontend compile-time coupling to `supabase-js` |
| Public Storage URLs | `avatar_url` rendered by `Avatar`/`next/image` | Provider identity leaks into markup and config |
| `NEXT_PUBLIC_SUPABASE_*` | bundle/runtime | Provider name and endpoint shipped to the client |
| Session cookie format | managed by `@supabase/ssr` via `proxy.ts` | Invisible to the UI, but adapter-owned |

### 1.5 Audit findings that affect the migration

1. **Public UI depends on the admin data module.** `components/platform-notice.tsx`
   and `components/social-signup-options.tsx` import `getPlatformSettings` from
   `lib/admin.ts`. This is a boundary smell today and must become
   `selectPublicSettings` in the settings module (Phase 4).
2. **Authorization is partly layout-only.** `lib/admin.ts` performs no role
   check itself; admin pages rely on `requireStaff()` in the layout plus RLS.
   Moving queries into domain services must add explicit role checks, or a
   future caller could reach them without the layout guard.
3. **RLS is the only staff/owner boundary for several writes.** Admin note
   update/delete and tutor updates rely on RLS + UI guards. Domain policies must
   own "staff may manage tutor-owned notes" explicitly before RLS becomes
   replaceable.
4. **Audit coverage is inconsistent.** Tutor note CRUD writes no audit entries;
   admin note edits, account changes and settings do. Centralising mutations in
   the domain is the moment to decide a single policy.
5. **Avatar update is a multi-step write** (object upload → profile update →
   old object removal) with compensation. It must stay inside one service
   operation, not be split across HTTP calls.
6. **`notes.user_id` references `auth.users`, not `profiles`.** A provider swap
   needs its own user table or a preserved user-id mapping; admin joins already
   work around the missing FK.
7. **Profile repair uses the service role** and is blocked in production because
   `SUPABASE_SERVICE_ROLE_KEY` is absent (KI-02). Any admin provisioning or
   repair test inherits that blocker.
8. **No rate limiting anywhere.** The API migration does not add it; recorded as
   a gap.

---

## 2. Module coverage matrix

Every application module, its current access path, and where it lands.

| Module | Current access | Direct Supabase | Target endpoints | Phase | Frontend change |
| --- | --- | --- | --- | --- | --- |
| Session / guards | `getCurrentProfile`, layouts | yes | `GET /auth/session` (+ in-process session service) | 1 / 3 | guards unchanged in behaviour |
| Authentication | Server Actions | yes | `/auth/signup`, `/login`, `/logout`, `/password/*` | 3 | forms → `fetch` |
| OAuth | browser SDK | **yes (client)** | `GET /auth/oauth/{provider}`, `/auth/callback` | 3 | location redirect |
| Profile | Server Actions + RSC | yes | `GET/PATCH /me`, `PUT /me/password` | 3 | profile forms → `fetch` |
| Avatar | Server Action → Storage | yes | `POST/DELETE /me/avatar` | 3 | avatar manager → `fetch` |
| Preferences | `localStorage` | no | deferred (`/me/preferences`) | — | none until feature exists |
| Notes | Actions + `lib/notes.ts` | yes | `/notes` CRUD | 2 | notebook/detail → `fetch` |
| Legacy note import | Server Action | yes | `POST /notes/import` | 2 | import banner → `fetch` |
| Public settings | `lib/admin.ts` via public components | yes | `GET /public/settings` | 4 | server-side call only |
| Admin overview | RSC `getAdminStats` | yes | `GET /admin/overview` | 5 | none (RSC) |
| Admin tutors | RSC + Actions | yes | `/admin/tutors/**`, `/admin/admins/**` | 5 | admin forms → `fetch` |
| Admin notes | RSC + Actions | yes | `/admin/notes/**` | 5 | oversight → `fetch` |
| Audit log | RSC `listAuditLogs` | yes | `GET /admin/audit` | 5 | none (RSC) |
| Platform settings | RSC + Action | yes | `GET/PATCH /admin/settings` | 5 | settings form → `fetch` |
| Account provisioning | Action + service role | yes | `POST /admin/tutors`, `/admin/admins` | 5 | create form → `fetch` |
| Media / avatars | public Storage URLs | indirect | provider-neutral key; optional media route | 6 / 7 | none unless media route added |

---

## 3. Migration rules

1. **Strangler, one module per change.** A module is moved to the API layer
   without touching another module's transport in the same change.
2. **No dual writes.** Reads may briefly have two paths (RSC vs API); writes go
   through exactly one owner (the domain service) as soon as the module moves.
3. **Behaviour first, then transport.** Phase 1 extracts services/adapters with
   no visible change. Transport changes come after parity is proven.
4. **RLS stays until the last line is moved.** Removing or replacing policies is
   out of scope for this phase.
5. **Never change copy, layout or feature behaviour** during a migration step.
6. **Rollback is a revert, not a data migration.** No schema changes means every
   phase can be reverted with a commit; Phase 6's env rename is the only
   production-config step and needs approval.
7. **A module is done only when** its endpoints pass Postman + security checks,
   its frontend path uses the API layer, its docs are updated and no Supabase
   import remains for it.

---

## 4. Phased migration

### Phase 1 — Foundation (no user-visible change, approved)

Scope is deliberately narrower than the original sketch: ports are added per
module, so Phase 1 implements only the session and profile ports and leaves the
other runtime paths untouched. This keeps the phase reversible and avoids
shipping untested adapters.

#### Files

| Group | Files | Purpose |
| --- | --- | --- |
| Contracts | `lib/contracts/common.ts`, `auth.ts`, `profile.ts`, `note.ts`, `settings.ts`, `admin.ts` | Wire DTOs, enums, pagination and Zod input schemas. Existing schemas move here and are re-exported by `lib/validation.ts` so there is one source of truth. Provider-free and client-safe. |
| Ports | `lib/ports/session.ts`, `profiles.ts`, `scope.ts` | Request-scoped capabilities the domain may use. No provider types. |
| Adapters | `lib/providers/supabase/client.ts`, `session.ts`, `profiles.ts`, `mappers.ts`, `errors.ts`, `scope.ts` | Client factories, session resolution/refresh, profile reads, row↔domain mapping, provider-error translation. |
| Domain | `lib/domain/session.ts`, `lib/domain/errors.ts` | `getCurrentProfile` semantics and `DomainError` kinds. |
| HTTP kit | `lib/api/errors.ts`, `response.ts`, `request.ts`, `context.ts`, `policies.ts`, `pagination.ts`, `route.ts`, `serialize.ts` | Envelope, status mapping, body/query limits, authentication context, role/origin policies, route wrapper, DTO serialisation. |
| Clients | `lib/api-client/result.ts`, `browser.ts`, `server.ts` | Shared result type; fetch + envelope parsing; in-process typed server client. |
| Compatibility | `lib/supabase/server.ts`, `lib/supabase/admin.ts`, `lib/supabase/client.ts` | Thin re-exports so the 12 untouched modules keep compiling and behaving identically. |
| Rewired | `lib/auth.ts`, `proxy.ts` | Both delegate to the session domain/port; no Supabase import remains in either. Public `getCurrentProfile` / `require*` signatures are unchanged. |
| Tests | `tests/contracts.test.ts`, `tests/provider-mappers.test.ts`, `tests/api-http.test.ts`, `tests/api-client.test.ts` | Schema limits, row↔DTO mapping, error→status mapping, envelope parsing, auth/policy decisions. |
| Docs | `API_DESIGN.md`, `API_MIGRATION.md`, `IMPLEMENTATION_PLAN.md`, `TESTING_CHECKLIST.md`, `CHANGELOG.md`, `IMPLEMENTATION_LOG.md` | Approval record, Phase 1 status and test results. |

An optional `GET /api/v1/health` smoke route (no auth, no data) is the only new
endpoint, used to prove the HTTP kit end-to-end. It can be omitted; Phase 2
would then provide the first real endpoint test.

#### Deliberately not in Phase 1

- No notes/profile/admin/settings endpoints.
- No changes to any page, component, form or Server Action.
- No notes, settings, audit, storage or admin-accounts adapters.
- No OAuth change; the browser Supabase client stays until Phase 3.
- No schema, policy, dependency or environment-variable change.

#### Verification

- `npm test` — existing 34 tests plus the new suites.
- `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- `/` and `/login` render 200; unauthenticated `/dashboard` still redirects.
- Session refresh exercised on a real request (cookie present and refreshed).
- `grep` confirms `lib/auth.ts` and `proxy.ts` no longer import Supabase.
- If the health route ships: `GET /api/v1/health` → 200 `{ data: { status: "ok" } }`.

**Exit:** the app behaves exactly as before; session/profile access is behind
adapters; tests and checks pass; documentation records the results. Full
Supabase removal is a Phase 6 outcome, not a Phase 1 claim.
**Rollback:** revert one commit; no routes, data or configuration involved.

### Phase 2 — Notes module end-to-end

| # | Task |
| --- | --- |
| 2.1 | `GET/POST /api/v1/notes`, `GET/PATCH/DELETE /api/v1/notes/{id}` |
| 2.2 | `POST /api/v1/notes/import` |
| 2.3 | Notebook and note detail mutations use `/api/v1`; RSC reads use the server client |
| 2.4 | Postman Notes folder + negative cases; ownership and suspension tests |
| 2.5 | Decide and document note audit policy (recommended: record `note.created/updated/deleted`) |

**Exit:** notes CRUD and import work through the API with no Server Action
dependency; cross-user requests return `404`; notes behave identically.
**Blocker:** authenticated testing needs a test account (see §5, R3).

### Phase 3 — Identity, profile and session (highest risk)

| # | Task |
| --- | --- |
| 3.1 | `GET /auth/session`, `GET /me` — validate cookie authentication end to end |
| 3.2 | `POST /auth/login`, `/logout`, `/signup`, `/password/forgot`, `/password/reset`; auth forms switch |
| 3.3 | `GET /auth/oauth/{provider}`; delete the browser Supabase client and `Provider` import; `/auth/callback` unchanged externally |
| 3.4 | `PATCH /me`, `PUT /me/password`, `POST/DELETE /me/avatar`; profile forms switch |
| 3.5 | Decide the `next.config.ts` image-host path (keep provider host or add media route) |

**Exit:** no Supabase import reaches the browser bundle; password login, signup,
Google and GitHub OAuth, reset, password change and avatar upload verified with
real accounts; Postman uses the cookie jar.
**Rollback:** old actions remain until 3.4 is verified; revert form wiring if
login regresses.
**Risk:** OAuth PKCE state and redirect URLs; the callback path must not change,
or every configured provider and Supabase redirect entry must be updated in the
same change — avoid.

### Phase 4 — Public settings and shell consumers

| # | Task |
| --- | --- |
| 4.1 | `GET /public/settings` with a public, no-credentials contract |
| 4.2 | `PlatformNotice` and `SocialSignupOptions` stop importing `lib/admin.ts` |
| 4.3 | Landing/signup use the settings endpoint or the server client; signup gate uses the same source |
| 4.4 | Verify signed-out caching and `no-store`/public cache decision |

**Exit:** no public component imports an admin module; signup toggle and notice
behave identically; landing and signup render correctly signed out.

### Phase 5 — Administration

| # | Task |
| --- | --- |
| 5.1 | `GET /admin/overview` (counts, recent notes, recent activity) |
| 5.2 | `/admin/tutors` list/create/detail/patch/notes/reset |
| 5.3 | `/admin/admins` list/create (owner only) |
| 5.4 | `/admin/notes` list/detail/patch/delete |
| 5.5 | `GET /admin/audit` |
| 5.6 | `GET/PATCH /admin/settings` (owner only) |
| 5.7 | Admin forms switch to `fetch`; policies for owner protection, self-modification and admin-to-tutor limits |
| 5.8 | Security matrix: staff vs owner vs tutor, cross-tutor notes, service-role isolation |

**Exit:** every admin surface uses the API layer; `audit_logs` cannot be written
over HTTP; role boundaries proven with real accounts.
**Blocker:** account creation/reset tests need `SUPABASE_SERVICE_ROLE_KEY` on the
environment (KI-02) or manual dashboard provisioning.
**Rollback:** actions stay until 5.7 is verified.

### Phase 6 — Decommission and enforcement

| # | Task |
| --- | --- |
| 6.1 | Delete `lib/supabase/client.ts`, `lib/notes.ts`, `lib/admin.ts`, `lib/audit.ts` wrappers. Evaluate each Server Action individually: remove or replace those made redundant by the API, preserve any that still serve a legitimate purpose |
| 6.2 | Move `db/schema.sql`, `owner-setup.sql`, `rls-tests.sql` under `lib/providers/supabase/db/` |
| 6.3 | Rename `NEXT_PUBLIC_SUPABASE_*` → server-only `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY`; update Vercel (approval required) |
| 6.4 | ESLint `no-restricted-imports` for `@supabase/*`, `@/lib/providers/*`, `@/lib/domain/*` outside allowed paths; CI grep |
| 6.5 | Review the transitional bearer bridge. Keep it if it still has a maintained purpose (scripts/Postman); retire it if not. The browser contract is cookie-only either way |
| 6.6 | Refresh all docs, diagrams and the Postman collection |

**Exit:** repository-wide grep finds no Supabase import outside the adapter;
build, tests and the full regression checklist pass; provider name no longer
appears in the client bundle.
**Risk:** env rename is a production configuration change; coordinate deploy and
rollback.

### Phase 7 — Provider-swap readiness (optional, no swap performed)

| # | Task |
| --- | --- |
| 7.1 | `lib/providers/fake/**`: in-memory implementation of every port |
| 7.2 | Contract suite runs domain + HTTP handlers against the fake provider |
| 7.3 | Adapter README: schema, RLS policies, triggers, storage buckets, env contract |
| 7.4 | Swap runbook (§6) walked through on a staging branch |
| 7.5 | Decide media strategy (opaque provider URL vs proxied media route) |

**Exit:** the app can be pointed at a different provider by changing adapters,
env and data, with no frontend changes — proven by a fake-provider test run.

---

## 5. Risks and mitigations

| # | Risk | Severity | Mitigation |
| --- | --- | --- | --- |
| R1 | OAuth/login regression during Phase 3 | S1 | Move last; keep old actions until verified; do not change `/auth/callback`; test Google and GitHub with real accounts |
| R2 | Authorization gap when leaving RLS-only admin queries | S1 | Add explicit role/resource policies in domain before exposing endpoints; two-account + staff matrix |
| R3 | No test account / service-role key (KI-02, KI-04) | S1 (blocks tests) | Provision a dedicated test tutor + staff account before Phase 2 exit; otherwise mark tests blocked, never "passing" |
| R4 | Service-role key leaks into API code | S1 | Only `AdminAccountsPort` adapter touches it; grep check; `server-only` |
| R5 | Session cookie format ties us to Supabase | S2 | Accept during migration (no forced re-login); document re-auth cost of a swap |
| R6 | Avatar URLs point at Supabase Storage | S2 | `StoragePort.keyFromUrl`; media route or object copy at swap time |
| R7 | RSC/API behaviour drift | S2 | Server client calls the same domain function; contract tests |
| R8 | Performance regression from extra abstraction | S3 | In-process RSC path; measure dashboard TTFB before/after Phase 2 |
| R9 | Audit behaviour changes silently | S2 | Explicit decision in Phase 2; document in changelog |
| R10 | Postman collection drifts from implementation | S3 | Each phase adds/updates its folder before exit |
| R11 | No rate limiting on new public endpoints | S2 | Body caps + platform limits now; rate-limit change scheduled separately |
| R12 | Scope creep into UI changes during refactors | S3 | "Behaviour first" rule; no copy/layout changes in migration commits |
| R13 | `cacheComponents` build errors from cookie reads | S3 | API handlers request-time; session reads stay behind Suspense in RSC |

---

## 6. Provider-swap playbook (target state)

When Supabase is replaced (or a second provider is introduced):

1. **Freeze the contract.** Tag the OpenAPI/Postman/Zod versions; run contract
   tests against the fake provider.
2. **Implement adapters.** New `lib/providers/<name>/**` implementing the same
   ports; no domain or frontend change.
3. **Migrate data.** Export/import notes, profiles, audit; preserve user-id
   mapping (notes reference `auth.users`, not `profiles`).
4. **Migrate auth.** Import users or require a password reset; expect one
   re-login because the session cookie is provider-owned.
5. **Migrate storage.** Copy objects; keep keys stable; either keep a media
   route or rewrite `avatar_url`.
6. **Re-create authorization.** Port RLS policies to the new store or rely on
   domain checks plus new policies. RLS is not portable; domain checks must
   already be complete.
7. **Switch wiring.** Env + adapter import in a preview deployment; run the full
   Postman and security matrices there.
8. **Cut over with rollback.** Keep the Supabase adapter and a data snapshot
   until the new provider passes; then remove the old adapter and its
   provider-specific SQL.

**Frontend impact:** none for data, roles, notes, admin and public settings. One
re-login for users; avatar URLs only if no media route exists.

---

## 7. Out of scope for this migration

- Database schema, policy or trigger changes.
- New product features, copy, layout or design changes.
- Extracting the backend into a separate service or deployment.
- Rate limiting, API keys, CORS or third-party scopes.
- Server-side preference sync (`user_preferences`) before the feature exists.
- Removing Supabase itself. Phase 7 proves replaceability; it does not perform a
  swap.

---

## 8. Approval requested

1. App-wide scope and the module order (notes → identity → public → admin).
2. Domain-owned authorization with RLS retained as defence.
3. In-process server client for RSC (no self-HTTP).
4. Server Actions removed by Phase 6.
5. OAuth moved behind `GET /api/v1/auth/oauth/{provider}`.
6. Session cookie format kept provider-owned during migration (no forced
   re-login).
7. A dedicated test tutor + staff account made available before Phase 2 exit.
