"use client";

import Link from "next/link";
import {
  logIn,
  requestPasswordReset,
  resetPassword,
  signUp,
} from "@/app/auth/actions";
import { AuthField, AuthForm } from "@/components/auth-shell";
import { PasswordField } from "@/components/password-field";

export function LoginForm() {
  return (
    <AuthForm action={logIn} submitText="Log in" pendingText="Logging in…">
      {(state) => (
        <>
          <AuthField state={state} name="email" label="Email" type="email" autoComplete="email" placeholder="you@example.com" />
          <AuthField state={state} name="password" label="Password" type="password" autoComplete="current-password" />
          <p className="text-right text-sm">
            <Link href="/forgot-password" className="ui-text-accent underline-offset-4 hover:underline">
              Forgot your password?
            </Link>
          </p>
        </>
      )}
    </AuthForm>
  );
}

export function SignupForm() {
  return (
    <AuthForm action={signUp} submitText="Create account" pendingText="Creating your space…">
      {(state) => (
        <>
          <AuthField state={state} name="displayName" label="Display name" autoComplete="name" placeholder="How should we greet you?" />
          <AuthField state={state} name="email" label="Email" type="email" autoComplete="email" placeholder="you@example.com" />
          <PasswordField
            id="auth-password"
            name="password"
            label="Password"
            error={state.fieldErrors?.password?.[0]}
            hint="At least 8 characters."
          />
          <AuthField state={state} name="confirmPassword" label="Confirm password" type="password" autoComplete="new-password" />
          <p className="ui-text-muted text-xs leading-5">
            UrSpace is a personal workspace with authorized administrative oversight: platform
            administrators and the owner can access tutor notes. By creating an account you
            acknowledge this. See our{" "}
            <Link href="/#privacy" className="ui-text-accent underline-offset-4 hover:underline">
              privacy note
            </Link>
            .
          </p>
        </>
      )}
    </AuthForm>
  );
}

export function ForgotPasswordForm() {
  return (
    <AuthForm action={requestPasswordReset} submitText="Send reset link" pendingText="Sending…">
      {(state) => (
        <AuthField state={state} name="email" label="Email" type="email" autoComplete="email" placeholder="you@example.com" />
      )}
    </AuthForm>
  );
}

export function ResetPasswordForm() {
  return (
    <AuthForm action={resetPassword} submitText="Update password" pendingText="Updating…">
      {(state) => (
        <>
          <PasswordField
            id="auth-password"
            name="password"
            label="New password"
            error={state.fieldErrors?.password?.[0]}
            hint="At least 8 characters."
          />
          <AuthField state={state} name="confirmPassword" label="Confirm new password" type="password" autoComplete="new-password" />
        </>
      )}
    </AuthForm>
  );
}