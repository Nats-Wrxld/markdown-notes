import type { JSONContent } from "@tiptap/core";
import { parseNoteBody } from "@/lib/note-document";

export const NOTE_STORAGE_KEY = "urspace:notes";
export const IMPORT_FLAG_KEY = "urspace:notes-imported";

export type SavedNote = {
  id: string;
  title: string;
  body: JSONContent;
  tags: string[];
};

type NoteLoadResult = {
  notes: SavedNote[];
  error: string | null;
};

export function loadNotes(): NoteLoadResult {
  let stored: string | null;
  try {
    stored = window.localStorage.getItem(NOTE_STORAGE_KEY);
  } catch {
    return {
      notes: [],
      error:
        "Saved notes are unavailable in this browser. Check storage permissions and try again.",
    };
  }

  if (stored === null) {
    return { notes: [], error: null };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stored) as unknown;
  } catch {
    return {
      notes: [],
      error: "Saved notes are corrupted and have been left untouched.",
    };
  }

  if (!Array.isArray(parsed)) {
    return {
      notes: [],
      error: "Saved notes couldn’t be read and have been left untouched.",
    };
  }

  const notes: SavedNote[] = [];
  for (const item of parsed) {
    if (typeof item !== "object" || item === null) continue;
    const record = item as Record<string, unknown>;
    if (typeof record.id !== "string" || typeof record.title !== "string") {
      continue;
    }
    const body = parseNoteBody(record.body);
    if (!body) continue;
    const tags = Array.isArray(record.tags)
      ? record.tags.filter((tag): tag is string => typeof tag === "string")
      : [];
    notes.push({ id: record.id, title: record.title, body, tags });
  }

  return { notes, error: null };
}