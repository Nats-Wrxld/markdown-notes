import { Suspense, type ReactNode } from "react";
import { requireRole } from "@/lib/auth";
import { ThemeProvider } from "@/app/theme-provider";
import { AppBackdrop, BackgroundSettingsProvider } from "@/app/background-settings";
import AppShell from "@/components/app-shell";
import { Spinner } from "@/components/ui";

function ShellFallback() {
  return (
    <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col items-center justify-center px-5">
      <Spinner label="Loading your space" />
    </div>
  );
}

async function TutorShell({ children }: { children: ReactNode }) {
  const profile = await requireRole(["tutor"]);
  return <AppShell profile={profile}>{children}</AppShell>;
}

export default function TutorLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <BackgroundSettingsProvider>
        <AppBackdrop />
        <div className="urspace-app relative min-h-screen overflow-hidden">
          <Suspense fallback={<ShellFallback />}>
            <TutorShell>{children}</TutorShell>
          </Suspense>
        </div>
      </BackgroundSettingsProvider>
    </ThemeProvider>
  );
}
