# UrSpace Implementation Log

## 2026-11-13 — Architecture assessment (pre-implementation)

### Inspected
- `package.json`: Next.js 16.4.3 (App Router, Turbopack, `cacheComponents` + `partialPrefetching`), React 19.3, TS strict, Tailwind v4, Tiptap v3, `@supabase/ssr` 0.12.7 + `supabase-js` 2.119.0 (Phase 1).
- `app/page.tsx`: single-page localStorage notebook (hero + NoteForm).
- `app/note-form.tsx` (590 lines): create/edit/delete/search/tag-filter, `useActionState`, unsaved-changes indicator.
- `app/rich-text-editor.tsx`: Tiptap StarterKit + Underline + TaskList/TaskItem, full toolbar, a11y attributes.
- `app/note-content.tsx`: safe allowlisted Tiptap JSON renderer (no dangerouslySetInnerHTML).
- `app/actions.ts`: `checkNote` server action — validates + sanitizes Tiptap JSON (allowlisted nodes/marks). Reusable for server-side note validation.
- `app/note-storage.ts`: localStorage load/persist with corruption/duplicate handling.
- `app/theme-provider.tsx`, `app/background-settings.tsx`: light/dark theme + 5 photo backgrounds, localStorage-persisted, native `<dialog>`.
- `app/globals.css`: warm cream/terracotta token system, dark theme, editor styles.
- Phase 1 Supabase foundation: `lib/supabase/{client,server}.ts`, `proxy.ts`, `.env.example`, `db/schema.sql` (notes + RLS). Lint/tsc/build pass.

### Working today
Note CRUD (localStorage), rich text, tags, search, themes, backgrounds, responsive layout, a11y basics.

### Missing vs brief
Auth UI, profiles/roles, admin & owner dashboards, landing page, Supabase-backed notes, avatars/Storage, suspension, audit logs, deployment config, tests.

### External access status
- Supabase project `xwebcsemorzywsxdhtja`: **no credentials available locally** (no `.env.local`, no CLI, MCP exposes docs search only). Cannot apply SQL or verify live auth/RLS until user provides keys + runs SQL. All code work proceeds independently.
- No git repository initialized locally (GitHub remote exists per brief; not cloned with .git).
- No Docker → no local Supabase stack.

### Target architecture
- Route groups: `(public)` landing + auth, `(tutor)` workspace, `(admin)` oversight. Server Components default; client only for interactivity.
- Auth: Supabase email/password, Zod-validated server actions, proxy session refresh (exists), server-side `requireUser`/`requireRole` in layouts. Suspension enforced in RLS helpers + server checks.
- DB: `profiles` (role/account_status), `notes` (+`tags`), `audit_logs`, `platform_settings`, `user_preferences`. Role helpers as SECURITY DEFINER functions in non-exposed `private` schema (no RLS recursion). Notes policies: tutor own-row CRUD; staff read/manage. Profile protected fields guarded by trigger.
- Owner provisioning: dashboard-created auth user + SQL promote script (no hardcoded credentials, no public owner signup). Admin/tutor creation by staff via server-only service-role client (never in browser).
- Storage: public `avatars` bucket, per-user folder write policies, type/size validation.
- Existing notebook moves to `/dashboard` with Supabase persistence; Tiptap editor, themes, backgrounds, tags preserved; optional one-time localStorage import.

## Implementation entries
(appended as work proceeds)

## 2026-11-13 — Auth system (brief: email/password, roles, protected routes)

### Added
- `lib/types.ts`, `lib/validation.ts` (Zod), `lib/auth.ts` (DAL: `getCurrentProfile`, `requireUser`, `requireRole`, `requireOwner`, `requireStaff`), `lib/audit.ts`, `lib/supabase/admin.ts` (server-only service-role client, returns null when key absent).
- `app/auth/actions.ts`: signUp / logIn / logOut / requestPasswordReset / resetPassword. Invalid login returns exactly "Wrong email or password"; reset always generic success (no email-existence leak). Role read from `profiles` (DB), never from browser or `user_metadata`.
- `app/auth/confirm/route.ts`: exchanges `?code`, validates `next` is a local path only.
- `(public)` pages: login, signup (with admin-oversight privacy disclosure), forgot-password, reset-password, suspended.
- `components/ui.tsx` (client primitives), `components/auth-shell.tsx`, `components/auth-forms.tsx` (client form wrappers).

### Key decisions
- **cacheComponents + Suspense**: with `cacheComponents: true`, any `cookies()`/`searchParams` read must sit behind a `<Suspense>` boundary (build error otherwise). Layouts push the session read into an async child inside `<Suspense>`; pages that read runtime data wrap it likewise. Verified via `next build` (routes show as Partial Prerender).
- **Per-request authz cache**: `getCurrentProfile` uses React `cache()` (request-scoped), NOT `use cache: private`, so suspension/role changes are never served stale across requests. Real-time gate is `proxy.ts` `getUser()` + RLS.
- **Server→client boundary**: render-prop functions cannot cross from a Server Component into a Client Component. Each auth form's render prop lives in a dedicated client component (`auth-forms.tsx`); pages pass only serializable props/elements.
- `components/ui.tsx` marked `"use client"` (uses `useFormStatus`).

### Verification
- `npm run lint`, `npx tsc --noEmit`, `npm run build` all pass.
- Browser: `/login` and `/signup` render (serif headings, warm palette, privacy disclosure present); `/dashboard` redirects unauthenticated users to `/login`; no console errors.
- **Blocked on user**: live signup/login/session flows require `db/schema.sql` applied to the Supabase project (tables do not exist yet). Not claimed as verified.

## 2026-11-13 — Tutor dashboard & Supabase notes (brief: CRUD, search, tags, stats, note pages)

### Added
- `lib/notes.ts` (DAL: `getMyNotes`, `getMyNote`, `summarizeNotes`), `app/(tutor)/actions.ts` (createNote / updateNote / deleteNote / importLocalNotes; each re-authorizes via `getCurrentProfile`, scopes writes by `user_id` + RLS, Zod + Tiptap sanitization).
- `app/(tutor)/layout.tsx`: ThemeProvider + BackgroundSettingsProvider + `<Suspense>` → `requireRole(["tutor"])` shell + `AppHeader`.
- `app/(tutor)/dashboard/`: `page.tsx` (stats + import banner + notebook), `notebook.tsx` (composer, search, tag filter, cards, empty states), `import-notes.tsx` (one-time localStorage import, only offered when the account has no notes).
- `app/(tutor)/notes/[id]/`: `page.tsx` (ownership-scoped fetch, `notFound()` otherwise) + `note-detail.tsx` (view/edit/delete).
- `components/note-editor-form.tsx` (shared create/edit form), `components/app-header.tsx` (role-aware nav, theme/appearance, logout).

### Changed
- `app/rich-text-editor.tsx`: removed redundant `Underline` import (StarterKit v3 bundles it); configured bundled `Link` (http/https/mailto only, `rel="noopener noreferrer nofollow"`); added link toolbar tool with inline URL editor.
- `app/note-content.tsx`: renders `link` marks with `safeLinkHref` re-validation at render time.
- `app/note-storage.ts`: reduced to import-only helpers (`loadNotes`, keys), reusing `parseNoteBody`.
- `app/page.tsx`: temporary redirect to `/dashboard` (landing page replaces it in a later entry).
- Removed retired `app/note-form.tsx` and `app/actions.ts` (localStorage notebook fully migrated).
- `app/globals.css`: added `ui-button` base + danger/ghost, `ui-alert` tones, `ui-badge`, `ui-spinner`, `ui-skeleton`, `ui-surface-subtle/selected`, lavender accent tokens, `--font-serif` (Fraunces), link + link-row styles.
- `app/layout.tsx`: Fraunces serif via `next/font`; title template.

### Key decisions
- Notes are server-authoritative: mutations call server actions then `router.refresh()`; no client-side source of truth. Search/tag filter run client-side over the fetched set (tutor's own notes).
- Form success/reset handled inside the `useActionState` action wrapper (not `useEffect`) to satisfy React 19 `set-state-in-effect`; mount-time localStorage reads deferred via `setTimeout(0)` per existing convention; `Date.now()` moved out of component render into `summarizeNotes` (purity rule).
- Delete uses a confirm step (permanent server-side deletion).

### Verification
- lint / tsc / build pass; `/dashboard` partial-prerenders and redirects when unauthenticated.
- **Blocked on user**: note CRUD, search, stats, import, and `/notes/[id]` ownership require `db/schema.sql` applied. Not claimed as verified end-to-end.

## 2026-11-13 — Profile management & avatars (brief: display name, password, photo upload/replace/remove)

### Added
- `app/(account)/layout.tsx`: shared authenticated shell (`requireUser()` — any active role) inside `<Suspense>`; ThemeProvider + BackgroundSettingsProvider + `AppShell`.
- `components/app-shell.tsx`: header + main + footer chrome shared by tutor and account areas.
- `app/(account)/actions.ts`: `updateDisplayName` (Zod), `changePassword` (Zod + `auth.updateUser` + `password_changed` audit), `uploadAvatar`, `removeAvatar`.
- `app/(account)/profile/`: `page.tsx` (photo / name / password / read-only account details + tutor privacy reminder), `profile-forms.tsx` (client), `avatar-manager.tsx` (client preview + upload/replace/remove).
- `components/avatar.tsx`: `next/image` avatar with initial fallback; header identity pill now shows it.
- `next.config.ts`: `images.remotePatterns` for the Supabase Storage public host.

### Key decisions
- Avatar writes go through the user's own Supabase client (Storage RLS: per-user folder), never the service-role key. Path `${userId}/${uuid}.${ext}`; type/size validated client-side AND server-side (JPEG/PNG/WebP ≤ 2 MB). Upload-then-update with rollback of the uploaded object if the profile update fails; previous object removed after replace/remove.
- `removeAvatar()` takes no arguments (called directly via `useTransition`, not as a form action) — avoids unused-parameter lint warnings under the default `after-used` rule.
- Profile reads use the request-cached `getCurrentProfile()`; role/status/email are read-only in the UI (protected columns are guarded server-side by the DB trigger).
- Success handling (password field reset, `router.refresh()`) stays inside the `useActionState` wrapper per the established React 19 pattern.

### Verification
- lint / tsc / build pass; `/profile` partial-prerenders; unauthenticated visit redirects to `/login`; console clean.
- **Blocked on user**: live name/password/avatar flows require `db/schema.sql` + the `avatars` bucket policies applied. Not claimed as verified end-to-end.

## 2026-11-13 — Admin & Owner dashboards (brief §10: oversight, tutor management, settings, audit)

### Added
- `lib/admin.ts` (server-only DAL): paginated tutor/note/audit lists (20/page, exact counts), admin stats, tutor detail, note+owner fetch, admin list, tutor options, platform settings. Search text is stripped of PostgREST `or`-syntax characters before ilike embedding. Notes→profiles and audit→actor joins done with a follow-up `.in()` query (no FK between notes.user_id and profiles, so no implicit PostgREST join).
- `app/(admin)/layout.tsx`: `requireStaff()` shell inside `<Suspense>` (owner + admin).
- `app/(admin)/actions.ts`: `createAccount`, `setAccountStatus`, `updateAccountName`, `sendResetLink`, `adminUpdateNote`, `adminDeleteNote`, `updatePlatformSettings`.
- `app/(admin)/admin/`: `page.tsx` (stats, recent notes, recent activity), `tutors/page.tsx` (search/status filter/pagination + create account), `tutors/[id]/page.tsx` (profile, rename, suspend/reactivate, reset link, paginated notes), `notes/page.tsx` (title search + tutor filter + pagination), `notes/[id]/page.tsx` (read view + staff edit/delete), `settings/page.tsx` (owner-only: signup toggle, platform notice, admin management), `activity/page.tsx` (paginated audit trail).
- `components/admin/`: `account-controls.tsx` (status/rename/reset), `create-account-form.tsx`, `settings-form.tsx`, `note-oversight.tsx` (edit/delete), `note-card.tsx`.
- `components/pagination.tsx`: server-rendered prev/next preserving query params.

### Changed
- `components/app-header.tsx`: staff nav (Tutors / Notes / Activity; Settings for owner only).

### Key decisions / security boundaries
- Every action re-authorizes server-side (`requireStaff`/`requireOwner`) AND is constrained by RLS + the `protect_profile_fields` trigger. Shared `resolveTarget` guard: owner rows never modifiable, no self-modification, admins limited to tutor targets. Admins cannot create admins (server check); role for provisioned users comes from `app_metadata` via the service-role Admin API — never from the browser.
- Account provisioning uses `createAdminClient()` (server-only, service-role key from env, `email_confirm: true`); clear error when the key is absent. Passwords are never logged.
- Note oversight reads/edits/deletes run through the staff member's own client — RLS limits them to tutor notes; every staff edit/delete is audited (`note.updated_by_staff`, `note.deleted_by_staff`).
- Settings writes are owner-only at both the action and RLS layer; signup toggle already honored by `signUp`.
- Destructive actions (suspend, delete note, reset link) require a confirm step.

### Verification
- lint / tsc / build pass; all 7 admin routes partial-prerender.
- Browser: `/admin` and `/admin/settings` redirect unauthenticated users to `/login`; console clean.
- **Blocked on user**: authenticated admin/owner journeys (role redirects, provisioning, suspension, oversight, settings, audit) require `db/schema.sql` applied + owner provisioned + service-role key in `.env.local`. Not claimed as verified end-to-end.

## 2026-11-13 — Public landing page, terms, platform notice (brief §11)

### Added
- `app/(public)/page.tsx`: full landing — nav (auth-aware CTA via `<Suspense>`), hero with the brief's headline + floating note-card mock built from real product classes, realistic notebook preview (search pill, New note, three sample cards with rich text/tags), six feature cards, privacy & security section with the explicit admin-access disclosure (no E2E-privacy claims), four-step how-it-works, final CTA, footer (Product / Trust / About, terms + privacy links).
- `app/(public)/terms/page.tsx`: plain-language terms including the administrative-access clause.
- `components/platform-notice.tsx`: async owner-configured notice (public settings read), shown on landing + signup inside `<Suspense>`.

### Changed
- Deleted the temporary `app/page.tsx` redirect (route conflict with the new landing).
- `app/(public)/signup/page.tsx`: renders the platform notice above the form.
- `app/globals.css`: `.landing-float` keyframes (disabled by the existing reduced-motion block).

### Key decisions
- Landing shell stays statically prerendered; session-aware nav and the notice are streamed Suspense holes (cacheComponents-safe). Landing uses `title.absolute` to avoid the doubled "· UrSpace" template suffix.
- All preview content is static JSX reflecting the real editor/notebook styling — no fake screenshots, no client JS.

### Verification
- lint / tsc / build pass; `/` partial-prerenders, `/terms` static.
- Browser: landing renders all sections (snapshot-verified), `/terms` renders, signup renders with notice boundary; console clean on all three. Screenshot capture unavailable (in-app Browser panel hidden) — structure verified via accessibility snapshot instead.

## 2026-11-13 — Automated tests & verification pass (brief §18)

### Added
- `vitest.config.mts` (node env, `@` alias, `server-only` stub), `tests/stubs/server-only.ts`.
- `tests/note-document.test.ts` (15): link-protocol allowlist incl. javascript/data/vbscript rejection, oversized/non-string hrefs, Tiptap allowlist parsing (disallowed nodes/marks, heading levels, unsafe-link rejection, mark normalization), text extraction, tag normalization bounds.
- `tests/validation.test.ts` (9): password 8–72 bounds, email, display name, note title/tag limits, **createAccountSchema rejects `owner`**, password-confirmation mismatch paths, settings notice cap.
- `tests/types-and-stats.test.ts` (4): role helpers, dashboard routing, note summarization.
- `package.json`: `test` script (`vitest run`).

### Results (all real, run locally)
- `npm run lint` — 0 errors/warnings. `npx tsc --noEmit` — clean. `npm test` — **28/28 pass**. `npm run build` — 21 routes, no errors.
- Browser (live, against the real Supabase project):
  - Invalid login → exact message **"Wrong email or password"**, no email-existence disclosure. ✔
  - Unauthenticated `/dashboard`, `/profile`, `/admin`, `/admin/settings`, `/notes/[id]` → redirect to `/login`. ✔
  - Landing (all sections incl. privacy disclosure), `/terms`, `/login`, `/signup`, `/forgot-password` render; consoles clean. ✔
- **Not verified (blocked on user)**: authenticated flows (signup→profile trigger, login redirects by role, note CRUD, suspension enforcement, admin provisioning/oversight, avatars, RLS with real users). `db/rls-tests.sql` is prepared but requires the schema applied + test users. No fabricated results.

## 2026-11-13 — Settings page, deployment prep & documentation (brief §12, §15, §20)

### Added
- `app/(account)/settings/page.tsx`: the brief's `/settings` route — theme toggle, background picker, and a link to profile account settings (reuses the existing providers/controls; available to every active role).
- `docs/SETUP.md`: complete setup & deployment guide — env vars, schema application, Auth URL configuration, one-time owner provisioning, local checks, RLS test instructions, manual verification checklist, Vercel deployment steps, security-model summary.
- Rewrote `README.md` (was create-next-app boilerplate): product overview, role table, stack, quick start, scripts, layout, doc links.

### Changed
- `components/app-header.tsx`: Settings link for all users.

### Verification
- lint / tsc / 28 tests / build all pass — **22 routes**, `/settings` partial-prerenders and redirects unauthenticated users to `/login`.
- Secret sweep: `SUPABASE_SERVICE_ROLE_KEY` is read only in `lib/supabase/admin.ts` (`server-only`), used only by `app/(admin)/actions.ts` (`"use server"`). `.env.example` holds placeholders only; `.gitignore` excludes `.env*` except the example.
- Deployment is **prepared, not performed** — no Vercel deployment has been run; per the brief, none is claimed.

### Outstanding (user actions below)
All code deliverables in brief §20 are implemented. Live end-to-end verification of authenticated flows awaits the database setup steps below.

## 2026-11-13 — Auth UX overhaul: confirm-password, strength meter, six-provider social sign-in, illustrated split-screen (brief §3–§5, §9)

### Added
- `lib/password-strength.ts`: `getPasswordStrength(password)` → `{ score: 0–4, label }`. Empty/`<8` → "Too short"; common-password list + single-repeated-char → "Weak"; else scores by character-class variety (lower/upper/digit/symbol) + length ≥ 12, capped at 4 ("Fair"/"Good"/"Strong"). Pure, unit-tested.
- `components/password-input.tsx`: `PasswordInput` (ref-as-prop `ComponentProps<"input">`) with a show/hide toggle (`aria-pressed`, `aria-label` "Show password"/"Hide password", inline eye/eye-off SVG, `focus-visible` outline).
- `components/password-field.tsx`: `PasswordField` = label + `PasswordInput` + 4-segment strength meter with live label; clears on form `reset`; `aria-describedby` wiring; hint hidden once typing starts.
- `components/auth-illustration.tsx`: original lightweight inline SVG (floating note cards, open notebook + bookmark + checklist, pen, lavender sprig, sparkles) on a fixed lavender gradient panel — no external image URLs, decorative (`aria-hidden`), theme-independent.
- `components/social-signup-options.tsx` (server): reads `getPlatformSettings()`; renders social buttons + divider only when `allow_public_signup` is on.
- `components/auth-redirect.tsx` (server): `getCurrentProfile()`; if signed in, redirects to the role dashboard (or `/suspended`). Mounted in `<Suspense>` on login/signup **only** (not reset-password, so recovery sessions aren't bounced).
- `lib/auth-callback.ts` (`server-only`): shared `handleAuthCallback` for `/auth/callback` (OAuth) and `/auth/confirm` (email/recovery). Exchanges `?code`, guards `next` to local paths (no open redirect), audits `auth.login` (`oauth` vs `email_link` + provider), enforces suspension, routes by role. `error`→`/login?error=oauth`; missing/failed code→`/login?error=link`; `next=/reset-password`→reset form.
- `app/auth/callback/route.ts`: re-exports `handleAuthCallback` as `GET`.
- `tests/password-strength.test.ts` (5) + expanded `tests/validation.test.ts` signup cases (confirm-password match/mismatch/missing).

### Changed
- `components/social-auth-buttons.tsx`: rewritten to **six** providers with official brand SVGs — Google (multicolor G), GitHub (octocat), Microsoft (`azure`, 4-square), Facebook (`#1877F2`), X (`twitter`), Apple. 2-col grid of secondary buttons, consistent 18px icons, `whitespace-nowrap`; per-button `Spinner` while pending, all disabled during a pending flow; on `signInWithOAuth` error shows "Could not start {label} sign-in. Try again, or use email." `redirectTo` = `${origin}/auth/callback`. `EmailDivider` reads "Or continue with email".
- `components/auth-shell.tsx`: now an illustrated **split-screen** — form panel (left) + illustration panel (right, `hidden lg:block`), single rounded card, equal-height columns; stacks to form-only on small screens. `AuthField` renders `PasswordInput` for `type="password"` (visibility toggle on every password field), `Input` otherwise.
- `components/auth-forms.tsx`: Signup + ResetPassword use `PasswordField` (meter) + a confirm-password `AuthField`; Login password gets the toggle.
- `app/(account)/profile/profile-forms.tsx`: ChangePassword uses `PasswordField`.
- `lib/validation.ts`: `signupSchema` adds `confirmPassword` + `.refine` match (path `["confirmPassword"]`, "Passwords do not match.").
- `app/auth/actions.ts`: `signUp` parses `confirmPassword`; login still returns exactly "Wrong email or password".
- `components/ui.tsx`: **alignment fix** — `Input` base now includes `w-full` (inputs previously rendered narrower than buttons/headings); accepts `ComponentProps<"input">` (ref).
- `app/(public)/login/page.tsx` & `signup/page.tsx`: add `<Suspense>` `AuthRedirect`, social buttons + divider, and login OAuth/link error alerts (`error=oauth` → "Social sign-in didn’t complete. Try again, or use email below.").
- `app/(public)/page.tsx`: FEATURES moved from bordered cards to a centered, divider-separated band (brief §2D "avoid generic repetitive feature cards"); hero/steps/privacy copy updated for social sign-in.
- `app/(public)/terms/page.tsx`: §2 mentions connected sign-in accounts.
- `db/schema.sql`: `handle_new_user` display-name fallback now `display_name` → `full_name` → `name` → email local part (OAuth profiles), capped at 60.
- `app/globals.css`: `.auth-page` radial background + `.auth-illustration-panel` fixed lavender gradient (artwork reads in light and dark).
- `docs/SETUP.md` §3/§6/§7: "Confirm email" OFF (no SMTP), **four** redirect URLs (`/auth/callback` + `/auth/confirm` × local/prod), six-provider configuration table (common callback `https://xwebcsemorzywsxdhtja.supabase.co/auth/v1/callback`, secrets dashboard-only), signup-toggle note.

### Key decisions / security
- OAuth runs entirely through Supabase (`signInWithOAuth` browser client → provider → `/auth/callback` `exchangeCodeForSession`). No client secrets in the repo or browser; role still comes from `profiles`/`app_metadata`, never `user_metadata`. New OAuth users default to **tutor**.
- The six buttons are always rendered, but a provider only completes sign-in once its OAuth app is configured in the Supabase dashboard; until then the flow returns a clear error and email auth is unaffected. Not claimed as functional without configuration.
- localStorage→server import migration was inspected and left as-is: already user-scoped, idempotent, offered only when the account has zero server notes (never overwrites server data, never silently discards local notes).

### Verification (all real, run locally)
- `npm run lint` — 0 problems. `npx tsc --noEmit` — exit 0. `npm test` — **34/34 pass** (4 files). `npm run build` — **23 routes**, `/auth/callback` + `/auth/confirm` dynamic (ƒ), auth pages partial-prerender (◐).
- Browser (live): signup meter shows "Good"/"Strong"; mismatch → "Passwords do not match." on confirm field via the real server action (no account created); password toggle flips `type` + `aria-pressed`; all six providers render on login (immediate) and signup (streamed); split-screen panels equal-height side-by-side with the SVG; `/auth/callback` & `/auth/confirm` with no code → 307 `/login?error=link`, `?error=access_denied` → 307 `/login?error=oauth`; `/login?error=oauth` shows the alert; forgot/reset 200; landing feature items measured `text-align: center`, card boxes removed.
- **Not verified (blocked on user)**: a completed OAuth round-trip for any provider (needs dashboard OAuth apps), and all authenticated flows (need `db/schema.sql` applied). No fabricated results.

## 2026-11-14 — Complete visual experience & animation overhaul (brief §1–§7)

### Added
- **Dependency**: `motion@^14.14.0` (Framer Motion successor; imported from `motion/react`). Chosen because no animation lib was present and the brief asks for springs, parallax, layout/presence transitions and counters — CSS alone cannot cover these. CSS is still used for lightweight decorative loops.
- **Assets (exact uploaded files, not substituted)**:
  - `public/hero/woman-writing.mp4` (7,373,565 B) — the uploaded "woman writing in her notebook" video, used as the landing hero background.
  - `public/hero/poster.jpg` (92,068 B, 1280×720) — a real frame extracted from that same video at t≈2s via same-origin browser canvas (no ffmpeg available); shown instantly while the video lazy-loads and as the reduced-motion fallback.
  - `public/illustrations/book.png` (390,071 B) — the uploaded open-book image, used as the central anchor of the login illustration.
- `components/motion.tsx` (`"use client"`) — shared motion system: `EASE=[0.22,1,0.36,1]`, `DUR={fast:.25,base:.5,slow:.8}`, and primitives `Reveal` (whileInView, once), `Stagger`/`StaggerItem` (0.09 stagger), `HoverLift` (spring hover/press), `ParallaxScene`/`ParallaxLayer` (spring MotionValues + per-layer `useTransform`), `AnimatedNumber` (spring → `ref.textContent`, zero re-renders, `useInView` once), `RouteTransition`, `Enter` (mount entrance). Every primitive returns static output under `useReducedMotion()`.
- `app/template.tsx` — wraps every route in `RouteTransition`, so **all** navigations get a consistent entrance automatically (template remounts per navigation).
- `components/hero.tsx` (`"use client"`) — full-bleed video hero: poster `next/image` (priority) always painted; `<video muted loop playsInline autoPlay preload="none">` source attached lazily via IntersectionObserver (`rootMargin:200px`) + 200ms settle, then `play()`; `.hero-scrim` gradient for readability; staggered `Enter` headline/copy/CTAs; scroll cue; reduced-motion renders poster only (no `<video>`).
- `components/nav-links.tsx` (`"use client"`) — active nav pill slides between links via motion `layoutId="nav-pill"` (spring 380/32) + `usePathname`; role-aware items preserved.

### Changed
- `components/auth-illustration.tsx` — **rebuilt** from the previous inline SVG into a layered scene around the exact `book.png`: `ParallaxScene` + 6 `ParallaxLayer` depths; book gently floats/rotates (motion `y:[0,-10,0]`, `rotate` keyframes, 13s ∞); a **separate translucent `.page-turn` leaf** turns (12s ∞) while the photograph itself stays still (honors "do not pretend a static image has moving pages"); 3 `.paper-sheet` drift at different speeds (`float-soft` 9s/13s), stationery (pencil, paperclip, small notebook), 8 `.auth-particle`, `.handwrite path` stroke-reveal (7s), `.auth-scene-gradient` pan (20s ∞); staggered `Enter` 0.08→0.75; mouse parallax across layers. Book identity preserved (radial mask only, no distortion).
- `components/auth-shell.tsx` — card wrapped in `Enter` (covers login/signup/forgot/reset).
- `components/ui.tsx` — `SubmitButton` pending shows `Spinner` + label; `EmptyState` gains optional floating icon + `Enter`; `Skeleton` uses CSS shimmer (`.ui-skeleton`).
- `components/app-header.tsx` — inline nav links replaced by `<NavLinks>`; theme toggle/background/logout unchanged.
- Tutor `dashboard/page.tsx` — stat cards `HoverLift` + `AnimatedNumber`, heading `Reveal`, stats `Stagger`; `dashboard/notebook.tsx` — note cards `AnimatePresence mode="popLayout"` + `motion.article layout` (enter/exit/layout), empty/no-results `Enter`.
- `notes/[id]/note-detail.tsx` — `AnimatePresence mode="wait"` crossfade between view/edit; article `Enter`.
- Consistency pass (`Reveal`/`Stagger`/`HoverLift`/`Enter`): admin overview/tutors/notes/activity/settings, profile, settings, terms, suspended, landing final CTA.
- `app/globals.css` — motion tokens (`--ease-out`, `--dur-*`), `.nav-link`/`.nav-pill`, `.editor-tool` hover/press, `.editor-link-row`, button transitions, dialog/backdrop/icon-in, shimmer, theme cross-fade, hero + auth-scene keyframes, `.empty-float`; a single `@media (prefers-reduced-motion: reduce)` block neutralizes all decorative CSS animation (and sets `.handwrite path` dashoffset 0). JS motion guarded separately by `useReducedMotion()`.
- **Prerender clock-read fix** (surfaced during browser QA): `app/(public)/page.tsx` footer year moved from module-scope `new Date().getFullYear()` to a `CurrentYear` client primitive in `components/ui.tsx` (`useSyncExternalStore`, empty server snapshot → live year on client). Added `await connection()` (Next `next/server`) at the top of `getCurrentProfile` (`lib/auth.ts`) and `getPlatformSettings` (`lib/admin.ts`) so the Supabase session/settings reads opt into request-time rendering instead of reading `Date.now()` during a static prerender pass. This clears the dev-only `unstable value Date.now() while prerendering` error on `/`, `/login`, `/signup`; production build was already clean.

### Key decisions
- Hybrid motion: CSS for cheap infinite decorative loops (float/particle/gradient/shimmer/page-turn/handwrite); motion for entrances, parallax, layout/presence, counters and the nav pill. No competing state; `AnimatedNumber` mutates textContent (no per-frame React renders).
- Hero video never blocks first paint: poster is priority `next/image`; the 1080p source attaches only near-viewport after settle; `preload="none"`. Reduced-motion gets the poster, no video.
- Existing functionality preserved: auth/Supabase, six OAuth providers, privacy disclosure, notes CRUD/migration, tags/search/filter, themes/backgrounds, responsive routing, RLS — none removed. Invalid login still returns exactly "Wrong email or password".

### Verification (all real, run locally)
- `npx tsc --noEmit` clean; `npm run lint` 0 problems; `npm test` **34/34** (4 files); `npm run build` **23 routes** (Cache Components + Partial Prefetching; `/auth/callback` + `/auth/confirm` dynamic).
- Browser (live): hero `<video>` loads the exact asset — **1920×1080, duration 12.79s, readyState 4, no error**, `play()` succeeds; poster 1280×720 painted. Login illustration bindings confirmed via computed styles: book motion float, `.page-turn` 12s ∞, 3 `.paper-sheet` `float-soft`, 8 `.auth-particle` `particle-float`, `.handwrite path` `handwrite` 7s (dashoffset 260→0), `.auth-scene-gradient` `gradient-pan` 20s ∞, 6 parallax layers; illustration panel correctly `hidden lg:block` (hidden at 525px). Route `Enter`/`Reveal` elements render with correct initial states on `/` and `/terms`. After the prerender fix, `/`, `/login`, and `/signup` render with **zero console errors** (verified on a freshly restarted dev server).
- **Tooling limits (honest, not code defects)**: the MCP browser tab is backgrounded (`visibilityState:"hidden"`, `requestAnimationFrame` never fires, IntersectionObserver suppressed), so JS-driven animation *progression* and sustained video playback cannot be watched here — verified via correct initial states + animation bindings + asset validity instead (the hero was observed looping with advancing `currentTime` earlier when foreground). Viewport is fixed 525×521 (`resizeTo` no-op, `take_screenshot` unavailable) → desktop/tablet layout verified structurally via responsive classes, not pixel-rendered. Reduced-motion verified structurally (CSS media block + `useReducedMotion` guards), not toggled at runtime.
- **Not verified at runtime (blocked on user DB setup)**: authenticated dashboard motion. Re-tested with a clean signup: `signUp` **does** create a session and redirect to `/dashboard` (so "Confirm email" is OFF), but `/dashboard` immediately bounces to `/login` and a direct login returns "Wrong email or password". Root cause traced in code: `getCurrentProfile`/`logIn` query the `profiles` table and bail when no row exists — i.e. **`db/schema.sql` (profiles/notes/audit/settings + `handle_new_user` trigger) has not been applied** to the Supabase project, so Supabase Auth succeeds but the app tables are absent. This is pending user action #1, not a code defect and not an email-confirmation issue. No security setting was changed and no direct DB connection was used. Two throwaway auth users (`motion.test…@example.com`, `motion.test2…@example.com`) now exist in Supabase Auth with no profile rows; they are harmless test fixtures. Dashboard motion uses the same primitives verified on public routes and compiles in the green build.

## Pending user actions (required before live verification)
1. Run `db/schema.sql` in Supabase SQL Editor (creates profiles/notes/audit/settings/preferences + RLS + storage bucket).
2. Create the owner auth user in the dashboard, then run `db/owner-setup.sql` (set the email first).
3. Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` (server-only; never in chat/browser).
4. Supabase Auth settings: Site URL `http://localhost:3000`; add **four** redirect URLs — `http://localhost:3000/auth/callback`, `http://localhost:3000/auth/confirm`, and the production equivalents of both. Email provider enabled with **"Confirm email" OFF** (no custom email provider/SMTP needed — Supabase's built-in delivery covers recovery links).
5. Optional social sign-in: enable any of the **six** providers (Google, GitHub, Microsoft/`azure`, Facebook, X/`twitter`, Apple) in Supabase Auth with OAuth app credentials created in each provider's console (see `docs/SETUP.md` §3). All use the callback `https://xwebcsemorzywsxdhtja.supabase.co/auth/v1/callback`; secrets go only into the Supabase dashboard. Until a provider is enabled, its button shows a clear "could not start sign-in" error and email auth is unaffected.

## 2026-11-26 — Product decision: scope wallpapers to the note editor

### Decision
- Wallpapers are a note-writing feature, not an application-wide background setting.
- A selected wallpaper appears only within the note editor/writing canvas, behind the text being composed or edited.
- The dashboard shell, navigation, login, settings, profile pages, and other non-editor surfaces retain the normal UrSpace light/dark theme without wallpaper imagery.
- The editor must preserve text readability and accessible contrast over every wallpaper option.

### Documentation status
- This is a confirmed product direction and a planned feature, not a claim that the UI has already been changed or that wallpaper persistence/selection is implemented.
- The README feature list now labels editor wallpapers as planned and no longer describes photo backgrounds as app-wide personalization.
- Before implementation, inspect the existing background settings/provider and decide whether to replace, migrate, or remove its current app-shell behavior. Do not silently keep global wallpaper behavior.

## 2026-11-26 — Phase 0: documentation and project audit

### Scope
Read-only audit. No application code, SQL, environment variable, database row
or deployment was modified. Eight documents were added under `docs/`
(`PROJECT_OVERVIEW`, `ARCHITECTURE`, `AUTHENTICATION`, `ENVIRONMENT_SETUP`,
`KNOWN_ISSUES`, `IMPLEMENTATION_PLAN`, `TESTING_CHECKLIST`, `CHANGELOG`).

### Verified from the repository
- Next.js 16.4.3 with `cacheComponents` + `partialPrefetching`, React 19.3,
  TypeScript strict, Tailwind v4, Tiptap 3.32, Zod 4.6.7, `@supabase/ssr`
  0.12.7, `motion` 14.14, Vitest 5.1.
- Route groups `(public)`, `(tutor)`, `(account)`, `(admin)` with guards
  `requireUser` / `requireRole` / `requireStaff`; `/auth/callback` and
  `/auth/confirm` share `lib/auth-callback.ts`.
- Notes are server-authoritative; bodies pass a Tiptap node/mark allowlist on
  write and are re-validated at render.
- Backgrounds/theme are `localStorage` only; `user_preferences` has **zero**
  code references.

### Verified from the live Supabase project (`xwebcsemorzywsxdhtja`)
- `ACTIVE_HEALTHY`, PostgreSQL 17.11.
- 5 tables, RLS on all 5, 21 policies (17 public + 4 storage), 7 triggers,
  4 `private` helpers + 4 public functions.
- `public.ensure_profile()` is **absent** — it exists only in the local,
  uncommitted `db/schema.sql`.
- `avatars` bucket exists and is public.
- 8 auth users vs **5 profiles, all tutors, all active** — zero admins, zero
  owner; 3 auth users have no profile.
- 0 notes; 22 audit entries (last 2026-11-14).
- Identities: 8 email, 1 Google, 1 GitHub; none for Microsoft/Facebook/X/Apple.

### Verified from Vercel
- Two projects deploy the same repo/branch with root directory `notes`:
  `urspace` (production `https://urspace-seven.vercel.app`, `READY` at
  `4c24808`) and `markdown-notes` (`https://markdown-notes-jet.vercel.app`,
  **HTTP 500**, no env vars).
- `urspace` production env has only the two public Supabase variables;
  `SUPABASE_SERVICE_ROLE_KEY` is missing.

### Git state at audit time
- Local `HEAD` was `73587e0`; `origin/main` was `4c24808` (4 commits ahead,
  including the OAuth profile-recovery fix `7724205`).
- Staged but uncommitted: `db/schema.sql`, `lib/auth.ts`,
  `lib/auth-callback.ts` implementing an `ensure_profile()` RPC approach whose
  function is not deployed and whose callback base predates `7724205`.
  It was **not** committed: the work is preserved in `stash@{0}` and the local
  branch was fast-forwarded to `origin/main` before Phase 3.

### Verification run
- `npx tsc --noEmit` clean; `npm run lint` 0 problems; `npm test` 34/34;
  `npm run build` success with 25 route entries.
- Live HTTP: `/` 200 and `/login` 200 on the canonical alias.

### Outcome
Phase 0 documentation complete. Backend restoration, owner provisioning,
profile repair, the service-role key and the duplicate Vercel project all
require explicit approval before any write.

## 2026-11-26 — Phase 3: UI improvements (wallpaper scope, theme, dashboard)

### Scope
UI only. No authentication logic, database schema, Supabase configuration,
server action or API code was modified.

### Added
- `AppBackdrop` — the static themed application backdrop (gradient + ambient
  orbs) that replaced the photo layer in the shells.
- `NoteEditorBackdrop` + `useNoteEditorWallpaper()` — wallpaper rendering inside
  `.note-editor-shell`, with a per-image dimmer.
- `.ui-surface-card`, `.ui-shadow-panel`, `--shadow-card/panel/float`,
  `--brand-terracotta`, `--border-error` tokens; `.note-editor-wallpaper*` and
  `data-wallpaper` contrast rules.

### Changed
- `app/background-settings.tsx`: the provider no longer draws a fixed photo; it
  exposes the chosen wallpaper to the editor. Dialog/trigger copy now reads
  "Wallpaper" / "Writing area wallpaper". The storage key `urspace:background`
  is unchanged, so existing choices carry over.
- `app/rich-text-editor.tsx`: renders the backdrop and marks the shell with
  `data-wallpaper="true"`, which switches text, toolbar, code, links and
  placeholders to light-on-dim colours.
- Route-group layouts (`(tutor)`, `(account)`, `(admin)`): render
  `<AppBackdrop />`; dashboard, login, navigation and settings backgrounds are
  unchanged.
- `app/globals.css`: opaque panels/controls, a darker dark-mode background with
  lighter panels and brighter muted text, warm shadow tokens replacing
  purple-tinted arbitrary shadows.
- Dashboard: stat cards use `ui-surface-card`, `gap-3 sm:gap-4` spacing,
  `mb-6 sm:mb-8` heading rhythm, and the notes column is top-aligned with the
  composer panel (`lg:pt-8`).
- Settings: section renamed "Note editor wallpaper" with editor-specific copy.
- Theme tokens now replace hardcoded colours in the header logo/focus ring, the
  editor invalid border, admin settings accent, and the profile/admin note
  panels.

### Verification
- `npx tsc --noEmit` clean; `npm run lint` 0 problems; `npm test` 34/34;
  `npm run build` success (25 route entries).
- **Not verified visually:** no browser session can reach the authenticated
  editor (no owner/admin account; login blocked by Phase 1 items), so wallpaper
  rendering, dark-mode contrast and responsive layouts were checked through
  code/CSS inspection and the production build only.

### Git
- Local `main` was fast-forwarded to `origin/main` (`4c24808`) before starting;
  the superseded `ensure_profile` work remains in `stash@{0}` and was not
  committed or deployed.
