"use server";

import { revalidatePath } from "next/cache";
import type { JSONContent } from "@tiptap/core";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getDocumentText,
  normalizeTags,
  parseEditorDocument,
  parseNoteBody,
} from "@/lib/note-document";
import { fieldErrors, noteInputSchema } from "@/lib/validation";
import type { DashboardNote, NoteRow } from "@/lib/types";

export type NoteFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
  note?: DashboardNote;
  importedCount?: number;
};

const EMPTY_DOCUMENT: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

function toDashboardNote(row: NoteRow): DashboardNote {
  return {
    id: row.id,
    title: row.title,
    body: parseNoteBody(row.body) ?? EMPTY_DOCUMENT,
    tags: Array.isArray(row.tags) ? row.tags : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type ParsedNote = {
  title: string;
  body: JSONContent;
  tags: string[];
};

function parseNoteForm(
  formData: FormData,
): { note: ParsedNote } | { errors: Record<string, string[]> } {
  const titleValue = formData.get("title");
  const bodyValue = formData.get("body");
  const tagsValue = formData.get("tags");

  const errors: Record<string, string[]> = {};

  const parsed = noteInputSchema.safeParse({
    title: typeof titleValue === "string" ? titleValue : "",
    tags:
      typeof tagsValue === "string" ? normalizeTags(tagsValue) : [],
  });

  if (!parsed.success) {
    const mapped = fieldErrors(parsed.error);
    if (mapped.title) errors.title = mapped.title;
    if (mapped.tags) errors.tags = mapped.tags;
  }

  const body =
    typeof bodyValue === "string" ? parseEditorDocument(bodyValue) : null;
  if (!body || !getDocumentText(body).trim()) {
    errors.body = ["Add a note body before saving."];
  }

  if (Object.keys(errors).length > 0 || !parsed.success || !body) {
    return { errors };
  }

  return {
    note: { title: parsed.data.title, body, tags: parsed.data.tags },
  };
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

export async function createNote(
  _previous: NoteFormState,
  formData: FormData,
): Promise<NoteFormState> {
  const auth = await activeProfile();
  if ("error" in auth) {
    return { error: auth.error };
  }

  const parsed = parseNoteForm(formData);
  if ("errors" in parsed) {
    return {
      error: "Please fix the highlighted fields before saving.",
      fieldErrors: parsed.errors,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .insert({
      user_id: auth.profile.id,
      title: parsed.note.title,
      body: parsed.note.body,
      tags: parsed.note.tags,
    })
    .select()
    .single();

  if (error || !data) {
    return { error: "Your note couldn’t be saved. Please try again." };
  }

  revalidatePath("/dashboard");
  return { success: true, note: toDashboardNote(data as NoteRow) };
}

export async function updateNote(
  _previous: NoteFormState,
  formData: FormData,
): Promise<NoteFormState> {
  const auth = await activeProfile();
  if ("error" in auth) {
    return { error: auth.error };
  }

  const noteId = formData.get("noteId");
  if (typeof noteId !== "string" || !noteId) {
    return { error: "That note could not be found." };
  }

  const parsed = parseNoteForm(formData);
  if ("errors" in parsed) {
    return {
      error: "Please fix the highlighted fields before saving.",
      fieldErrors: parsed.errors,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .update({
      title: parsed.note.title,
      body: parsed.note.body,
      tags: parsed.note.tags,
    })
    .eq("id", noteId)
    .eq("user_id", auth.profile.id)
    .select()
    .maybeSingle();

  if (error) {
    return { error: "Your changes couldn’t be saved. Please try again." };
  }
  if (!data) {
    return { error: "That note could not be found." };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/notes/${noteId}`);
  return { success: true, note: toDashboardNote(data as NoteRow) };
}

export async function deleteNote(
  _previous: NoteFormState,
  formData: FormData,
): Promise<NoteFormState> {
  const auth = await activeProfile();
  if ("error" in auth) {
    return { error: auth.error };
  }

  const noteId = formData.get("noteId");
  if (typeof noteId !== "string" || !noteId) {
    return { error: "That note could not be found." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .delete()
    .eq("id", noteId)
    .eq("user_id", auth.profile.id)
    .select()
    .maybeSingle();

  if (error) {
    return { error: "That note couldn’t be deleted. Please try again." };
  }
  if (!data) {
    return { error: "That note could not be found." };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/notes/${noteId}`);
  return { success: true };
}

const IMPORT_LIMIT = 500;

export async function importLocalNotes(
  _previous: NoteFormState,
  formData: FormData,
): Promise<NoteFormState> {
  const auth = await activeProfile();
  if ("error" in auth) {
    return { error: auth.error };
  }

  const payload = formData.get("notes");
  if (typeof payload !== "string") {
    return { error: "No notes were found to import." };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(payload);
  } catch {
    return { error: "The saved notes could not be read." };
  }

  if (!Array.isArray(raw)) {
    return { error: "The saved notes could not be read." };
  }

  const rows: { user_id: string; title: string; body: JSONContent; tags: string[] }[] = [];
  for (const item of raw.slice(0, IMPORT_LIMIT)) {
    if (typeof item !== "object" || item === null) continue;
    const record = item as Record<string, unknown>;
    const title = typeof record.title === "string" ? record.title.trim() : "";
    const body = parseNoteBody(record.body);
    if (!title || title.length > 200 || !body || !getDocumentText(body).trim()) {
      continue;
    }
    const tags = Array.isArray(record.tags)
      ? normalizeTags(record.tags.filter((t): t is string => typeof t === "string").join(","))
      : [];
    rows.push({ user_id: auth.profile.id, title, body, tags });
  }

  if (rows.length === 0) {
    return { error: "No readable notes were found to import." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("notes").insert(rows);
  if (error) {
    return { error: "Your notes couldn’t be imported. Please try again." };
  }

  revalidatePath("/dashboard");
  return { success: true, importedCount: rows.length };
}