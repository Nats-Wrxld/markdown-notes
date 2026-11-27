import { describe, expect, it } from "vitest";
import type { PostgrestError } from "@supabase/supabase-js";
import {
  toPage,
  toPlatformSettings,
  toProfile,
  toStoredNote,
} from "@/lib/providers/supabase/mappers";
import { translateError } from "@/lib/providers/supabase/errors";

const profileRow = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "ada@example.com",
  display_name: "Ada",
  avatar_url: null,
  role: "tutor" as const,
  account_status: "active" as const,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-02T00:00:00.000Z",
};

describe("profile mapping", () => {
  it("maps snake_case rows to the domain profile", () => {
    expect(toProfile(profileRow)).toMatchObject({
      display_name: "Ada",
      account_status: "active",
    });
  });
});

describe("note mapping", () => {
  it("parses a valid stored document and keeps tags", () => {
    const note = toStoredNote({
      id: "n1",
      user_id: profileRow.id,
      title: "Hello",
      body: { type: "doc", content: [{ type: "paragraph" }] },
      tags: ["one"],
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    });
    expect(note.userId).toBe(profileRow.id);
    expect(note.body.type).toBe("doc");
    expect(note.tags).toEqual(["one"]);
  });

  it("falls back to an empty document and empty tags", () => {
    const note = toStoredNote({
      id: "n2",
      user_id: profileRow.id,
      title: "Broken",
      body: "not a document",
      tags: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    });
    expect(note.body).toEqual({ type: "doc", content: [{ type: "paragraph" }] });
    expect(note.tags).toEqual([]);
  });
});

describe("page and settings mapping", () => {
  it("never reports zero pages", () => {
    expect(toPage([], 0, 1, 20)).toEqual({
      rows: [],
      total: 0,
      page: 1,
      pageCount: 1,
    });
  });

  it("uses the same public setting defaults as before", () => {
    expect(toPlatformSettings([])).toEqual({
      allowPublicSignup: true,
      platformNotice: "",
    });
    expect(
      toPlatformSettings([
        { key: "allow_public_signup", value: false },
        { key: "platform_notice", value: "Hello" },
      ]),
    ).toEqual({ allowPublicSignup: false, platformNotice: "Hello" });
  });
});

describe("provider error translation", () => {
  const error = (code: string): PostgrestError => ({
    code,
    message: "raw provider text",
    details: "",
    hint: "",
    name: "PostgrestError",
    toJSON: () => ({
      name: "PostgrestError",
      message: "raw provider text",
      details: "",
      hint: "",
      code,
    }),
  });

  it("maps uniqueness to conflict and missing rows to not_found", () => {
    expect(translateError(error("23505"))?.kind).toBe("conflict");
    expect(translateError(error("PGRST116"))?.kind).toBe("not_found");
  });

  it("never exposes the provider message as the user message", () => {
    const translated = translateError(error("XX000"));
    expect(translated?.kind).toBe("unknown");
    expect(translated?.message).not.toContain("raw provider text");
  });

  it("returns null when there is no error", () => {
    expect(translateError(null)).toBeNull();
  });
});
