import { describe, expect, it } from "vitest";
import {
  getDocumentText,
  normalizeTags,
  parseEditorDocument,
  parseNoteBody,
  safeLinkHref,
} from "@/lib/note-document";

describe("safeLinkHref", () => {
  it("allows http, https, and mailto URLs", () => {
    expect(safeLinkHref("https://example.com/page")).toBe("https://example.com/page");
    expect(safeLinkHref("http://example.com")).toBe("http://example.com/");
    expect(safeLinkHref("mailto:tutor@example.com")).toBe("mailto:tutor@example.com");
  });

  it("rejects dangerous and unsupported protocols", () => {
    expect(safeLinkHref("javascript:alert(1)")).toBeNull();
    expect(safeLinkHref("JavaScript:alert(1)")).toBeNull();
    expect(safeLinkHref("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(safeLinkHref("vbscript:msgbox(1)")).toBeNull();
    expect(safeLinkHref("ftp://example.com")).toBeNull();
  });

  it("rejects relative, malformed, oversized, and non-string values", () => {
    expect(safeLinkHref("/notes/123")).toBeNull();
    expect(safeLinkHref("not a url")).toBeNull();
    expect(safeLinkHref("")).toBeNull();
    expect(safeLinkHref(`https://example.com/${"a".repeat(2048)}`)).toBeNull();
    expect(safeLinkHref(null)).toBeNull();
    expect(safeLinkHref(42)).toBeNull();
    expect(safeLinkHref({ href: "https://example.com" })).toBeNull();
  });
});

describe("parseEditorDocument", () => {
  const validDoc = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "Hello" }],
      },
    ],
  };

  it("accepts a valid Tiptap document", () => {
    const parsed = parseEditorDocument(JSON.stringify(validDoc));
    expect(parsed?.type).toBe("doc");
    expect(getDocumentText(parsed!)).toBe("Hello");
  });

  it("rejects invalid JSON and non-doc roots", () => {
    expect(parseEditorDocument("{not json")).toBeNull();
    expect(parseEditorDocument(JSON.stringify({ type: "paragraph" }))).toBeNull();
    expect(parseEditorDocument("null")).toBeNull();
  });

  it("rejects disallowed node types anywhere in the tree", () => {
    const withImage = {
      type: "doc",
      content: [{ type: "image", attrs: { src: "x" } }],
    };
    expect(parseEditorDocument(JSON.stringify(withImage))).toBeNull();

    const withScript = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "script" }] }],
    };
    expect(parseEditorDocument(JSON.stringify(withScript))).toBeNull();
  });

  it("rejects invalid heading levels", () => {
    const heading = (level: unknown) =>
      JSON.stringify({
        type: "doc",
        content: [{ type: "heading", attrs: { level } }],
      });
    expect(parseEditorDocument(heading(2))?.type).toBe("doc");
    expect(parseEditorDocument(heading(4))).toBeNull();
    expect(parseEditorDocument(heading("2; drop"))).toBeNull();
  });

  it("keeps safe marks and normalizes link hrefs", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "link",
              marks: [
                { type: "bold" },
                { type: "link", attrs: { href: "https://example.com", target: "_blank", rel: "x" } },
              ],
            },
          ],
        },
      ],
    };
    const parsed = parseEditorDocument(JSON.stringify(doc));
    const marks = parsed?.content?.[0]?.content?.[0]?.marks;
    expect(marks).toEqual([
      { type: "bold" },
      { type: "link", attrs: { href: "https://example.com/" } },
    ]);
  });

  it("rejects documents containing unsafe links or unknown marks", () => {
    const unsafeLink = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "x", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] },
          ],
        },
      ],
    };
    expect(parseEditorDocument(JSON.stringify(unsafeLink))).toBeNull();

    const unknownMark = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "x", marks: [{ type: "style" }] }] },
      ],
    };
    expect(parseEditorDocument(JSON.stringify(unknownMark))).toBeNull();
  });

  it("rejects text nodes without string text", () => {
    const doc = { type: "doc", content: [{ type: "text", text: 5 }] };
    expect(parseEditorDocument(JSON.stringify(doc))).toBeNull();
  });
});

describe("parseNoteBody", () => {
  it("parses stored jsonb values and rejects garbage", () => {
    expect(parseNoteBody({ type: "doc", content: [] })?.type).toBe("doc");
    expect(parseNoteBody("doc")).toBeNull();
    expect(parseNoteBody(null)).toBeNull();
    expect(parseNoteBody([{ type: "doc" }])).toBeNull();
  });
});

describe("getDocumentText", () => {
  it("concatenates nested text in order", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "a" }] },
        {
          type: "bulletList",
          content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "b" }] }] },
          ],
        },
      ],
    };
    expect(getDocumentText(doc)).toBe("ab");
    expect(getDocumentText({ type: "doc" })).toBe("");
  });
});

describe("normalizeTags", () => {
  it("trims, lowercases, dedupes, and drops empties", () => {
    expect(normalizeTags(" Ideas, ideas , WORK ,,")).toEqual(["ideas", "work"]);
  });

  it("caps tag length at 30 and count at 10", () => {
    const long = "a".repeat(40);
    expect(normalizeTags(long)).toEqual(["a".repeat(30)]);
    const many = Array.from({ length: 15 }, (_, i) => `tag${i}`).join(",");
    expect(normalizeTags(many)).toHaveLength(10);
  });

  it("returns an empty array for blank input", () => {
    expect(normalizeTags("   ")).toEqual([]);
    expect(normalizeTags("")).toEqual([]);
  });
});