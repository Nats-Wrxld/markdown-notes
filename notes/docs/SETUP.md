# UrSpace — Setup & Deployment Guide

This guide takes a fresh clone to a fully working local environment and then to
a Vercel deployment. Steps marked **required** must be done before the
corresponding features work; nothing here is optional guesswork.

Supabase project used during development: `xwebcsemorzywsxdhtja`
(`https://supabase.com/dashboard/project/xwebcsemorzywsxdhtja`).

---

## 1. Environment variables (required)

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Where to find it | Exposure |
| -------- | ---------------- | -------- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL | Public |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys → publishable key | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API Keys → service_role (secret) | **Server only** |

Rules:

- The service-role key is used **only** by `lib/supabase/admin.ts` (guarded by
  `server-only`) for account provisioning. Never prefix it with `NEXT_PUBLIC_`,
  never import it into client code, never commit it, never paste it into chat.
- `.env.local` is gitignored (`.env*` with `!.env.example`).
- Without the service-role key everything works **except** staff account
  creation, which shows a clear configuration error.

## 2. Database schema (required)

1. Open Supabase Dashboard → **SQL Editor**.
2. Paste the full contents of [`db/schema.sql`](../db/schema.sql) and run it.

The script is idempotent — safe on a fresh project or over the Phase 1
notes-only schema. It creates:

- `profiles`, `notes` (with `tags`), `audit_logs`, `platform_settings`,
  `user_preferences`
- the `private` schema with `SECURITY DEFINER` authorization helpers
  (no recursive RLS)
- the signup trigger (`handle_new_user`) — role comes from `app_metadata`,
  never from user-editable `user_metadata`; public signups always become tutors
- the protected-field trigger (`protect_profile_fields`) and immutable note
  ownership trigger
- Row Level Security policies for every table (tutor isolation, staff
  oversight, owner-only settings writes, append-only audit)
- the public `avatars` Storage bucket with per-user-folder write policies

Do not run destructive changes against production data. The script only adds
or replaces its own objects.

## 3. Auth configuration (required)

Supabase Dashboard → **Authentication**:

1. **Providers → Email**: enabled. Turn **"Confirm email" OFF** for the
   intended setup — signup then signs the user in immediately and no custom
   email provider / SMTP configuration is needed. (The app also supports
   confirmation-enabled mode: signup shows a "check your email" message and
   `/auth/confirm` completes sign-in. Supabase's built-in email delivery
   sends those links out of the box, rate-limited; custom SMTP is only worth
   configuring later for production volume.)
2. **URL Configuration**:
   - Site URL: `http://localhost:3000` for local development.
   - Redirect URLs (add all four):
     - `http://localhost:3000/auth/callback` (OAuth sign-in)
     - `http://localhost:3000/auth/confirm` (email confirmation / recovery)
     - `https://<your-production-domain>/auth/callback` (after deploying)
     - `https://<your-production-domain>/auth/confirm` (after deploying)
3. **Social providers** (optional — each enables its "Continue with …"
   button). The app ships buttons for **Google, GitHub, Microsoft, Facebook,
   X (Twitter), and Apple**. Enable only the ones you configure; an
   unconfigured provider shows a clear "could not start sign-in" error and
   never blocks email auth. For every provider the OAuth app's redirect /
   callback URI is the same Supabase endpoint:
   `https://xwebcsemorzywsxdhtja.supabase.co/auth/v1/callback`.

   | Provider | Supabase name | Where to create the OAuth app |
   | -------- | ------------- | ----------------------------- |
   | Google | `google` | Google Cloud Console → APIs & Services → Credentials → OAuth client ID (Web) |
   | GitHub | `github` | GitHub → Settings → Developer settings → New OAuth App |
   | Microsoft | `azure` | Microsoft Entra ID → App registrations → New registration (Web redirect URI) |
   | Facebook | `facebook` | Meta for Developers → Create App → Facebook Login |
   | X (Twitter) | `twitter` | X Developer Portal → Projects & Apps → OAuth 2.0 client |
   | Apple | `apple` | Apple Developer → Certificates, IDs & Profiles → Services ID + Sign in with Apple key |

   Paste each provider's client ID / secret (and Apple's team ID / key ID /
   private key) into **Supabase → Authentication → Providers** and enable it.
   Secrets go **only** into the Supabase dashboard — never into this
   repository, `.env.local`, or chat. Apple and X require a paid developer
   account; Microsoft/Facebook need the app reviewed for public use.
4. **"Allow new users to sign up"** (Authentication → Providers, global
   toggle): keep ON while public registration is open. The in-app
   `allow_public_signup` owner switch hides social sign-up on `/signup` and
   blocks email registration, but this Supabase toggle is what prevents
   brand-new OAuth accounts from being created via the login page when
   registration is closed.

OAuth users are created as **tutors** automatically (the `handle_new_user`
trigger reads role from `app_metadata`, which providers never set). Their
display name comes from the provider profile (`full_name` / `name`), falling
back to the email local part. `/auth/callback` exchanges the OAuth code,
audits the sign-in, checks suspension, and routes by role (tutors →
`/dashboard`, staff → `/admin`). Cancellation or provider errors redirect to
`/login?error=oauth` with a friendly message.

Password recovery uses the same `/auth/confirm?next=/reset-password` redirect
and Supabase's built-in email delivery — no custom email provider required.

## 4. Owner provisioning (required, one time)

There is **no public owner registration** and no hardcoded credentials.

1. Supabase Dashboard → **Authentication → Users → Add user**: create the owner
   with their email and a strong password. Choose the password yourself in the
   dashboard — it never goes into this repository or into chat.
2. Open [`db/owner-setup.sql`](../db/owner-setup.sql), replace
   `REPLACE_WITH_OWNER_EMAIL` with that email, and run it in the SQL Editor.
   It promotes the profile to `owner`, mirrors the role into `app_metadata`,
   and records an `owner.provisioned` audit entry.
3. Sign in at `/login` — the owner lands on `/admin`.

From then on, the owner creates admins and tutors from
`/admin/settings` and `/admin/tutors` (uses the service-role key server-side).

## 5. Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

Checks:

```bash
npm run lint       # ESLint
npx tsc --noEmit   # TypeScript
npm test           # Vitest unit tests
npm run build      # Production build (Cache Components validation)
```

## 6. Verification checklist

### Automated (no external state)

- `npm test` — 28 unit tests covering link sanitization, the Tiptap document
  allowlist, Zod validation (including that `owner` can never be requested via
  account creation), role routing, and note statistics.

### Database authorization (after step 2)

Run [`db/rls-tests.sql`](../db/rls-tests.sql) in the SQL Editor. It creates
throwaway users **inside a transaction and rolls everything back** — no
persistent test data. It asserts tutor isolation, privilege-escalation
blocking, suspension enforcement, and staff oversight boundaries. Any failed
assertion raises an exception naming the check.

### Manual journeys (after steps 2–4)

- Signup → confirmation (if enabled) → tutor lands on `/dashboard`.
- Signup: mismatched confirm-password shows “Passwords do not match.”; the
  strength meter reacts while typing and clears after a successful submit.
- Social sign-in (after configuring a provider in step 3.3): “Continue with
  …” → provider consent → `/auth/callback` → tutor lands on `/dashboard`; a
  brand-new OAuth user gets a tutor profile with their provider name.
  Cancelling at the provider returns to `/login` with a friendly message.
- Create/edit/delete a note; rich text, tags, search, stats update.
- `/notes/[id]` of another tutor's note → 404 for a tutor.
- Profile: rename, change password, upload/replace/remove avatar.
- Owner: create an admin and a tutor; suspend the tutor → their existing
  session loses access on the next request (`/suspended`); reactivate.
- Admin: view/search tutor notes, edit/delete with audit entries; confirm an
  admin cannot open `/admin/settings` or create admins.
- Invalid login shows exactly “Wrong email or password”.
- Owner: toggle public signup off → `/signup` refuses new registrations and
  hides social sign-up buttons; set a platform notice → shown on landing and
  signup.

## 7. Deploy to Vercel

1. Push the repository to GitHub (`.env.local` is ignored; verify with
   `git status` before the first commit).
2. Vercel → **Add New → Project** → import the repository. Framework preset:
   Next.js (auto-detected). No `vercel.json` is needed.
3. **Environment Variables** — add all three variables from step 1 to the
   Production (and Preview) environments. The service-role key must be added
   here too; it stays server-side on Vercel.
4. Deploy.
5. After the first successful deployment, update Supabase Auth:
   - Site URL → `https://<your-production-domain>`
   - Add `https://<your-production-domain>/auth/callback` and
     `https://<your-production-domain>/auth/confirm` to Redirect URLs.
6. Re-run the manual journeys against the production URL.

The app is deployment-ready when `npm run build` passes and the steps above
are complete. **It is not "deployed" until a Vercel deployment has actually
succeeded and the production URL serves the app.**

## 8. Security model at a glance

- Sessions: `@supabase/ssr` cookie sessions, refreshed in `proxy.ts`;
  `getUser()` (JWT validated against the Auth server) is used for every
  authorization decision — never `getSession()` alone.
- Every server action re-authorizes (`requireUser` / `requireStaff` /
  `requireOwner`) and re-checks the target (no self-modification, owner rows
  untouchable, admins limited to tutors).
- RLS mirrors the same boundaries in the database; triggers make `role`,
  `account_status`, email, and note ownership immutable outside trusted paths.
- Note bodies are sanitized against a Tiptap node/mark allowlist on write and
  re-validated at render; links restricted to http/https/mailto.
- Avatars: type/size validated client- and server-side; per-user Storage
  folders; previous objects cleaned up on replace/remove.
- Sensitive operations are appended to `audit_logs` (staff-readable only).
- Suspension is enforced server-side **and** in RLS — a suspended user cannot
  regain access by URL manipulation or an existing session.