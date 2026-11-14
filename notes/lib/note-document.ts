import type { JSONContent } from "@tiptap/core";

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
const allowedMarkTypes = new Set([
  "bold",
  "italic",
  "underline",
  "strike",
  "code",
  "link",
]);

const SAFE_LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

export function safeLinkHref(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048) {
    return null;
  }
  try {
    const url = new URL(value);
    return SAFE_LINK_PROTOCOLS.has(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseEditorNode(value: unknown): JSONContent | null {
  if (
    !isRecord(value) ||
    typeof value.type !== "string" ||
    !allowedNodeTypes.has(value.type)
  ) {
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
    if (
      !isRecord(value.attrs) ||
      ![1, 2, 3].includes(Number(value.attrs.level))
    ) {
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
    const marks: { type: string; attrs?: Record<string, unknown> }[] = [];
    for (const mark of value.marks) {
      if (
        !isRecord(mark) ||
        typeof mark.type !== "string" ||
        !allowedMarkTypes.has(mark.type)
      ) {
        return null;
      }
      if (mark.type === "link") {
        const href = isRecord(mark.attrs) ? safeLinkHref(mark.attrs.href) : null;
        if (!href) {
          return null;
        }
        marks.push({ type: "link", attrs: { href } });
      } else {
        marks.push({ type: mark.type });
      }
    }
    node.marks = marks;
  }

  return node;
}

export function parseEditorDocument(value: string): JSONContent | null {
  try {
    const document = parseEditorNode(JSON.parse(value) as unknown);
    return document?.type === "doc" ? document : null;
  } catch {
    return null;
  }
}

export function parseNoteBody(value: unknown): JSONContent | null {
  return parseEditorNode(value);
}

export function getDocumentText(node: JSONContent): string {
  return `${node.text ?? ""}${node.content?.map(getDocumentText).join("") ?? ""}`;
}

export function normalizeTags(value: string): string[] {
  return [
    ...new Set(
      value
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
        .map((tag) => tag.slice(0, 30)),
    ),
  ].slice(0, 10);
}