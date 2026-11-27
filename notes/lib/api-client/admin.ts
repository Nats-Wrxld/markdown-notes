"use client";

import {
  createAccountSchema,
  fieldErrors,
  platformSettingsSchema,
} from "@/lib/validation";
import type { ProfileDto } from "@/lib/contracts/profile";
import type { AdminFormState, NoteFormState } from "./form-state";
import { apiJson, fieldErrorsOf, messageFor } from "./http";
import { parseNoteFormData } from "./notes";

export async function createAccount(
  _previous: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const parsed = createAccountSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  try {
    await apiJson<{ id: string }>("/admin/accounts", "POST", parsed.data);
    return {
      success: `${parsed.data.role === "admin" ? "Administrator" : "Tutor"} account created for ${parsed.data.email}.`,
    };
  } catch (error) {
    return {
      error: messageFor(error, "The account couldn’t be created. Please try again."),
      fieldErrors: fieldErrorsOf(error) ?? undefined,
    };
  }
}

export async function setAccountStatus(
  _previous: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const targetId = formData.get("targetId");
  const status = formData.get("status");
  if (typeof targetId !== "string" || (status !== "active" && status !== "suspended")) {
    return { error: "Invalid request." };
  }

  try {
    const profile = await apiJson<ProfileDto>(
      `/admin/tutors/${encodeURIComponent(targetId)}`,
      "PATCH",
      { accountStatus: status },
    );
    const label = profile.displayName || profile.email;
    return {
      success:
        status === "suspended"
          ? `${label} has been suspended.`
          : `${label} has been reactivated.`,
    };
  } catch (error) {
    return {
      error: messageFor(
        error,
        "The account status couldn’t be updated. Please try again.",
      ),
    };
  }
}

export async function updateAccountName(
  _previous: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const targetId = formData.get("targetId");
  if (typeof targetId !== "string") return { error: "Invalid request." };

  const parsed = createAccountSchema.shape.displayName.safeParse(
    formData.get("displayName"),
  );
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  try {
    await apiJson<ProfileDto>(
      `/admin/tutors/${encodeURIComponent(targetId)}`,
      "PATCH",
      { displayName: parsed.data },
    );
    return { success: "Display name updated." };
  } catch (error) {
    return {
      error: messageFor(error, "The name couldn’t be updated. Please try again."),
      fieldErrors: fieldErrorsOf(error) ?? undefined,
    };
  }
}

export async function sendResetLink(
  _previous: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const targetId = formData.get("targetId");
  if (typeof targetId !== "string") return { error: "Invalid request." };

  try {
    const result = await apiJson<{ email: string }>(
      `/admin/accounts/${encodeURIComponent(targetId)}/reset`,
      "POST",
    );
    return {
      success: `If delivery succeeds, a reset link is on its way to ${result.email}.`,
    };
  } catch (error) {
    return {
      error: messageFor(error, "The reset link couldn’t be sent. Please try again."),
    };
  }
}

export async function adminUpdateNote(
  _previous: NoteFormState,
  formData: FormData,
): Promise<NoteFormState> {
  const noteId = formData.get("noteId");
  if (typeof noteId !== "string" || !noteId) return { error: "Invalid request." };

  const parsed = parseNoteFormData(formData);
  if ("errors" in parsed) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.errors,
    };
  }

  try {
    await apiJson(`/admin/notes/${encodeURIComponent(noteId)}`, "PATCH", parsed.note);
    return { success: true };
  } catch (error) {
    return {
      error: messageFor(error, "The note couldn’t be updated. Please try again."),
      fieldErrors: fieldErrorsOf(error) ?? undefined,
    };
  }
}

export async function adminDeleteNote(
  _previous: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const noteId = formData.get("noteId");
  if (typeof noteId !== "string" || !noteId) return { error: "Invalid request." };

  try {
    await apiJson<void>(`/admin/notes/${encodeURIComponent(noteId)}`, "DELETE");
    return { success: "Note deleted." };
  } catch (error) {
    return {
      error: messageFor(error, "The note couldn’t be deleted. Please try again."),
    };
  }
}

export async function updatePlatformSettings(
  _previous: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const parsed = platformSettingsSchema.safeParse({
    allowPublicSignup: formData.get("allowPublicSignup") === "on",
    platformNotice: formData.get("platformNotice") ?? "",
  });
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  try {
    await apiJson("/admin/settings", "PUT", parsed.data);
    return { success: "Platform settings saved." };
  } catch (error) {
    return {
      error: messageFor(error, "Settings couldn’t be saved. Please try again."),
      fieldErrors: fieldErrorsOf(error) ?? undefined,
    };
  }
}
