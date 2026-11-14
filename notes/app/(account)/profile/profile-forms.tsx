"use client";

import { useActionState, useRef } from "react";
import { useRouter } from "next/navigation";
import { changePassword, updateDisplayName } from "@/app/(account)/actions";
import { PasswordField } from "@/components/password-field";
import { Alert, Field, Input, SubmitButton } from "@/components/ui";

export function DisplayNameForm({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const [state, formAction] = useActionState(async (previous: {
    error?: string;
    fieldErrors?: Record<string, string[]>;
    success?: string;
  }, formData: FormData) => {
    const result = await updateDisplayName(previous, formData);
    if (result.success) {
      router.refresh();
    }
    return result;
  }, {});

  const nameError = state.fieldErrors?.displayName?.[0];

  return (
    <form action={formAction} className="space-y-5">
      {state.error && <Alert>{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}
      <Field label="Display name" htmlFor="profile-display-name" error={nameError}>
        <Input
          id="profile-display-name"
          name="displayName"
          defaultValue={defaultValue}
          maxLength={60}
          autoComplete="name"
          required
          aria-invalid={Boolean(nameError)}
          aria-describedby={nameError ? "profile-display-name-error" : undefined}
        />
      </Field>
      <SubmitButton pendingText="Saving…">Save name</SubmitButton>
    </form>
  );
}

export function ChangePasswordForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(async (previous: {
    error?: string;
    fieldErrors?: Record<string, string[]>;
    success?: string;
  }, formData: FormData) => {
    const result = await changePassword(previous, formData);
    if (result.success) {
      formRef.current?.reset();
      router.refresh();
    }
    return result;
  }, {});

  const passwordError = state.fieldErrors?.password?.[0];
  const confirmError = state.fieldErrors?.confirmPassword?.[0];

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
      {state.error && <Alert>{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}
      <PasswordField
        id="profile-password"
        name="password"
        label="New password"
        error={passwordError}
        hint="At least 8 characters."
      />
      <Field label="Confirm new password" htmlFor="profile-confirm-password" error={confirmError}>
        <Input
          id="profile-confirm-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={Boolean(confirmError)}
          aria-describedby={confirmError ? "profile-confirm-password-error" : undefined}
        />
      </Field>
      <SubmitButton pendingText="Updating…">Update password</SubmitButton>
    </form>
  );
}