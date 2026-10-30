import type { JSONContent } from "@tiptap/core";
import type { Note } from "./actions";

export const NOTE_STORAGE_KEY = "urspace:notes";

export type SavedNote = Note & {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

type NoteLoadResult = {
  notes: SavedNote[];
  error: string | null;
};

const allowedNodeTypes = new Set([
  "doc",
  "paragraph",
  "heading",
  "text",
  "hardBreak",
  "bulletList",
  "orderedList",
  "listItem",
  "taskList",
  "taskItem",
  "blockquote",
  "codeBlock",
  "horizontalRule",
]);
const allowedMarkTypes = new Set(["bold", "italic", "underline", "strike", "code"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJSONContent(value: unknown): value is JSONContent {
  if (
    !isRecord(value) ||
    typeof value.type !== "string" ||
    !allowedNodeTypes.has(value.type)
  ) {
    return false;
  }

  if (value.type === "text" && typeof value.text !== "string") {
    return false;
  }

  if (
    value.content !== undefined &&
    (!Array.isArray(value.content) || !value.content.every(isJSONContent))
  ) {
    return false;
  }

  if (
    value.marks !== undefined &&
    (!Array.isArray(value.marks) ||
      !value.marks.every(
      (mark) =>
        isRecord(mark) &&
        typeof mark.type === "string" &&
        allowedMarkTypes.has(mark.type),
    ))
  ) {
    return false;
  }

  if (
    value.attrs !== undefined &&
    (!isRecord(value.attrs) ||
    (value.type === "heading" &&
      ![1, 2, 3].includes(Number(value.attrs.level))) ||
    (value.type === "orderedList" &&
      value.attrs.start !== undefined &&
      (!Number.isSafeInteger(Number(value.attrs.start)) ||
        Number(value.attrs.start) < 1)) ||
    (value.type === "taskItem" &&
      value.attrs.checked !== undefined &&
      typeof value.attrs.checked !== "boolean"))
  ) {
    return false;
  }

  return true;
}

function isSavedNote(value: unknown): value is SavedNote {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.title === "string" &&
    isJSONContent(value.body) &&
    value.body.type === "doc" &&
    Array.isArray(value.tags) &&
    value.tags.every((tag) => typeof tag === "string")
  );
}

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
      error:
        "Saved notes are corrupted and have been left untouched. Saving a new note will replace the unreadable data.",
    };
  }

  if (!Array.isArray(parsed) || !parsed.every(isSavedNote)) {
    return {
      notes: [],
      error:
        "Saved notes couldn’t be read and have been left untouched. Saving a new note will replace the unreadable data.",
    };
  }

  const ids = new Set(parsed.map((note) => note.id));
  if (ids.size !== parsed.length) {
    return {
      notes: [],
      error:
        "Saved notes contain duplicate IDs and couldn’t be restored. Existing storage has been left untouched.",
    };
  }

  return { notes: parsed, error: null };
}

export function persistNotes(notes: SavedNote[]): void {
  window.localStorage.setItem(NOTE_STORAGE_KEY, JSON.stringify(notes));
}

export function getNoteBodyText(node: JSONContent): string {
  return [node.text ?? "", ...(node.content ?? []).map(getNoteBodyText)]
    .filter(Boolean)
    .join(" ");
}
