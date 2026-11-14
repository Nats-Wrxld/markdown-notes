"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import {
  AVATAR_ALLOWED_TYPES,
  AVATAR_MAX_BYTES,
  changePasswordSchema,
  displayNameSchema,
  fieldErrors,
} from "@/lib/validation";

export type ProfileFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: string;
  avatarUrl?: string | null;
};

const AVATAR_BUCKET = "avatars";
const PUBLIC_MARKER = `/storage/v1/object/public/${AVATAR_BUCKET}/`;

function avatarObjectPath(publicUrl: string | null): string | null {
  if (!publicUrl) return null;
  const index = publicUrl.indexOf(PUBLIC_MARKER);
  if (index === -1) return null;
  return publicUrl.slice(index + PUBLIC_MARKER.length);
}

async function activeProfile() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { error: "You need to be logged in to do that." } as const;
  }
  if (profile.account_status === "suspended") {
    return { error: "Your account is suspended." } as const;
  }
  return { profile } as const;
}

export async function updateDisplayName(
  _previous: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const auth = await activeProfile();
  if ("error" in auth) return { error: auth.error };

  const parsed = displayNameSchema.safeParse(formData.get("displayName"));
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data })
    .eq("id", auth.profile.id);

  if (error) {
    return { error: "Your name couldn’t be updated. Please try again." };
  }

  revalidatePath("/profile");
  return { success: "Display name updated." };
}

export async function changePassword(
  _previous: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const auth = await activeProfile();
  if ("error" in auth) return { error: auth.error };

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

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: "Your password couldn’t be updated. Please try again." };
  }

  await logAudit({ action: "password_changed" });
  revalidatePath("/profile");
  return { success: "Password updated." };
}

export async function uploadAvatar(
  _previous: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const auth = await activeProfile();
  if ("error" in auth) return { error: auth.error };

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image to upload." };
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return { error: "Image must be 2 MB or smaller." };
  }
  const extension = AVATAR_ALLOWED_TYPES.get(file.type);
  if (!extension) {
    return { error: "Use a JPEG, PNG, or WebP image." };
  }

  const supabase = await createClient();
  const path = `${auth.profile.id}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return { error: "Your image couldn’t be uploaded. Please try again." };
  }

  const { data: publicUrlData } = supabase.storage
    .from(AVATAR_BUCKET)
    .getPublicUrl(path);
  const avatarUrl = publicUrlData.publicUrl;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", auth.profile.id);

  if (updateError) {
    await supabase.storage.from(AVATAR_BUCKET).remove([path]);
    return { error: "Your image couldn’t be saved. Please try again." };
  }

  const previousPath = avatarObjectPath(auth.profile.avatar_url);
  if (previousPath && previousPath !== path) {
    await supabase.storage.from(AVATAR_BUCKET).remove([previousPath]);
  }

  revalidatePath("/profile");
  return { success: "Photo updated.", avatarUrl };
}

export async function removeAvatar(): Promise<ProfileFormState> {
  const auth = await activeProfile();
  if ("error" in auth) return { error: auth.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", auth.profile.id);

  if (error) {
    return { error: "Your photo couldn’t be removed. Please try again." };
  }

  const previousPath = avatarObjectPath(auth.profile.avatar_url);
  if (previousPath) {
    await supabase.storage.from(AVATAR_BUCKET).remove([previousPath]);
  }

  revalidatePath("/profile");
  return { success: "Photo removed.", avatarUrl: null };
}