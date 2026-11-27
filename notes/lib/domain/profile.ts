import "server-only";

import { AVATAR_ALLOWED_TYPES, AVATAR_MAX_BYTES } from "@/lib/validation";
import type { AppContext } from "@/lib/ports";
import type { Profile } from "@/lib/types";
import { requireActive } from "@/lib/api/policies";
import { AppError, fromPortError } from "./errors";
import { audit } from "./audit";

export async function updateDisplayName(
  context: AppContext,
  displayName: string,
): Promise<Profile> {
  requireActive(context);
  try {
    return await context.scope.profiles.update(context.profile.id, {
      displayName,
    });
  } catch (error) {
    throw fromPortError(error as never, "Your name couldn’t be updated. Please try again.");
  }
}

export async function changePassword(
  context: AppContext,
  password: string,
): Promise<void> {
  requireActive(context);
  try {
    await context.scope.session.updatePassword(password);
  } catch (error) {
    throw fromPortError(error as never, "Your password couldn’t be updated. Please try again.");
  }
  await audit(context, { action: "password_changed" });
}

export async function uploadAvatar(
  context: AppContext,
  file: File,
): Promise<{ avatarUrl: string }> {
  requireActive(context);

  if (file.size === 0) {
    throw new AppError("validation_error", "Choose an image to upload.");
  }
  if (file.size > AVATAR_MAX_BYTES) {
    throw new AppError("payload_too_large", "Image must be 2 MB or smaller.");
  }
  if (!AVATAR_ALLOWED_TYPES.has(file.type)) {
    throw new AppError(
      "unsupported_media_type",
      "Use a JPEG, PNG, or WebP image.",
    );
  }

  let avatarUrl: string;
  try {
    avatarUrl = await context.scope.storage.uploadAvatar(
      context.profile.id,
      file,
    );
  } catch (error) {
    throw fromPortError(error as never, "Your image couldn’t be uploaded. Please try again.");
  }

  try {
    await context.scope.profiles.update(context.profile.id, { avatarUrl });
  } catch (error) {
    // Roll back the orphan object so it cannot accumulate.
    await context.scope.storage.removeAvatarByUrl(avatarUrl);
    throw fromPortError(error as never, "Your image couldn’t be saved. Please try again.");
  }

  await context.scope.storage.removeAvatarByUrl(context.profile.avatar_url);
  return { avatarUrl };
}

export async function removeAvatar(context: AppContext): Promise<void> {
  requireActive(context);
  try {
    await context.scope.profiles.update(context.profile.id, { avatarUrl: null });
  } catch (error) {
    throw fromPortError(error as never, "Your photo couldn’t be removed. Please try again.");
  }
  await context.scope.storage.removeAvatarByUrl(context.profile.avatar_url);
}
