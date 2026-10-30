"use server";

import type { JSONContent } from "@tiptap/core";

export type Note = {
  title: string;
  body: JSONContent;
  tags: string[];
};

export type NoteActionResult =
  | {
      success: false;
      error: string;
      missingFields: ("title" | "body")[];
    }
  | {
      success: true;
      note: Note;
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

function parseEditorNode(value: unknown): JSONContent | null {
  if (!isRecord(value) || typeof value.type !== "string" || !allowedNodeTypes.has(value.type)) {
    return null;
  }

  const node: JSONContent = { type: value.type };

  if (value.type === "text") {
    if (typeof value.text !== "string") {
      return null;
    }
    node.text = value.text;
  }

  if (value.type === "heading") {
    if (!isRecord(value.attrs) || ![1, 2, 3].includes(Number(value.attrs.level))) {
      return null;
    }
    node.attrs = { level: Number(value.attrs.level) };
  } else if (value.type === "orderedList" && isRecord(value.attrs)) {
    const start = Number(value.attrs.start);
    if (Number.isSafeInteger(start) && start > 0) {
      node.attrs = { start };
    }
  } else if (value.type === "taskItem" && isRecord(value.attrs)) {
    node.attrs = { checked: value.attrs.checked === true };
  }

  if (value.content !== undefined) {
    if (!Array.isArray(value.content)) {
      return null;
    }
    const content = value.content.map(parseEditorNode);
    if (content.some((child) => child === null)) {
      return null;
    }
    node.content = content.filter((child): child is JSONContent => child !== null);
  }

  if (value.marks !== undefined) {
    if (!Array.isArray(value.marks)) {
      return null;
    }
    const marks = value.marks.map((mark) => {
      if (!isRecord(mark) || typeof mark.type !== "string" || !allowedMarkTypes.has(mark.type)) {
        return null;
      }
      return { type: mark.type };
    });
    if (marks.some((mark) => mark === null)) {
      return null;
    }
    node.marks = marks.filter((mark): mark is { type: string } => mark !== null);
  }

  return node;
}

function parseEditorDocument(value: string): JSONContent | null {
  try {
    const document = parseEditorNode(JSON.parse(value) as unknown);
    return document?.type === "doc" ? document : null;
  } catch {
    return null;
  }
}

function getDocumentText(node: JSONContent): string {
  return `${node.text ?? ""}${node.content?.map(getDocumentText).join("") ?? ""}`;
}

export async function checkNote(formData: FormData): Promise<NoteActionResult> {
  const titleValue = formData.get("title");
  const bodyValue = formData.get("body");
  const tagsValue = formData.get("tags");

  const title = typeof titleValue === "string" ? titleValue.trim() : "";
  const body =
    typeof bodyValue === "string" ? parseEditorDocument(bodyValue) : null;
  const missingFields: ("title" | "body")[] = [];

  if (!title) {
    missingFields.push("title");
  }

  if (!body || !getDocumentText(body).trim()) {
    missingFields.push("body");
  }

  if (missingFields.length > 0) {
    const error =
      missingFields.length === 2
        ? "Add a title and note body before saving."
        : missingFields[0] === "title"
          ? "Add a title before saving."
          : "Add a note body before saving.";

    return {
      success: false,
      error,
      missingFields,
    };
  }

  if (!body) {
    return {
      success: false,
      error: "Your note formatting could not be read. Please try again.",
      missingFields: ["body"],
    };
  }

  const tags =
    typeof tagsValue === "string"
      ? [...new Set(tagsValue.split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean))]
      : [];

  return {
    success: true,
    note: { title, body, tags },
  };
}
