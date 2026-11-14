import { Suspense } from "react";
import Link from "next/link";
import { logOut } from "@/app/auth/actions";
import { getCurrentProfile } from "@/lib/auth";
import { Enter } from "@/components/motion";
import { Button } from "@/components/ui";

export const metadata = { title: "Account suspended" };

async function SuspendedBody() {
  const profile = await getCurrentProfile();

  return (
    <>
      <p className="ui-text-muted mt-3 text-sm leading-6">
        {profile
          ? "This account has been suspended by a platform administrator. Your notes are preserved, but access is paused. Contact the platform owner if you believe this is a mistake."
          : "This account has been suspended. Contact the platform owner for assistance."}
      </p>
      <div className="mt-7 flex flex-col gap-3">
        {profile ? (
          <form action={logOut}>
            <Button type="submit" variant="secondary" className="w-full justify-center">
              Log out
            </Button>
          </form>
        ) : (
          <Link href="/login">
            <Button variant="secondary" className="w-full justify-center">Back to login</Button>
          </Link>
        )}
      </div>
    </>
  );
}

export default function SuspendedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <Enter className="ui-surface-panel w-full max-w-md rounded-[24px] border p-9 text-center shadow-[0_18px_60px_rgba(65,55,104,0.08)]">
        <span className="empty-float ui-surface-subtle ui-text-accent mx-auto mb-5 flex size-12 items-center justify-center rounded-2xl">
          <svg viewBox="0 0 24 24" fill="none" className="size-6" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
            <path d="M12 8v5m0 3h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
        <h1 className="ui-text-primary font-serif text-2xl font-medium">Account suspended</h1>
        <Suspense
          fallback={<p className="ui-text-muted mt-3 text-sm leading-6">Loading…</p>}
        >
          <SuspendedBody />
        </Suspense>
      </Enter>
    </main>
  );
}