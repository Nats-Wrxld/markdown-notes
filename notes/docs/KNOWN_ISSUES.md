# UrSpace — Known Issues

**Document status:** Phase 0 audit, 2026-11-26.

Severity: **S1** blocks use · **S2** breaks a feature or data path · **S3** cosmetic/process risk.

Status: **Confirmed** = reproduced from code, live database or live HTTP ·
**Suspected** = reasoned from evidence but not reproduced · **Unverified** = needs
access or a manual test.

---

## 1. Confirmed issues

### KI-01 — Local `main` is 4 commits behind `origin/main`; working tree holds a superseded auth fix
**Severity:** S1 (release integrity) · **Status:** Confirmed

- Local `HEAD` = `73587e0`. `origin/main` = `4c24808`, i.e. **4 commits ahead**.
- The missing commits are the deployed authentication fixes:
  - `7724205` — "Fix OAuth callback profile recovery" (service-role repair,
    `error=profile` handling)
  - `cdac273` — "Show profile recovery error on login"
  - `8bd23d6` — README wallpaper scope documentation
  - `4c24808` — implementation-log wallpaper scope entry
- The local working tree has **staged but uncommitted** edits to
  `db/schema.sql`, `lib/auth.ts`, `lib/auth-callback.ts` implementing a
  different recovery path (`ensure_profile()` RPC).
- `lib/auth-callback.ts` in the tree is based on the **pre-fix** version.

**Risk:** any commit and push from this tree would revert the deployed OAuth
recovery and drop the `error=profile` alert.

**Impact:** Phase 1/2 work cannot be committed safely until the tree is
reconciled.

**Resolution:** needs approval. Recommended: review the staged diff, discard the
superseded `ensure_profile` approach (or re-implement it on top of current
`main`), then fast-forward to `origin/main` before any new commit.

---

### KI-02 — `SUPABASE_SERVICE_ROLE_KEY` is missing from Vercel
**Severity:** S1 · **Status:** Confirmed

- Vercel project `urspace` production env contains only
  `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  (`hiddenProductionEnvCount: 0`).
- The duplicate `markdown-notes` project has no variables at all.

**Impact:**
1. Admin/owner account creation returns
   "Account provisioning isn't configured yet…".
2. The deployed OAuth profile repair (`createAdminClient()` in
   `lib/auth-callback.ts`) cannot run; affected users land on
   `/login?error=profile`.
3. Owner bootstrap via the app is impossible.

**Resolution:** add the key to the canonical Vercel project (server-only,
Production and Preview), then redeploy. Requires approval — it is a production
security configuration change.

---

### KI-03 — No owner and no administrator accounts exist
**Severity:** S1 · **Status:** Confirmed

Live `profiles`: 5 rows, **all `role = tutor`, `account_status = active`**.
`private.is_owner()` and `private.is_admin()` therefore return false for every
user.

**Impact:** `/admin` is unreachable; no tutor can be managed; no admin can be
created; platform settings cannot be changed.

**Resolution:** Phase 1 — create the owner auth user in the Supabase dashboard,
run `db/owner-setup.sql` with that email, then create staff through
`/admin/settings`. Requires approval (production data write).

---

### KI-04 — Three authenticated users have no `profiles` row
**Severity:** S2 · **Status:** Confirmed (data + code path)

- Live: **8 auth users**, **5 profiles**. 3 users are without profile rows
  (consistent with accounts created before the schema trigger existed).
- **Code path:** password login reads `profiles` and returns
  `"Wrong email or password"` when the row is missing
  (`app/auth/actions.ts`). OAuth callback returns `error=profile` when the
  service-role repair is unavailable.

**Impact:** those accounts cannot reach a dashboard and receive a misleading
error.

**Resolution:** Phase 1/2 — restore the missing rows (or enable a working,
idempotent recovery path), then verify each account. Requires approval before
writing production rows.

---

### KI-05 — `ensure_profile()` referenced in local code but absent from the database
**Severity:** S2 · **Status:** Confirmed

- Live `pg_proc` for `public`/`private` lists 8 functions; `ensure_profile` is
  not among them.
- The local `db/schema.sql` defines it and the local `lib/auth.ts` /
  `lib/auth-callback.ts` call `supabase.rpc("ensure_profile")`.

**Impact:** if the local tree were pushed and deployed without applying the SQL,
recovery silently fails (the RPC error is ignored) and users still bounce.

**Resolution:** either apply the SQL in the same change as the code, or drop the
approach in favour of the deployed service-role path. Not to be merged as-is.

---

### KI-06 — Duplicate Vercel project with no env vars returns HTTP 500
**Severity:** S2 (operational) · **Status:** Confirmed

- Two projects deploy the same repo, branch and `notes` root:
  `urspace` and `markdown-notes`.
- `https://markdown-notes-jet.vercel.app/` → **HTTP 500**; it has zero env vars.
- `https://urspace-seven.vercel.app/` → **HTTP 200**, correct title; `/login` → 200.
- The broken project built the same commit `4c24808` and reported `READY`,
  because Next.js builds without the Supabase variables (the failure is at
  request time).

**Impact:** confusing production debugging; wasted builds; risk of publishing
the wrong URL.

**Resolution:** choose the canonical project (evidence points to `urspace`) and
disable/delete the other. Deleting a Vercel project is destructive and needs
explicit approval.

---

### KI-07 — Background images apply to the entire app, not just the note editor
**Severity:** S2 (requirement gap) · **Status:** Resolved 2026-11-26

- Previously, `BackgroundSettingsProvider` wrapped `(tutor)`, `(account)` and
  `(admin)` layouts and rendered the chosen photo in a fixed `.app-background`
  layer.
- `BackgroundSettingsTrigger` is in the global header and on `/settings`.

**Impact (historical):** contradicted the Phase 3A requirement that wallpapers be restricted
to the note-writing area. The feature exists, but in the wrong scope; it is
**not** the planned wallpaper feature and was not described as implemented.

**Resolution:** the photo layer is gone from all shells. The provider now exposes
`NoteEditorBackdrop`, rendered inside `.note-editor-shell` only, and the app uses
the static themed `AppBackdrop`. The trigger is still in the header and on
`/settings` so the writing-area wallpaper remains reachable.

---

### KI-08 — Background/theme preferences are not persisted server-side
**Severity:** S3 · **Status:** Confirmed

- `user_preferences` table exists (and has RLS), but a repository-wide search
  found **zero references** to it in `app/`, `components/` or `lib/`.
- Theme and background live only in `localStorage`.

**Impact:** preferences do not follow a user across devices; the table is dead
weight. Not a bug per the current brief, but an unfinished capability.

---

### KI-09 — Login does not attempt profile recovery (local tree)
**Severity:** S2 · **Status:** Confirmed for the local tree; resolved on `origin/main`

`app/(public)/login/page.tsx` locally handles `reset`, `error=link` and
`error=oauth` only. Remote `main` adds `error=profile`. Since the local file is
behind, the alert is missing here.

---

### KI-10 — Public GitHub repository
**Severity:** S3 · **Status:** Confirmed

Vercel deployment metadata reports `githubRepoVisibility: public`. No secrets
are committed (`.env*` is gitignored except `.env.example`; a secret sweep
found the service-role key only in `lib/supabase/admin.ts` via `process.env`),
but any accidental commit would be immediately public.

---

## 2. Suspected issues (need verification)

### KI-S1 — Supabase Site URL / redirect allow-list may not include the live domain
**Severity:** S1 if true · **Status:** Suspected
OAuth identities exist, so the flow has worked at some point. Whether the
production origin is currently in the allow-list could not be read. A mismatch
produces `error=oauth` or a redirect to localhost after provider consent.

### KI-S2 — Microsoft/Facebook/X/Apple providers are probably not configured
**Severity:** S3 · **Status:** Suspected
No identities exist for them. They render as buttons that fail with a friendly
message. Not a defect if intentionally unconfigured.

### KI-S3 — Supabase "Allow new users to sign up" toggle state unknown
**Severity:** S2 if off · **Status:** Unverified
Affects new OAuth account creation. The in-app toggle is `true`.

### KI-S4 — No runtime logs reviewed for the live deployment
**Severity:** S3 · **Status:** Unverified
Deployment state is `READY` and pages render, but runtime logs were not
inspected in this audit.

---

## 3. Existing limitations (by design, not defects)

1. **No workspace/sharing model.** The brief's "individual workspaces" is not
   implemented; isolation is per account.
2. **Staff can read tutor notes.** This is disclosed at signup, on the landing
   page and in the terms. No end-to-end-encryption claim is made.
3. **Accounts are suspended, not deleted.** No delete-account UI or flow.
4. **Owner is provisioned only by SQL.** No in-app owner creation.
5. **Six social buttons always render.** Unconfigured providers fail at click
   time rather than being hidden.
6. **Search/tag filtering is client-side** over the tutor's full note list.
7. **No pagination on the tutor dashboard** (admin lists are paginated, 20/page).
8. **No API layer.** The app uses the Supabase Data API through server code.

---

## 4. Previously pushed changes (all on `origin/main`)

| Commit | Date | Summary | Tested when pushed? |
| --- | --- | --- | --- |
| `3fdf209` | 2026-10-29 | Initialise Next.js notes app | not recorded |
| `39a6049` | 2026-10-30 | UrSpace notes, themes, backgrounds | not recorded |
| `69ba6a7` | 2026-10-30 | Merge PR #1 (`note-form`) | not recorded |
| `168ea47` | 2026-11-14 | Full auth/roles/admin/landing implementation | Local lint/tsc/build/tests recorded; authenticated flows **not** verified |
| `2aa7fa1` | 2026-11-14 | Branded favicon; removed temporary auth debug logging | not recorded |
| `73587e0` | 2026-11-14 | Landing page copy update | not recorded |
| `7724205` | 2026-11-14 | OAuth callback profile recovery via service role | **No evidence of live verification** |
| `cdac273` | 2026-11-14 | `error=profile` alert on login | **No evidence of live verification** |
| `8bd23d6` | 2026-11-14 | Document note-editor-only wallpaper scope | documentation only |
| `4c24808` | 2026-11-14 | Record wallpaper scope decision | documentation only |

The authentication changes in `7724205`/`cdac273` **cannot have been verified
in production** while the service-role key is absent (KI-02). They should be
treated as untested in the deployed environment.

---

## 5. Potential regressions

1. Reconciling the local tree (KI-01) could accidentally revert `7724205` if
   the staged `lib/auth-callback.ts` is committed verbatim.
2. Adding the service-role key makes the profile-repair insert live; its
   `23505` tolerance must be confirmed so duplicate profiles cannot occur.
3. Phase 3A changed background scope; theme persistence and the admin/account
   shells must be re-checked after deployment.
4. Any RLS change risks locking staff out, since `private.is_admin()` /
   `is_owner()` depend on active profiles.
5. Removing the duplicate Vercel project could break the URL someone is
   currently using (`markdown-notes-jet.vercel.app` already returns 500).

---

## 6. Investigation status

| Issue | Investigated | Root cause identified | Fix applied |
| --- | --- | --- | --- |
| KI-01 local divergence | Yes | Yes (stale clone + uncommitted alternate fix) | No — needs approval |
| KI-02 missing service key | Yes | Yes | No — needs approval |
| KI-03 no owner/admin | Yes | Yes (owner provisioning never run) | No |
| KI-04 missing profiles | Yes | Yes (pre-trigger accounts) | No |
| KI-05 undeployed RPC | Yes | Yes | No |
| KI-06 duplicate Vercel | Yes | Yes | No |
| KI-07 background scope | Yes | Yes (provider placed in route-group layouts) | Yes — 2026-11-26 (editor-scoped) |
| KI-08 unused preferences | Yes | Yes | No |
| KI-S1..S4 | Partial | No | No |

---

## 7. Outstanding work (ordered)

1. Reconcile git state; do not lose `7724205` (KI-01).
2. Add the service-role key to the canonical Vercel project (KI-02).
3. Provision the owner, then staff (KI-03).
4. Restore the three missing profiles (KI-04).
5. Confirm Supabase URL configuration and provider state (KI-S1..S3).
6. Retire the duplicate Vercel project (KI-06).
7. Proceed to Phase 2 verification, then review the Phase 3 UI on the deployed build.
