import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { ForgotPasswordForm } from "@/components/auth-forms";

export const metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a reset link."
      footer={
        <Link href="/login" className="ui-text-accent font-semibold underline-offset-4 hover:underline">
          Back to login
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}