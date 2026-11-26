# UrSpace

**Your thoughts deserve a space of their own.**

UrSpace is a private, personal note-taking platform for tutors, with a role-based
administrative system for oversight. Warm editorial design, a Tiptap rich-text
editor, and security enforced at the database layer — not just in the UI.

## Features

- **Tutor workspace** — rich-text notes (headings, lists, quotes, links, code,
  tasks), tags, instant search, statistics, and a one-time import of legacy
  localStorage notes.
- **Note editor wallpapers** — users can choose a wallpaper displayed
  only inside the note-writing/editor area, behind the note content. It does not
  cover the dashboard, navigation, settings, login, or the rest of the app.
  A dimming overlay and light text keep note content readable on every option.
- **Personalization** — light/dark themes, profile display name, and avatar
  upload/replace/remove via Supabase Storage. App-wide pages keep a consistent
  theme without wallpaper backgrounds.
- **Authentication** — email/password signup, login, logout, password recovery
  and reset, server-protected routes, role-based redirects, account suspension.
- **Administration** — tutor management (create, rename, suspend/reactivate,
  reset links), note oversight with search/filter/pagination, an append-only
  audit log, and owner-only platform settings (public signup toggle, platform
  notice) and administrator management.
- **Honest privacy** — tutors are told, at signup and on the landing page, that
  authorized administrators and the owner can view their notes. No misleading
  end-to-end-privacy claims.

## Roles

| Role  | Access |
| ----- | ------ |
| Owner | Everything: admins, tutors, notes, settings, audit. Provisioned once via `db/owner-setup.sql` — never through public signup. |
| Admin | Tutors and their notes only. Cannot create admins, touch the owner, or change roles. |
| Tutor | Their own notes and profile only. |

Authorization is enforced three times over: server-side guards in every action,
PostgreSQL Row Level Security, and triggers protecting `role`, `account_status`,
and identity fields.

## Stack

Next.js 16 (App Router, Turbopack, Cache Components + Partial Prefetching),
React 19, TypeScript (strict), Tailwind CSS v4, Tiptap v3, Zod 4,
Supabase (Auth, Postgres, Storage) via `@supabase/ssr`.

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in your Supabase values
npm run dev                  # http://localhost:3000
```

The app needs its database schema applied before authenticated flows work.
Follow **[docs/SETUP.md](docs/SETUP.md)** for the complete setup: schema, auth
configuration, owner provisioning, verification, and Vercel deployment.

## Scripts

| Command | Purpose |
| ------- | ------- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests (validation, sanitization, role logic) |

## Project layout

```
app/(public)/    landing, login, signup, recovery, suspended, terms
app/(tutor)/     dashboard, notes/[id], note actions
app/(account)/   profile, avatar & password actions
app/(admin)/     admin overview, tutors, notes, settings, activity
app/auth/        auth server actions + /auth/confirm route handler
components/      design system, editor form, admin controls
lib/             auth guards, DALs, validation, Supabase clients
db/              schema.sql, owner-setup.sql, rls-tests.sql
docs/            SETUP.md, IMPLEMENTATION_LOG.md
```

## Documentation

- [Setup & deployment guide](docs/SETUP.md)
- [Implementation log](docs/IMPLEMENTATION_LOG.md) — decisions, changes, and
  verification results as the project was built.