import type { ReactNode } from "react";
import AppHeader from "@/components/app-header";
import type { Profile } from "@/lib/types";

export default function AppShell({
  profile,
  children,
}: {
  profile: Profile;
  children: ReactNode;
}) {
  return (
    <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 pb-12 pt-6 sm:px-8 sm:pt-8 lg:px-12">
      <AppHeader profile={profile} />
      <main className="flex-1 pt-10 sm:pt-14">{children}</main>
      <footer className="ui-surface-panel ui-text-muted mt-14 flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-xs shadow-sm">
        <svg viewBox="0 0 16 16" fill="none" className="ui-text-accent size-3.5" aria-hidden="true">
          <path d="M8 13.5s-5-2.8-5-6.4a2.7 2.7 0 0 1 5-1.3 2.7 2.7 0 0 1 5 1.3c0 3.6-5 6.4-5 6.4Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
        Made for the thoughts worth keeping
      </footer>
    </div>
  );
}