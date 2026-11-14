import { Suspense } from "react";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { dashboardPathForRole } from "@/lib/types";
import PlatformNotice from "@/components/platform-notice";
import Hero from "@/components/hero";
import { HoverLift, Reveal, Stagger, StaggerItem } from "@/components/motion";
import { CurrentYear } from "@/components/ui";

export const metadata = {
  title: {
    absolute: "UrSpace — Your thoughts deserve a space of their own",
  },
  description:
    "UrSpace is a calm, personal note-taking platform for tutors. Rich-text notes, tags, search, and themes — with honest, access-controlled privacy.",
};

function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-3" aria-label="UrSpace home">
      <span className="flex size-10 items-center justify-center rounded-2xl bg-[#bd7958] text-white shadow-[0_6px_18px_rgba(158,98,68,0.2)]">
        <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
          <path d="M7 3.75h7.5L19 8.25v12H7a2 2 0 0 1-2-2v-12a2.5 2.5 0 0 1 2-2.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M14 4v5h5M9 13h6M9 16.5h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="ui-text-primary text-[21px] font-semibold tracking-[-0.055em]">
        UrS<span className="urspace-flip">p</span>ace
      </span>
    </Link>
  );
}

async function NavActions() {
  const profile = await getCurrentProfile();
  if (profile) {
    return (
      <Link href={dashboardPathForRole(profile.role)} className="ui-button ui-button-primary min-h-0 px-5 py-2.5 text-xs">
        Open your space →
      </Link>
    );
  }
  return (
    <>
      <Link href="/login" className="ui-button ui-button-ghost min-h-0 px-4 py-2.5 text-xs">
        Log in
      </Link>
      <Link href="/signup" className="ui-button ui-button-primary min-h-0 px-5 py-2.5 text-xs">
        Create your space
      </Link>
    </>
  );
}

function NavActionsFallback() {
  return (
    <>
      <Link href="/login" className="ui-button ui-button-ghost min-h-0 px-4 py-2.5 text-xs">
        Log in
      </Link>
      <Link href="/signup" className="ui-button ui-button-primary min-h-0 px-5 py-2.5 text-xs">
        Create your space
      </Link>
    </>
  );
}

const FEATURES = [
  {
    title: "A notebook that feels like paper",
    description:
      "Rich-text notes with headings, lists, quotes, links, and code — a calm editor that stays out of your way.",
    icon: (
      <path d="M7 3.75h7.5L19 8.25v12H7a2 2 0 0 1-2-2v-12a2.5 2.5 0 0 1 2-2.5ZM14 4v5h5M9 13h6M9 16.5h4" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    title: "Tags and instant search",
    description:
      "Label notes with tags and find anything in seconds. Your notebook stays organized as it grows.",
    icon: (
      <path d="M4 7a3 3 0 0 1 3-3h4.6a2 2 0 0 1 1.4.6l6.4 6.4a2 2 0 0 1 0 2.8l-4.6 4.6a2 2 0 0 1-2.8 0L5.6 12A2 2 0 0 1 5 10.6V7Zm4 1h.01M14 14l-3 3" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    title: "Make it yours",
    description:
      "Light and dark themes, five hand-picked backgrounds, and a profile photo. Your space, your mood.",
    icon: (
      <path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.9 2-2s-.8-2-.8-2.8c0-1 .8-1.7 1.8-1.7H17a4 4 0 0 0 4-4c0-4.2-4-7.5-9-7.5ZM7.5 10.5h.01M11 7.5h.01M15.5 9.5h.01" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    title: "Your account, your way",
    description:
      "Manage your display name, photo, and password from a simple profile page. Preferences travel with you.",
    icon: (
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0M12 12v.01" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    title: "Secure by default",
    description:
      "Hashed passwords, validated sessions, and database-level rules keep every note locked to its owner.",
    icon: (
      <path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Zm-2.5 9 2 2 3.5-4" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    title: "Oversight, disclosed",
    description:
      "Administrators can view tutor notes for support — and we tell you so up front. No hidden access, no surprises.",
    icon: (
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Zm9.5 2.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
];

const STEPS = [
  {
    title: "Create your account",
    description: "Sign up with email, Google, or GitHub in under a minute. No noise.",
  },
  {
    title: "Enter your workspace",
    description: "Land in a personal notebook that's already set up and ready for thought.",
  },
  {
    title: "Write and organize",
    description: "Capture notes with rich text, add tags, and search across everything.",
  },
  {
    title: "Return whenever you need",
    description: "Your notes are saved to your account and waiting on any device.",
  },
];

function PreviewCard({
  title,
  excerpt,
  tags,
  date,
}: {
  title: string;
  excerpt: React.ReactNode;
  tags: string[];
  date: string;
}) {
  return (
    <article className="ui-surface-panel rounded-[20px] border p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="ui-text-primary text-sm font-semibold">{title}</h3>
        <span className="ui-text-muted shrink-0 text-[10px]">{date}</span>
      </div>
      <div className="saved-note-content ui-text-secondary mt-2 text-xs leading-5">{excerpt}</div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span key={tag} className="ui-badge ui-badge-neutral">
            {tag}
          </span>
        ))}
      </div>
    </article>
  );
}

export default function LandingPage() {
  return (
    <div className="urspace-app relative min-h-screen overflow-hidden">
      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 py-6">
          <Brand />
          <nav className="hidden items-center gap-6 md:flex" aria-label="Sections">
            <a href="#features" className="ui-text-secondary text-xs font-semibold hover:underline">Features</a>
            <a href="#privacy" className="ui-text-secondary text-xs font-semibold hover:underline">Privacy</a>
            <a href="#how-it-works" className="ui-text-secondary text-xs font-semibold hover:underline">How it works</a>
          </nav>
          <div className="flex items-center gap-2">
            <Suspense fallback={<NavActionsFallback />}>
              <NavActions />
            </Suspense>
          </div>
        </header>

        <div className="pt-2">
          <Suspense fallback={null}>
            <PlatformNotice />
          </Suspense>
        </div>
      </div>

      <Hero />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 sm:px-8">
        <main>
          {/* Product preview */}
          <section className="py-14" aria-labelledby="preview-heading">
            <Reveal className="mb-8 max-w-xl">
              <p className="ui-text-accent-soft text-[11px] font-bold uppercase tracking-[0.2em]">
                The actual product
              </p>
              <h2 id="preview-heading" className="ui-text-primary mt-2 font-serif text-3xl font-medium tracking-[-0.02em]">
                This is your notebook on day one.
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
            <div className="ui-surface-panel rounded-[28px] border p-6 shadow-[0_24px_70px_rgba(65,55,104,0.10)] sm:p-8">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <span className="ui-surface-subtle ui-text-muted flex min-w-0 flex-1 items-center gap-2 rounded-full border px-4 py-2.5 text-xs sm:max-w-xs">
                  <svg viewBox="0 0 24 24" fill="none" className="size-3.5 shrink-0" aria-hidden="true">
                    <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.6" />
                    <path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                  Search your notes…
                </span>
                <span className="ui-button ui-button-primary min-h-0 px-4 py-2 text-xs">+ New note</span>
              </div>
              <Stagger className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <StaggerItem>
                  <HoverLift className="h-full">
                    <PreviewCard
                      title="Week 3 — Lesson reflections"
                      excerpt={
                        <p>
                          The group discussion worked <strong>far better</strong> than the worksheet.
                          Next time: start with the question, not the answer.
                        </p>
                      }
                      tags={["teaching", "reflection"]}
                      date="Today"
                    />
                  </HoverLift>
                </StaggerItem>
                <StaggerItem>
                  <HoverLift className="h-full">
                    <PreviewCard
                      title="Reading list: essay craft"
                      excerpt={
                        <ul>
                          <li>On clarity in short prose</li>
                          <li>The paragraph as a unit</li>
                          <li>Examples worth stealing</li>
                        </ul>
                      }
                      tags={["reading", "craft"]}
                      date="Yesterday"
                    />
                  </HoverLift>
                </StaggerItem>
                <StaggerItem>
                  <HoverLift className="h-full">
                    <PreviewCard
                      title="Ideas for the spring workshop"
                      excerpt={
                        <p>
                          A quiet morning session: <em>write first, share later</em>. Keep it small —
                          eight people, one long table.
                        </p>
                      }
                      tags={["planning", "ideas"]}
                      date="Mon"
                    />
                  </HoverLift>
                </StaggerItem>
              </Stagger>
            </div>
            </Reveal>
          </section>

          {/* Features */}
          <section id="features" className="scroll-mt-24 py-14" aria-labelledby="features-heading">
            <Reveal className="mb-10 max-w-xl">
              <p className="ui-text-accent-soft text-[11px] font-bold uppercase tracking-[0.2em]">
                Why UrSpace
              </p>
              <h2 id="features-heading" className="ui-text-primary mt-2 font-serif text-3xl font-medium tracking-[-0.02em]">
                Everything a thinking life needs. Nothing it doesn’t.
              </h2>
            </Reveal>
            <div className="border-y border-[var(--border-soft)] py-2">
              <Stagger className="grid grid-cols-1 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                {FEATURES.map((feature) => (
                  <StaggerItem
                    key={feature.title}
                    className="flex flex-col items-center px-6 py-7 text-center sm:border-l sm:border-[var(--border-soft)] sm:[&:nth-child(2n+1)]:border-l-0 lg:[&:nth-child(2n+1)]:border-l lg:[&:nth-child(3n+1)]:border-l-0"
                  >
                    <span className="ui-text-lavender mb-4 flex size-11 items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" className="size-7" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                        {feature.icon}
                      </svg>
                    </span>
                    <h3 className="ui-text-primary font-serif text-[15px] font-medium">{feature.title}</h3>
                    <p className="ui-text-muted mt-2 max-w-[240px] text-xs leading-5">{feature.description}</p>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          </section>

          {/* Privacy & security */}
          <section id="privacy" className="scroll-mt-24 py-14" aria-labelledby="privacy-heading">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              <Reveal>
                <p className="ui-text-accent-soft text-[11px] font-bold uppercase tracking-[0.2em]">
                  Privacy &amp; security
                </p>
                <h2 id="privacy-heading" className="ui-text-primary mt-2 font-serif text-3xl font-medium tracking-[-0.02em]">
                  Protected by design. Explained in plain language.
                </h2>
                <ul className="mt-6 space-y-4">
                  {[
                    "Passwords are hashed by Supabase Auth — never stored or logged in plain text.",
                    "Google and GitHub sign-in run through Supabase Auth; we never see your social account password.",
                    "Every note is locked to its owner by database-level row security, not just hidden buttons.",
                    "Sessions are validated on the server for every protected page and action.",
                    "Other tutors can never see, edit, or delete your notes.",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <svg viewBox="0 0 24 24" fill="none" className="ui-text-lavender mt-0.5 size-4 shrink-0" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                        <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="ui-text-secondary text-sm leading-6">{item}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
              <Reveal delay={0.12}>
              <div className="ui-surface-selected rounded-[24px] border border-[var(--border-lavender)] p-7 sm:p-8">
                <h3 className="ui-text-primary font-serif text-xl font-medium">
                  One thing we won’t hide from you
                </h3>
                <p className="ui-text-secondary mt-4 text-sm leading-6">
                  UrSpace includes an administrative team. <strong>Authorized administrators and
                  the platform owner can view tutor notes</strong> for oversight and support. This
                  is an intentional platform permission, and every such access is governed by
                  role-based rules and recorded in an audit log.
                </p>
                <p className="ui-text-secondary mt-4 text-sm leading-6">
                  We don’t claim end-to-end encryption or absolute privacy — anyone who tells you
                  a hosted notebook is invisible to its operators is selling something. What we
                  promise is access control, transparency, and care.
                </p>
                <p className="ui-text-muted mt-5 text-xs">
                  You’ll see this disclosure again at signup and on your profile page.
                </p>
              </div>
              </Reveal>
            </div>
          </section>

          {/* How it works */}
          <section id="how-it-works" className="scroll-mt-24 py-14" aria-labelledby="steps-heading">
            <Reveal className="mb-10 max-w-xl">
              <p className="ui-text-accent-soft text-[11px] font-bold uppercase tracking-[0.2em]">
                How it works
              </p>
              <h2 id="steps-heading" className="ui-text-primary mt-2 font-serif text-3xl font-medium tracking-[-0.02em]">
                Four steps to a quieter mind.
              </h2>
            </Reveal>
            <ol className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, index) => (
                <li key={step.title}>
                  <Reveal delay={index * 0.09} className="h-full">
                    <HoverLift className="ui-surface-panel h-full rounded-[22px] border p-6 shadow-sm">
                      <span className="ui-text-lavender font-serif text-3xl font-medium">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <h3 className="ui-text-primary mt-3 text-sm font-semibold">{step.title}</h3>
                      <p className="ui-text-muted mt-2 text-xs leading-5">{step.description}</p>
                    </HoverLift>
                  </Reveal>
                </li>
              ))}
            </ol>
          </section>

          {/* Final CTA */}
          <section className="py-16">
            <Reveal className="ui-surface-panel rounded-[28px] border px-7 py-12 text-center shadow-[0_24px_70px_rgba(65,55,104,0.10)] sm:px-12">
              <h2 className="ui-text-primary mx-auto max-w-2xl font-serif text-[clamp(1.9rem,4vw,2.8rem)] font-medium leading-[1.12] tracking-[-0.02em]">
                Make room for what matters.
              </h2>
              <p className="ui-text-secondary mx-auto mt-4 max-w-md text-sm leading-6">
                Join UrSpace and give your notes the home they’ve been waiting for.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link href="/signup" className="ui-button ui-button-primary px-7 py-3 text-sm">
                  Create your space
                </Link>
                <Link href="/login" className="ui-button ui-button-secondary px-7 py-3 text-sm">
                  I already have one
                </Link>
              </div>
            </Reveal>
          </section>
        </main>

        {/* Footer */}
        <footer id="about" className="scroll-mt-24 border-t border-[var(--border-soft)] py-12">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Brand />
              <p className="ui-text-muted mt-4 max-w-xs text-xs leading-5">
                A warm, editorial notebook for tutors — built for the thoughts worth keeping.
              </p>
            </div>
            <nav aria-label="Product">
              <h3 className="ui-text-secondary text-[11px] font-bold uppercase tracking-[0.16em]">Product</h3>
              <ul className="mt-4 space-y-2.5 text-xs">
                <li><a href="#features" className="ui-text-muted hover:underline">Features</a></li>
                <li><a href="#how-it-works" className="ui-text-muted hover:underline">How it works</a></li>
                <li><Link href="/login" className="ui-text-muted hover:underline">Log in</Link></li>
                <li><Link href="/signup" className="ui-text-muted hover:underline">Sign up</Link></li>
              </ul>
            </nav>
            <nav aria-label="Trust">
              <h3 className="ui-text-secondary text-[11px] font-bold uppercase tracking-[0.16em]">Trust</h3>
              <ul className="mt-4 space-y-2.5 text-xs">
                <li><a href="#privacy" className="ui-text-muted hover:underline">Privacy notice</a></li>
                <li><Link href="/terms" className="ui-text-muted hover:underline">Terms of use</Link></li>
                <li><a href="#about" className="ui-text-muted hover:underline">About UrSpace</a></li>
              </ul>
            </nav>
            <div>
              <h3 className="ui-text-secondary text-[11px] font-bold uppercase tracking-[0.16em]">About</h3>
              <p className="ui-text-muted mt-4 text-xs leading-5">
                UrSpace is operated by the UrSpace team. Account and access questions go through
                your platform administrator or the owner.
              </p>
            </div>
          </div>
          <p className="ui-text-muted mt-10 text-[11px]">
            © <CurrentYear /> UrSpace. Your thoughts, carefully kept.
          </p>
        </footer>
      </div>
    </div>
  );
}