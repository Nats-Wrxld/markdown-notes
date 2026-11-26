# UrSpace — Project Overview

**Document status:** Phase 0 audit, written 2026-11-26.
**Source of truth:** the repository at `notes/` and the live Supabase project. Every
statement below is either (a) verified from repository code/config, (b) verified
from the live Supabase database, or (c) explicitly labelled **unverified**.

---

## 1. What UrSpace is

UrSpace is a **personal note-taking web application for tutors**, with a
role-based administrative layer for oversight.

- Tagline (in `app/layout.tsx` metadata and the landing page): *"Your thoughts
  deserve a space of their own."*
- It is a multi-user, account-based application. Notes are stored in Supabase
  PostgreSQL, not in the browser.
- It is **not** a collaborative or shared-workspace product. There is no team
  workspace, sharing, or note-level collaboration in the code.

### Branding

- Name: **UrSpace**.
- Visual identity: warm cream/terracotta editorial palette, Fraunces serif
  headings, Geist body font, lavender accents, a stylised notebook mark and the
  `UrS·pace` wordmark with a flipped "p" (`.urspace-flip`).
- Branding assets in `app/`: `favicon.ico`, `icon.svg`, `apple-icon.png`.
- **Branding must be preserved.** No logo, wordmark, palette or copy change
  should be made without explicit approval.

---

## 2. Project purpose and intended functionality

| Goal | State |
| --- | --- |
| Give each tutor a private place to write and organise notes | Implemented in code; note CRUD not yet exercised live because the live DB has 0 notes |
| Separate users' data completely | Implemented in code and in RLS; not yet proven with two live accounts |
| Give staff (admin/owner) oversight of tutors and their notes | Implemented in code; **not usable live** — no admin or owner account exists (see §7) |
| Offer calm personalisation (theme, editor wallpaper, avatar) | Implemented; wallpapers render only inside the note editor |
| Provide a real backend (not just auto-generated DB access) | **Not started** (Phase 4). The app currently uses Supabase's Data API through the SDK plus Next.js Server Actions |

---

## 3. Existing features

Status key: **Verified** = observed working in this audit · **Implemented,
unverified** = code exists, checks pass, live flow not exercised · **Planned** =
agreed but not built.

### 3.1 Public site
- **Implemented, unverified (live page verified HTTP 200):** landing page at `/`
  with hero video, poster fallback, feature band, privacy disclosure, notebook
  preview, final CTA, footer.
- **Verified:** `/terms` privacy/administrative-access terms page.
- **Verified:** platform notice slot on landing + signup (currently empty;
  `platform_notice` = `""` in the database).

### 3.2 Authentication
- **Implemented, unverified:** email/password signup, login, logout, password
  reset request and reset completion.
- **Implemented, unverified:** six social sign-in buttons — Google, GitHub,
  Microsoft (`azure`), Facebook, X (`twitter`), Apple.
  Live database evidence shows OAuth identities have been created for **Google
  (1)** and **GitHub (1)**, so those two providers are configured at Supabase;
  a completed browser round-trip was not performed in this audit. Microsoft,
  Facebook, X and Apple have **no** live identities, so they are
  **unverified/unconfigured**.
- **Verified in code:** suspension handling at the layout guard and callback.
- **Verified in code:** password-strength meter, confirm-password validation,
  show/hide password toggles.

### 3.3 Roles and access
- **Implemented, unverified:** three roles — `owner`, `admin`, `tutor` — with
  server-side guards, RLS and protected-field triggers.
- Live data: **5 profiles, all `tutor`, all `active`; zero admins, zero owners.**

### 3.4 Tutor workspace
- **Implemented, unverified:** `/dashboard` with statistics (total, this week,
  tags), note composer, search across title/body/tags, tag filter, note cards,
  per-note edit and delete with confirmation.
- **Implemented, unverified:** `/notes/[id]` note detail with view/edit/delete.
- **Implemented, unverified:** rich-text editor (Tiptap 3) — headings 1–3,
  bold/italic/underline/strike, links (http/https/mailto only), bullet,
  numbered and task lists, undo/redo, clear formatting.
- **Implemented, unverified:** one-time import of legacy `localStorage` notes,
  offered only when the account has zero server-side notes (500-note cap).

### 3.5 Account
- **Implemented, unverified:** `/profile` — display name, avatar
  upload/replace/remove, password change, read-only account details.
- **Implemented, unverified:** `/settings` — theme toggle, Notes section with the
  wallpaper picker, link to profile.

### 3.6 Administration
- **Implemented, unverified:** `/admin` overview (stats, recent notes, recent
  activity).
- **Implemented, unverified:** `/admin/tutors` list with search/status filter/
  pagination; account creation (service-role Admin API); `/admin/tutors/[id]`
  detail with rename, suspend/reactivate, reset link, tutor notes.
- **Implemented, unverified:** `/admin/notes` oversight list and
  `/admin/notes/[id]` read/edit/delete with audit entries.
- **Implemented, unverified:** `/admin/activity` append-only audit trail.
- **Implemented, unverified:** `/admin/settings` owner-only signup toggle,
  platform notice, and administrator management.

### 3.7 Appearance
- **Implemented, unverified:** light/dark themes with no-flash bootstrap script
  and `localStorage` persistence (`urspace:theme`).
- **Implemented:** five wallpapers + "Plain" for the note editor,
  stored in `localStorage` (`urspace:background`).
- **Current behaviour:** the wallpaper is rendered **inside the note editor** only
  (`NoteEditorBackdrop` inside `.note-editor-shell`); the app shells use a static
  themed backdrop and keep their surfaces unchanged. It is chosen from the Note
  options menu in the notes section or from Settings → Notes; the top bar holds
  only the identity pill and a settings gear menu.

### 3.8 Planned, not implemented
- **Cross-device wallpaper persistence** (today it is per-browser, like the theme).
- **Cross-device theme/background persistence.** A `user_preferences` table
  exists in the database, but **no code reads or writes it** (verified: zero
  references in `app/`, `components/`, `lib/`).
- **API layer** via Next.js Route Handlers (Phase 4). Not started.
- **Individual workspaces** mentioned in the project brief. No workspace model
  exists in the schema or code.

---

## 4. Technology stack (verified from `package.json` and config)

| Layer | Technology | Version |
| --- | --- | --- |
| Framework | Next.js (App Router, Turbopack, Cache Components, Partial Prefetching) | 16.4.3 |
| UI runtime | React / React DOM | 19.3.0 |
| Language | TypeScript (strict) | ^5 |
| Styling | Tailwind CSS v4 via `@tailwindcss/turbopack` | ^4 |
| Editor | Tiptap (`react`, `starter-kit`, task list/item, underline) | ^3.32.1 |
| Validation | Zod | ^4.6.7 |
| Auth/DB client | `@supabase/ssr` / `@supabase/supabase-js` | 0.12.7 / 2.119.0 |
| Animation | `motion` | ^14.14.0 |
| Tests | Vitest | ^5.1.0 |
| Session refresh | `proxy.ts` (Next 16 replacement for middleware) | — |
| Hosting | Vercel | — |
| Repository | GitHub `Nats-Wrxld/markdown-notes` (public) | — |

Notable config in `next.config.ts`: `cacheComponents: true`,
`partialPrefetching: true`, a Turbopack CSS rule, and Supabase Storage
`images.remotePatterns` derived from `NEXT_PUBLIC_SUPABASE_URL`.

---

## 5. Repository structure

```
markdown-notes/                ← git repository root
└── notes/                     ← Next.js app (Vercel rootDirectory)
    ├── app/
    │   ├── (public)/          landing, login, signup, forgot/reset, suspended, terms
    │   ├── (tutor)/           dashboard, notes/[id], note server actions
    │   ├── (account)/         profile, settings, account server actions
    │   ├── (admin)/           admin overview, tutors, notes, settings, activity
    │   ├── auth/              auth server actions + /auth/callback, /auth/confirm
    │   ├── layout.tsx         root layout, fonts, metadata, theme bootstrap
    │   ├── template.tsx       route transition wrapper
    │   ├── rich-text-editor.tsx, note-content.tsx, note-storage.ts
    │   ├── theme-provider.tsx, background-settings.tsx, globals.css
    │   └── icon.svg, favicon.ico, apple-icon.png
    ├── components/            design system, editor form, auth UI, admin controls, motion
    ├── lib/                   auth guards, DALs, validation, Supabase clients, document parsing
    ├── db/                    schema.sql, owner-setup.sql, rls-tests.sql
    ├── docs/                  existing SETUP.md, IMPLEMENTATION_LOG.md + this audit set
    ├── tests/                 Vitest suites + server-only stub
    ├── proxy.ts               session refresh
    └── public/                backgrounds/, hero/, illustrations/
```

---

## 6. Deployment

| Item | Verified value |
| --- | --- |
| Git remote | `https://github.com/Nats-Wrxld/markdown-notes.git` |
| Production branch | `main` |
| Vercel project **serving the app** | `urspace` (`prj_0ZkpIpbTPzHDaiPbG5Ck9LtcSnCk`) |
| Production alias | `https://urspace-seven.vercel.app` |
| Deployment state | `READY`, promoted to production |
| Deployed commit | `4c24808` — "Record note editor wallpaper scope decision" |
| Build root directory | `notes` |
| Live HTTP check | `/` → 200 with title "UrSpace — Your thoughts deserve a space of their own"; `/login` → 200 |
| Duplicate Vercel project | `markdown-notes` (`prj_3CejLrShxA1MVDhllM5jENcYeFQm`), same repo/branch/root, **no environment variables**, `https://markdown-notes-jet.vercel.app` returns **HTTP 500** |

There is no `vercel.json` and no `.vercel` directory in the repo; the Vercel
project configuration lives in the Vercel dashboard.

**Production environment variables present:** `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` only. `SUPABASE_SERVICE_ROLE_KEY` is
**absent** (see `KNOWN_ISSUES.md`, KI-02).

---

## 7. Current project status

| Area | Status |
| --- | --- |
| Codebase completeness | All planned tutor/account/admin surfaces exist; lint, typecheck, unit tests and production build pass locally |
| Supabase project | `xwebcsemorzywsxdhtja` — **ACTIVE_HEALTHY**, PostgreSQL 17.11 |
| Database schema | 5 tables + RLS + triggers present; **`ensure_profile()` missing** |
| Accounts | 8 auth users, **5 profile rows — all tutors**; 3 auth users have no profile |
| Notes | 0 rows |
| Owner/admin access | **None provisioned** — `/admin` is unreachable for any current account |
| Google/GitHub OAuth | Identities exist for both; full round-trip not re-tested in this audit |
| Other OAuth providers | Configured buttons; no identities; unverified |
| Wallpaper-in-editor | **Implemented** — rendered only inside the note editor; visual review pending |
| API layer | **Not started** |

**Phase 0 outcome:** documentation and audit complete; Phase 1 (backend
restoration) has been *pre-audited* here but its corrective actions require
approval (see `IMPLEMENTATION_PLAN.md`).

---

## 8. Features planned for the future

1. **Phase 1 — Backend restoration:** provision the owner, restore missing
   profiles, add the service-role key to Vercel, reconcile the deployed
   callback, retire the broken duplicate Vercel project.
2. **Phase 2 — Authentication and account routing:** verify Google/GitHub
   sign-up and login, returning users, profile creation/recovery, role routing,
   data separation, suspension and account switching.
3. **Phase 3 — UI improvements (implemented 2026-11-26):** note-editor-only wallpapers; card/panel
   cohesion; light-mode consistency; dark-mode contrast and surface hierarchy;
   dashboard layout and responsive review.
4. **Phase 4 — API assignment:** Next.js Route Handlers over Supabase for
   notes (and supporting resources), with validation, auth checks, Postman
   tests and documentation.
5. **Phase 5 — Final verification and deployment.**
