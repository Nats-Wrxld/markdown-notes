"use client";

import type { JSONContent } from "@tiptap/core";
import {
  getDocumentText,
  normalizeTags,
  parseEditorDocument,
} from "@/lib/note-document";
import { fieldErrors, noteInputSchema } from "@/lib/validation";
import type { NoteDto } from "@/lib/contracts/note";
import type { NoteFormState } from "./form-state";
import { apiJson, fieldErrorsOf, messageFor } from "./http";

type ParsedNote = { title: string; body: JSONContent; tags: string[] };

export function parseNoteFormData(
  formData: FormData,
): { note: ParsedNote } | { errors: Record<string, string[]> } {
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

  const body =
    typeof bodyValue === "string" ? parseEditorDocument(bodyValue) : null;
  if (!body || !getDocumentText(body).trim()) {
    errors.body = ["Add a note body before saving."];
  }

  if (Object.keys(errors).length > 0 || !parsed.success || !body) {
    return { errors };
  }

  return { note: { title: parsed.data.title, body, tags: parsed.data.tags } };
}

export async function createNote(
  _previous: NoteFormState,
  formData: FormData,
): Promise<NoteFormState> {
  const parsed = parseNoteFormData(formData);
  if ("errors" in parsed) {
    return {
      error: "Please fix the highlighted fields before saving.",
      fieldErrors: parsed.errors,
    };
  }

  try {
    const note = await apiJson<NoteDto>("/notes", "POST", parsed.note);
    return { success: true, note };
  } catch (error) {
    return {
      error: messageFor(error, "Your note couldn’t be saved. Please try again."),
      fieldErrors: fieldErrorsOf(error) ?? undefined,
    };
  }
}

export async function updateNote(
  _previous: NoteFormState,
  formData: FormData,
): Promise<NoteFormState> {
  const noteId = formData.get("noteId");
  if (typeof noteId !== "string" || !noteId) {
    return { error: "That note could not be found." };
  }

  const parsed = parseNoteFormData(formData);
  if ("errors" in parsed) {
    return {
      error: "Please fix the highlighted fields before saving.",
      fieldErrors: parsed.errors,
    };
  }

  try {
    const note = await apiJson<NoteDto>(
      `/notes/${encodeURIComponent(noteId)}`,
      "PATCH",
      parsed.note,
    );
    return { success: true, note };
  } catch (error) {
    return {
      error: messageFor(error, "Your changes couldn’t be saved. Please try again."),
      fieldErrors: fieldErrorsOf(error) ?? undefined,
    };
  }
}

export async function deleteNote(
  _previous: NoteFormState,
  formData: FormData,
): Promise<NoteFormState> {
  const noteId = formData.get("noteId");
  if (typeof noteId !== "string" || !noteId) {
    return { error: "That note could not be found." };
  }

  try {
    await apiJson<void>(`/notes/${encodeURIComponent(noteId)}`, "DELETE");
    return { success: true };
  } catch (error) {
    return {
      error: messageFor(
        error,
        "That note couldn’t be deleted. Please try again.",
      ),
    };
  }
}

export async function importLocalNotes(
  _previous: NoteFormState,
  formData: FormData,
): Promise<NoteFormState> {
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

  const notes = raw
    .slice(0, 500)
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map((item) => ({
      title: typeof item.title === "string" ? item.title.trim() : "",
      body: item.body,
      tags: Array.isArray(item.tags)
        ? normalizeTags(
            item.tags
              .filter((tag): tag is string => typeof tag === "string")
              .join(","),
          )
        : [],
    }))
    .filter((note) => note.title.length > 0 && note.title.length <= 200);

  if (notes.length === 0) {
    return { error: "No readable notes were found to import." };
  }

  try {
    const result = await apiJson<{ importedCount: number }>(
      "/notes/import",
      "POST",
      { notes },
    );
    return { success: true, importedCount: result.importedCount };
  } catch (error) {
    return {
      error: messageFor(
        error,
        "Your notes couldn’t be imported. Please try again.",
      ),
      fieldErrors: fieldErrorsOf(error) ?? undefined,
    };
  }
}
