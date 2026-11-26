import Link from "next/link";
import { logOut } from "@/app/auth/actions";
import { ThemeToggle } from "@/app/theme-provider";
import { BackgroundSettingsTrigger } from "@/app/background-settings";
import Avatar from "@/components/avatar";
import NavLinks from "@/components/nav-links";
import { dashboardPathForRole, type Profile } from "@/lib/types";

export default function AppHeader({ profile }: { profile: Profile }) {
  const homeHref = dashboardPathForRole(profile.role);

  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <Link
        href={homeHref}
        className="ui-surface-panel flex items-center gap-3 rounded-2xl border px-2 py-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus-ring)]"
        aria-label="UrSpace home"
      >
        <span className="flex size-10 items-center justify-center rounded-2xl bg-[var(--brand-terracotta)] text-white shadow-[0_6px_18px_rgba(158,98,68,0.2)]">
          <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
            <path d="M7 3.75h7.5L19 8.25v12H7a2 2 0 0 1-2-2v-12a2.5 2.5 0 0 1 2-2.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M14 4v5h5M9 13h6M9 16.5h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="ui-text-primary text-[21px] font-semibold tracking-[-0.055em]">
          UrS<span className="urspace-flip">p</span>ace
        </span>
      </Link>

      <nav className="flex flex-wrap items-center gap-2" aria-label="Primary">
        <NavLinks profile={profile} />
        <ThemeToggle />
        <BackgroundSettingsTrigger />
        <span className="ui-status-pill hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium sm:flex">
          <Avatar profile={profile} size={24} />
          <span className="max-w-[10rem] truncate">{profile.display_name || profile.email}</span>
        </span>
        <form action={logOut}>
          <button type="submit" className="ui-button ui-button-ghost min-h-0 rounded-full px-4 py-2 text-xs">
            Log out
          </button>
        </form>
      </nav>
    </header>
  );
}