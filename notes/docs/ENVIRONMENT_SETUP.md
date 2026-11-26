# UrSpace — Environment Setup

**Document status:** Phase 0 audit, 2026-11-26.
**No secret values appear in this document, and none should ever be added.**

---

## 1. Required environment variables

The application reads exactly three runtime variables.

| Variable | Purpose | Exposure | Required for |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL, e.g. `https://<project-ref>.supabase.co` | Public (browser) | Everything |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable/anon key used by browser and server clients | Public (browser) | Everything |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key for the Supabase Admin API | **Server only** | Creating accounts; OAuth profile repair |

A fourth variable is used only by tooling, not by the app:

| Variable | Purpose | Exposure | Required for |
| --- | --- | --- | --- |
| `SUPABASE_ACCESS_TOKEN` | Supabase personal access token (Management API) used once to apply `db/schema.sql` | **Server only** | Applying schema from a script; not needed at runtime |

Notes on privacy/security:

- The publishable key is designed to be public. It is protected by RLS.
- The service-role key bypasses RLS. It must never be prefixed with
  `NEXT_PUBLIC_`, never imported into client code, never logged, never
  committed, never pasted into chat.
- `lib/supabase/admin.ts` is guarded by `server-only`, so importing it from a
  client component is a build error.

---

## 2. Where variables are configured

### Local development

- File: `notes/.env.local`.
- Ignored by git: `.gitignore` contains `.env*` with `!.env.example`, so only
  `.env.example` is tracked.
- `.env.example` contains empty keys plus comments describing each one.
- Build-time coupling: `next.config.ts` derives the Supabase image hostname
  from `NEXT_PUBLIC_SUPABASE_URL`, so the variable must be present during
  `next build`.

### Vercel

- Location: Vercel → project → Settings → Environment Variables.
- There are **two** Vercel projects targeting this repository (see §7).
- Verified production state:

| Project | Variables present |
| --- | --- |
| `urspace` (serving the app) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| `markdown-notes` (duplicate) | **none** |

**`SUPABASE_SERVICE_ROLE_KEY` is missing from both projects.** This is a
blocking configuration defect, tracked as KI-02.

---

## 3. Supabase configuration requirements

Project: **`xwebcsemorzywsxdhtja`** (`markdown-notes`), region `eu-west-1`,
PostgreSQL 17.11, status `ACTIVE_HEALTHY`.

### 3.1 Schema

Apply `db/schema.sql` in Supabase → SQL Editor. It is idempotent and creates:

- `profiles`, `notes` (with `tags`), `audit_logs`, `platform_settings`,
  `user_preferences`
- the `private` schema and four `SECURITY DEFINER` authorization helpers
- `handle_new_user` + the `on_auth_user_created` trigger
- `protect_profile_fields`, `protect_note_owner`, `set_updated_at` and their triggers
- RLS policies for all five tables
- the public `avatars` Storage bucket and per-user folder policies

**Verified live:** all five tables, RLS on each, 21 policies, the seven triggers
above, and the four private helpers exist.

**Verified divergence:** the local `db/schema.sql` additionally defines
`public.ensure_profile()`, which is **not present** in the live database. That
local file is uncommitted and not deployed.

### 3.2 Auth URL configuration

Supabase → Authentication → URL Configuration:

- **Site URL:** local `http://localhost:3000`; production must be the live
  origin (`https://urspace-seven.vercel.app`, or the final custom domain).
- **Redirect URLs** should include:
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/auth/confirm`
  - `https://<production-domain>/auth/callback`
  - `https://<production-domain>/auth/confirm`

**Unverified:** the current dashboard values could not be read with the
available access. This must be confirmed in Phase 1.

### 3.3 Providers

- **Email:** enabled; "Confirm email" is intended to be **OFF** (the app
  supports both modes). Live data shows 8 users and 8 confirmed email
  addresses, consistent with confirmation being off or already completed.
- **Google** and **GitHub:** identities exist in `auth.identities`, so both are
  configured.
- **Microsoft (`azure`), Facebook, X (`twitter`), Apple:** no identities; treat
  as unverified/unconfigured.
- Each provider's callback URL is
  `https://xwebcsemorzywsxdhtja.supabase.co/auth/v1/callback`.

### 3.4 Signup toggle

Two independent switches:

1. Supabase global "Allow new users to sign up".
2. In-app `platform_settings.allow_public_signup` — currently `true`.

The in-app switch hides social buttons on `/signup` and blocks email
registration, but the Supabase global switch is what prevents brand-new OAuth
accounts via the login page.

### 3.5 Owner provisioning

There is no in-app owner creation.

1. Supabase → Authentication → Users → Add user (email + strong password,
   chosen in the dashboard).
2. Edit `db/owner-setup.sql`: replace `REPLACE_WITH_OWNER_EMAIL`.
3. Run it in the SQL Editor. It promotes the profile to `owner`, mirrors the
   role into `app_metadata`, and writes an `owner.provisioned` audit entry.

**Live state: this has not been done.** All 5 profiles are `tutor`; there is no
owner and no admin.

---

## 4. OAuth configuration requirements

| Provider | Supabase provider name | Where the OAuth app is created |
| --- | --- | --- |
| Google | `google` | Google Cloud Console → APIs & Services → Credentials → OAuth client ID (Web) |
| GitHub | `github` | GitHub → Settings → Developer settings → OAuth Apps |
| Microsoft | `azure` | Microsoft Entra ID → App registrations |
| Facebook | `facebook` | Meta for Developers → Facebook Login |
| X | `twitter` | X Developer Portal → OAuth 2.0 client |
| Apple | `apple` | Apple Developer → Services ID + Sign in with Apple key |

Common callback for all: `<Supabase project URL>/auth/v1/callback`.
Client secrets belong **only** in the Supabase dashboard.

---

## 5. Local development instructions

```bash
cd notes
npm install
cp .env.example .env.local     # then fill in the three variables
npm run dev                    # http://localhost:3000
```

Checks:

```bash
npm run lint        # ESLint
npx tsc --noEmit    # TypeScript
npm test            # Vitest (34 tests, 4 files)
npm run build       # production build (Cache Components validation)
```

Audit results for this tree (2026-11-26): lint 0 problems, `tsc` exit 0,
34/34 tests pass, build succeeds with 25 route entries.

Local database work (optional, not currently used): `db/rls-tests.sql` creates
throwaway users inside a transaction and rolls back. It requires the schema to
be applied.

---

## 6. Deployment configuration

| Setting | Value |
| --- | --- |
| Vercel project (live) | `urspace` — `prj_0ZkpIpbTPzHDaiPbG5Ck9LtcSnCk` |
| Production alias | `https://urspace-seven.vercel.app` |
| Duplicate project | `markdown-notes` — `prj_3CejLrShxA1MVDhllM5jENcYeFQm` |
| Framework preset | Next.js (auto-detected) |
| Root directory | `notes` |
| Build command | default (`next build`) |
| Node version | 26.x |
| `vercel.json` | none |
| Production branch | `main` |
| Latest deployed commit | `4c24808` |

Deployment flow: push to `main` → Vercel builds the `notes` directory →
production alias updated.

**Known deployment defects**

1. The duplicate `markdown-notes` project has no environment variables and its
   alias returns HTTP 500.
2. The live project lacks `SUPABASE_SERVICE_ROLE_KEY`.
3. Two projects deploy the same branch and root directory, which wastes build
   minutes and makes "which URL is production?" ambiguous.

---

## 7. Required Vercel variables (checklist for Phase 1)

- [x] `NEXT_PUBLIC_SUPABASE_URL` — present on `urspace`
- [x] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — present on `urspace`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — **missing**
- [ ] Decide which project is canonical and retire or disable the other

Adding the service-role key is a production configuration change with security
impact; it requires explicit approval before being performed.
