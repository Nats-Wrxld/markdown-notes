import { Suspense } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { SignupForm } from "@/components/auth-forms";
import AuthRedirect from "@/components/auth-redirect";
import PlatformNotice from "@/components/platform-notice";
import SocialSignupOptions from "@/components/social-signup-options";

export const metadata = { title: "Create your space" };

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your space"
      subtitle="A calm corner for your thoughts. Free to start, yours to keep."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="ui-text-accent font-semibold underline-offset-4 hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        <Suspense fallback={null}>
          <AuthRedirect />
        </Suspense>
        <Suspense fallback={null}>
          <PlatformNotice />
        </Suspense>
        <Suspense fallback={null}>
          <SocialSignupOptions />
        </Suspense>
        <SignupForm />
      </div>
    </AuthShell>
  );
}