"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { updatePlatformSettings } from "@/app/(admin)/actions";
import { Alert, Field, SubmitButton } from "@/components/ui";

export default function SettingsForm({
  allowPublicSignup,
  platformNotice,
}: {
  allowPublicSignup: boolean;
  platformNotice: string;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(async (previous: {
    error?: string;
    fieldErrors?: Record<string, string[]>;
    success?: string;
  }, formData: FormData) => {
    const result = await updatePlatformSettings(previous, formData);
    if (result.success) router.refresh();
    return result;
  }, {});

  const noticeError = state.fieldErrors?.platformNotice?.[0];

  return (
    <form action={formAction} className="space-y-6">
      {state.error && <Alert>{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}

      <label className="ui-surface-subtle flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-4">
        <input
          type="checkbox"
          name="allowPublicSignup"
          defaultChecked={allowPublicSignup}
          className="mt-0.5 size-4 accent-[#655294]"
        />
        <span>
          <span className="ui-text-primary block text-sm font-semibold">Allow public signup</span>
          <span className="ui-text-muted mt-1 block text-xs leading-5">
            When off, new tutors can only be created by staff from the admin area.
          </span>
        </span>
      </label>

      <Field
        label="Platform notice"
        htmlFor="platform-notice"
        error={noticeError}
        hint="Shown on the landing and signup pages. Leave empty to hide. Max 500 characters."
      >
        <textarea
          id="platform-notice"
          name="platformNotice"
          defaultValue={platformNotice}
          maxLength={500}
          rows={3}
          className="ui-input w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:ring-4"
        />
      </Field>

      <SubmitButton pendingText="Saving…">Save settings</SubmitButton>
    </form>
  );
}