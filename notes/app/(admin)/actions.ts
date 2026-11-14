"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner, requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import {
  getDocumentText,
  normalizeTags,
  parseEditorDocument,
} from "@/lib/note-document";
import {
  createAccountSchema,
  displayNameSchema,
  fieldErrors,
  noteInputSchema,
  platformSettingsSchema,
} from "@/lib/validation";
import type { NoteFormState } from "@/app/(tutor)/actions";
import type { Profile } from "@/lib/types";

export type AdminFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: string;
};

const targetSchema = z.object({
  targetId: z.uuid("Invalid account."),
  status: z.enum(["active", "suspended"]),
});

async function siteOrigin(): Promise<string> {
  const headerList = await headers();
  const host =
    headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const protocol =
    headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

// Shared guard for account-management actions. The database trigger and RLS
// enforce the same boundaries; these checks produce clear error messages.
async function resolveTarget(
  actor: Profile,
  targetId: string,
): Promise<{ target: Profile } | { error: string }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", targetId)
    .maybeSingle();
  const target = data as Profile | null;

  if (!target) return { error: "That account could not be found." };
  if (target.role === "owner") return { error: "The owner account can’t be modified." };
  if (target.id === actor.id) return { error: "You can’t modify your own account here." };
  if (actor.role === "admin" && target.role !== "tutor") {
    return { error: "Administrators can only manage tutor accounts." };
  }
  return { target };
}

export async function createAccount(
  _previous: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const actor = await requireStaff();

  const parsed = createAccountSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }

  if (actor.role !== "owner" && parsed.data.role !== "tutor") {
    return { error: "Administrators can only create tutor accounts." };
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return {
      error:
        "Account provisioning isn’t configured yet. The server needs the Supabase service-role key in its environment.",
    };
  }

  const { data, error } = await adminClient.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    app_metadata: { role: parsed.data.role },
    user_metadata: { display_name: parsed.data.displayName },
  });

  if (error || !data.user) {
    if (error?.message.toLowerCase().includes("already")) {
      return { error: "An account with that email already exists." };
    }
    return { error: "The account couldn’t be created. Please try again." };
  }

  await logAudit({
    action: "account.created",
    targetType: "profile",
    targetId: data.user.id,
    details: { role: parsed.data.role },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/tutors");
  revalidatePath("/admin/settings");
  return {
    success: `${parsed.data.role === "admin" ? "Administrator" : "Tutor"} account created for ${parsed.data.email}.`,
  };
}

export async function setAccountStatus(
  _previous: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const actor = await requireStaff();

  const parsed = targetSchema.safeParse({
    targetId: formData.get("targetId"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { error: "Invalid request." };
  }

  const resolved = await resolveTarget(actor, parsed.data.targetId);
  if ("error" in resolved) return { error: resolved.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ account_status: parsed.data.status })
    .eq("id", resolved.target.id);

  if (error) {
    return { error: "The account status couldn’t be updated. Please try again." };
  }

  const suspended = parsed.data.status === "suspended";
  await logAudit({
    action: suspended ? "account.suspended" : "account.reactivated",
    targetType: "profile",
    targetId: resolved.target.id,
    details: { role: resolved.target.role },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/tutors");
  revalidatePath(`/admin/tutors/${resolved.target.id}`);
  revalidatePath("/admin/settings");
  return {
    success: suspended
      ? `${resolved.target.display_name || resolved.target.email} has been suspended.`
      : `${resolved.target.display_name || resolved.target.email} has been reactivated.`,
  };
}

export async function updateAccountName(
  _previous: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const actor = await requireStaff();

  const targetId = formData.get("targetId");
  if (typeof targetId !== "string") return { error: "Invalid request." };

  const resolved = await resolveTarget(actor, targetId);
  if ("error" in resolved) return { error: resolved.error };

  const parsed = displayNameSchema.safeParse(formData.get("displayName"));
  if (!parsed.success) {
    return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data })
    .eq("id", resolved.target.id);

  if (error) {
    return { error: "The name couldn’t be updated. Please try again." };
  }

  await logAudit({
    action: "account.renamed",
    targetType: "profile",
    targetId: resolved.target.id,
  });

  revalidatePath("/admin/tutors");
  revalidatePath(`/admin/tutors/${resolved.target.id}`);
  revalidatePath("/admin/settings");
  return { success: "Display name updated." };
}

export async function sendResetLink(
  _previous: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const actor = await requireStaff();

  const targetId = formData.get("targetId");
  if (typeof targetId !== "string") return { error: "Invalid request." };

  const resolved = await resolveTarget(actor, targetId);
  if ("error" in resolved) return { error: resolved.error };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(resolved.target.email, {
    redirectTo: `${await siteOrigin()}/auth/confirm?next=/reset-password`,
  });

  await logAudit({
    action: "account.reset_requested",
    targetType: "profile",
    targetId: resolved.target.id,
  });

  return { success: `If delivery succeeds, a reset link is on its way to ${resolved.target.email}.` };
}

export async function adminUpdateNote(
  _previous: NoteFormState,
  formData: FormData,
): Promise<NoteFormState> {
  await requireStaff();

  const noteId = formData.get("noteId");
  if (typeof noteId !== "string" || !noteId) return { error: "Invalid request." };

  const titleValue = formData.get("title");
  const bodyValue = formData.get("body");
  const tagsValue = formData.get("tags");

  const errors: Record<string, string[]> = {};
  const parsed = noteInputSchema.safeParse({
    title: typeof titleValue === "string" ? titleValue : "",
    tags: typeof tagsValue === "string" ? normalizeTags(tagsValue) : [],
  });
  if (!parsed.success) {
    const mapped = fieldErrors(parsed.error);
    if (mapped.title) errors.title = mapped.title;
    if (mapped.tags) errors.tags = mapped.tags;
  }

  const body = typeof bodyValue === "string" ? parseEditorDocument(bodyValue) : null;
  if (!body || !getDocumentText(body).trim()) {
    errors.body = ["Add a note body before saving."];
  }
  if (Object.keys(errors).length > 0 || !parsed.success || !body) {
    return { error: "Please fix the highlighted fields.", fieldErrors: errors };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("notes")
    .select("id, user_id, title")
    .eq("id", noteId)
    .maybeSingle();
  if (!existing) {
    return { error: "That note could not be found." };
  }

  const { error } = await supabase
    .from("notes")
    .update({ title: parsed.data.title, body, tags: parsed.data.tags })
    .eq("id", noteId);

  if (error) {
    return { error: "The note couldn’t be updated. Please try again." };
  }

  await logAudit({
    action: "note.updated_by_staff",
    targetType: "note",
    targetId: noteId,
    details: { ownerId: existing.user_id },
  });

  revalidatePath("/admin/notes");
  revalidatePath(`/admin/notes/${noteId}`);
  revalidatePath(`/admin/tutors/${existing.user_id}`);
  return { success: true };
}

export async function adminDeleteNote(
  _previous: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireStaff();

  const noteId = formData.get("noteId");
  if (typeof noteId !== "string" || !noteId) return { error: "Invalid request." };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("notes")
    .select("id, user_id, title")
    .eq("id", noteId)
    .maybeSingle();
  if (!existing) {
    return { error: "That note could not be found." };
  }

  const { error } = await supabase.from("notes").delete().eq("id", noteId);
  if (error) {
    return { error: "The note couldn’t be deleted. Please try again." };
  }

  await logAudit({
    action: "note.deleted_by_staff",
    targetType: "note",
    targetId: noteId,
    details: { ownerId: existing.user_id, title: existing.title },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/notes");
  revalidatePath(`/admin/tutors/${existing.user_id}`);
  return { success: "Note deleted." };
}

export async function updatePlatformSettings(
  _previous: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const actor = await requireOwner();

  const parsed = platformSettingsSchema.safeParse({
    allowPublicSignup: formData.get("allowPublicSignup") === "on",
    platformNotice: formData.get("platformNotice") ?? "",
  });
  if (!parsed.success) {
    return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("platform_settings").upsert(
    [
      { key: "allow_public_signup", value: parsed.data.allowPublicSignup, updated_by: actor.id },
      { key: "platform_notice", value: parsed.data.platformNotice, updated_by: actor.id },
    ],
    { onConflict: "key" },
  );

  if (error) {
    return { error: "Settings couldn’t be saved. Please try again." };
  }

  await logAudit({
    action: "settings.updated",
    details: { allowPublicSignup: parsed.data.allowPublicSignup },
  });

  revalidatePath("/admin/settings");
  revalidatePath("/signup");
  revalidatePath("/");
  return { success: "Platform settings saved." };
}