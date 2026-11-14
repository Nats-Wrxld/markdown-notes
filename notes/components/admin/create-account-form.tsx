"use client";

import { useActionState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createAccount } from "@/app/(admin)/actions";
import { Alert, Field, Input, SubmitButton } from "@/components/ui";

export default function CreateAccountForm({ canCreateAdmins }: { canCreateAdmins: boolean }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(async (previous: {
    error?: string;
    fieldErrors?: Record<string, string[]>;
    success?: string;
  }, formData: FormData) => {
    const result = await createAccount(previous, formData);
    if (result.success) {
      formRef.current?.reset();
      router.refresh();
    }
    return result;
  }, {});

  const nameError = state.fieldErrors?.displayName?.[0];
  const emailError = state.fieldErrors?.email?.[0];
  const passwordError = state.fieldErrors?.password?.[0];
  const roleError = state.fieldErrors?.role?.[0];

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
      {state.error && <Alert>{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Display name" htmlFor="create-name" error={nameError}>
          <Input
            id="create-name"
            name="displayName"
            maxLength={60}
            autoComplete="off"
            required
            aria-invalid={Boolean(nameError)}
          />
        </Field>
        <Field label="Email" htmlFor="create-email" error={emailError}>
          <Input
            id="create-email"
            name="email"
            type="email"
            autoComplete="off"
            required
            aria-invalid={Boolean(emailError)}
          />
        </Field>
        <Field
          label="Temporary password"
          htmlFor="create-password"
          error={passwordError}
          hint="At least 8 characters. Share it securely; they can change it later."
        >
          <Input
            id="create-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            aria-invalid={Boolean(passwordError)}
          />
        </Field>
        <Field label="Role" htmlFor="create-role" error={roleError}>
          <select
            id="create-role"
            name="role"
            defaultValue="tutor"
            className="ui-input w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:ring-4"
          >
            <option value="tutor">Tutor</option>
            {canCreateAdmins && <option value="admin">Administrator</option>}
          </select>
        </Field>
      </div>
      <SubmitButton pendingText="Creating…">Create account</SubmitButton>
    </form>
  );
}