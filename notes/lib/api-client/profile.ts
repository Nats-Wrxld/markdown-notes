"use client";

import {
  AVATAR_ALLOWED_TYPES,
  AVATAR_MAX_BYTES,
  changePasswordSchema,
  displayNameSchema,
  fieldErrors,
} from "@/lib/validation";
import type { ProfileDto } from "@/lib/contracts/profile";
import type { ProfileFormState } from "./form-state";
import { apiFetch, apiJson, fieldErrorsOf, messageFor } from "./http";

export async function updateDisplayName(
  _previous: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const parsed = displayNameSchema.safeParse(formData.get("displayName"));
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  try {
    await apiJson<ProfileDto>("/me", "PATCH", { displayName: parsed.data });
    return { success: "Display name updated." };
  } catch (error) {
    return {
      error: messageFor(error, "Your name couldn’t be updated. Please try again."),
      fieldErrors: fieldErrorsOf(error) ?? undefined,
    };
  }
}

export async function changePassword(
  _previous: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const parsed = changePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  try {
    await apiJson<{ updated: boolean }>("/me/password", "PUT", {
      password: parsed.data.password,
    });
    return { success: "Password updated." };
  } catch (error) {
    return {
      error: messageFor(
        error,
        "Your password couldn’t be updated. Please try again.",
      ),
      fieldErrors: fieldErrorsOf(error) ?? undefined,
    };
  }
}

export async function uploadAvatar(
  _previous: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image to upload." };
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return { error: "Image must be 2 MB or smaller." };
  }
  if (!AVATAR_ALLOWED_TYPES.has(file.type)) {
    return { error: "Use a JPEG, PNG, or WebP image." };
  }

  const body = new FormData();
  body.set("avatar", file);

  try {
    const result = await apiFetch<{ avatarUrl: string }>("/me/avatar", {
      method: "POST",
      body,
    });
    return { success: "Photo updated.", avatarUrl: result.avatarUrl };
  } catch (error) {
    return {
      error: messageFor(
        error,
        "Your image couldn’t be uploaded. Please try again.",
      ),
    };
  }
}

export async function removeAvatar(): Promise<ProfileFormState> {
  try {
    await apiJson<{ avatarUrl: null }>("/me/avatar", "DELETE");
    return { success: "Photo removed.", avatarUrl: null };
  } catch (error) {
    return {
      error: messageFor(
        error,
        "Your photo couldn’t be removed. Please try again.",
      ),
    };
  }
}
