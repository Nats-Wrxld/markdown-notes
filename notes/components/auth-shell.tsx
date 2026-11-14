"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useActionState } from "react";
import type { AuthFormState } from "@/app/auth/actions";
import { AuthIllustration } from "@/components/auth-illustration";
import { Enter } from "@/components/motion";
import { PasswordInput } from "@/components/password-input";
import { Alert, Field, Input, SubmitButton } from "@/components/ui";

type AuthAction = (
  previous: AuthFormState,
  formData: FormData,
) => Promise<AuthFormState>;

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="auth-page relative flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <Enter y={24} className="grid w-full max-w-md overflow-hidden rounded-[28px] border border-[var(--border-soft)] shadow-[0_24px_80px_rgba(65,55,104,0.18)] lg:max-w-4xl lg:grid-cols-2">
        <div className="ui-surface-panel flex flex-col justify-center p-7 sm:p-10">
          <Link href="/" className="mb-8 flex items-center gap-3" aria-label="UrSpace home">
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
          <h1 className="ui-text-primary font-serif text-2xl font-medium tracking-[-0.02em]">{title}</h1>
          <p className="ui-text-muted mt-2 text-sm leading-6">{subtitle}</p>
          <div className="mt-7">{children}</div>
          {footer && <div className="ui-text-muted mt-6 text-center text-sm">{footer}</div>}
        </div>
        <div className="auth-illustration-panel relative hidden lg:block">
          <AuthIllustration />
        </div>
      </Enter>
    </main>
  );
}

export function AuthForm({
  action,
  submitText,
  pendingText,
  children,
}: {
  action: AuthAction;
  submitText: string;
  pendingText: string;
  children: (state: AuthFormState) => ReactNode;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, {});

  useEffect(() => {
    if (state.redirectTo) {
      router.replace(state.redirectTo);
    }
  }, [state.redirectTo, router]);

  return (
    <form action={formAction} className="space-y-5">
      {state.error && <Alert>{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}
      {children(state)}
      <SubmitButton pendingText={pendingText} className="w-full justify-center">
        {submitText}
      </SubmitButton>
    </form>
  );
}

export function AuthField({
  state,
  name,
  label,
  type = "text",
  autoComplete,
  hint,
  placeholder,
}: {
  state: AuthFormState;
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  hint?: string;
  placeholder?: string;
}) {
  const error = state.fieldErrors?.[name]?.[0];
  const inputProps = {
    id: `auth-${name}`,
    name,
    autoComplete,
    placeholder,
    required: true,
    "aria-invalid": Boolean(error),
    "aria-describedby": error ? `auth-${name}-error` : undefined,
  };
  return (
    <Field label={label} htmlFor={`auth-${name}`} error={error} hint={hint}>
      {type === "password" ? (
        <PasswordInput {...inputProps} />
      ) : (
        <Input {...inputProps} type={type} />
      )}
    </Field>
  );
}