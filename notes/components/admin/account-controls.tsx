"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  sendResetLink,
  setAccountStatus,
  updateAccountName,
} from "@/app/(admin)/actions";
import { Alert, Field, Input, SubmitButton } from "@/components/ui";

export function AccountStatusButton({
  targetId,
  currentStatus,
  label,
}: {
  targetId: string;
  currentStatus: "active" | "suspended";
  label: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const suspending = currentStatus === "active";

  function handleClick() {
    const confirmed = window.confirm(
      suspending
        ? `Suspend ${label}? They will immediately lose access to their workspace until reactivated.`
        : `Reactivate ${label}? They will regain access to their workspace.`,
    );
    if (!confirmed) return;

    const formData = new FormData();
    formData.set("targetId", targetId);
    formData.set("status", suspending ? "suspended" : "active");
    startTransition(async () => {
      const result = await setAccountStatus({}, formData);
      if (result.success) {
        setMessage({ tone: "success", text: result.success });
        router.refresh();
      } else {
        setMessage({ tone: "error", text: result.error ?? "Action failed." });
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={`ui-button ${suspending ? "ui-button-danger" : "ui-button-secondary"}`}
      >
        {isPending ? "Working…" : suspending ? "Suspend account" : "Reactivate account"}
      </button>
      {message && (
        <p
          role={message.tone === "error" ? "alert" : "status"}
          className={`mt-2 text-xs font-medium ${message.tone === "error" ? "ui-text-error" : "ui-text-success"}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}

export function AccountNameForm({
  targetId,
  defaultValue,
}: {
  targetId: string;
  defaultValue: string;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(async (previous: {
    error?: string;
    fieldErrors?: Record<string, string[]>;
    success?: string;
  }, formData: FormData) => {
    const result = await updateAccountName(previous, formData);
    if (result.success) router.refresh();
    return result;
  }, {});

  const nameError = state.fieldErrors?.displayName?.[0];

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="targetId" value={targetId} />
      {state.error && <Alert>{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}
      <Field label="Display name" htmlFor={`name-${targetId}`} error={nameError}>
        <Input
          id={`name-${targetId}`}
          name="displayName"
          defaultValue={defaultValue}
          maxLength={60}
          required
          aria-invalid={Boolean(nameError)}
        />
      </Field>
      <SubmitButton pendingText="Saving…">Save name</SubmitButton>
    </form>
  );
}

export function ResetLinkButton({ targetId, email }: { targetId: string; email: string }) {
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const confirmed = window.confirm(`Send a password reset link to ${email}?`);
    if (!confirmed) return;

    const formData = new FormData();
    formData.set("targetId", targetId);
    startTransition(async () => {
      const result = await sendResetLink({}, formData);
      if (result.success) {
        setMessage({ tone: "success", text: result.success });
      } else {
        setMessage({ tone: "error", text: result.error ?? "Action failed." });
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="ui-button ui-button-ghost"
      >
        {isPending ? "Sending…" : "Send password reset link"}
      </button>
      {message && (
        <p
          role={message.tone === "error" ? "alert" : "status"}
          className={`mt-2 text-xs font-medium ${message.tone === "error" ? "ui-text-error" : "ui-text-success"}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}