import { Suspense } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/auth-forms";
import AuthRedirect from "@/components/auth-redirect";
import { EmailDivider, SocialAuthButtons } from "@/components/social-auth-buttons";
import { Alert } from "@/components/ui";

export const metadata = { title: "Log in" };

async function LoginAlerts({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <>
      {params.reset === "1" && (
        <Alert tone="success">Password updated. Log in with your new password.</Alert>
      )}
      {params.error === "link" && (
        <Alert>That link is invalid or has expired. Request a new one below.</Alert>
      )}
      {params.error === "oauth" && (
        <Alert>Social sign-in didn’t complete. Try again, or use email below.</Alert>
      )}
      {params.error === "profile" && (
        <Alert>Your sign-in succeeded, but your UrSpace profile couldn’t be loaded. Please try again or contact support.</Alert>
      )}
    </>
  );
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string; error?: string }>;
}) {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to return to your space."
      footer={
        <>
          New to UrSpace?{" "}
          <Link href="/signup" className="ui-text-accent font-semibold underline-offset-4 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        <Suspense fallback={null}>
          <AuthRedirect />
        </Suspense>
        <Suspense fallback={null}>
          <LoginAlerts searchParams={searchParams} />
        </Suspense>
        <SocialAuthButtons />
        <EmailDivider />
        <LoginForm />
      </div>
    </AuthShell>
  );
}
