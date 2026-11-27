import { describe, expect, it } from "vitest";
import {
  paginationSchema,
  pageMeta,
  parsePage,
} from "@/lib/contracts/common";
import {
  createNoteSchema,
  importNotesSchema,
  listNotesQuerySchema,
  updateNoteSchema,
} from "@/lib/contracts/note";
import { updateProfileSchema } from "@/lib/contracts/profile";
import {
  accountRoleSchema,
  adminNotesQuerySchema,
  updateTutorSchema,
} from "@/lib/contracts/admin";

const BODY = { type: "doc", content: [{ type: "paragraph" }] };

describe("pagination contract", () => {
  it("defaults and caps page size", () => {
    expect(paginationSchema.parse({})).toEqual({ page: 1, pageSize: 20 });
    expect(paginationSchema.parse({ page: "2", pageSize: "100" })).toEqual({
      page: 2,
      pageSize: 100,
    });
    expect(paginationSchema.safeParse({ pageSize: "101" }).success).toBe(false);
    expect(paginationSchema.safeParse({ page: "0" }).success).toBe(false);
  });

  it("rejects unknown query parameters", () => {
    expect(listNotesQuerySchema.safeParse({ sort: "title" }).success).toBe(false);
  });

  it("computes page metadata", () => {
    expect(pageMeta(2, 20, 45)).toEqual({
      page: 2,
      pageSize: 20,
      total: 45,
      pageCount: 3,
    });
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("-2")).toBe(1);
  });
});

describe("note contracts", () => {
  it("accepts a valid note and defaults tags", () => {
    const parsed = createNoteSchema.parse({ title: " Hello ", body: BODY });
    expect(parsed.title).toBe("Hello");
    expect(parsed.tags).toEqual([]);
  });

  it("rejects unknown fields such as ownership", () => {
    expect(
      createNoteSchema.safeParse({
        title: "x",
        body: BODY,
        tags: [],
        userId: "00000000-0000-4000-8000-000000000000",
      }).success,
    ).toBe(false);
  });

  it("rejects an empty title and a non-object body", () => {
    expect(createNoteSchema.safeParse({ title: "  ", body: BODY }).success).toBe(false);
    expect(createNoteSchema.safeParse({ title: "x", body: [] }).success).toBe(false);
  });

  it("requires at least one field on update", () => {
    expect(updateNoteSchema.safeParse({}).success).toBe(false);
    expect(updateNoteSchema.safeParse({ tags: ["one"] }).success).toBe(true);
  });

  it("caps bulk imports at 500 notes", () => {
    const notes = Array.from({ length: 501 }, () => ({
      title: "x",
      body: BODY,
      tags: [],
    }));
    expect(importNotesSchema.safeParse({ notes }).success).toBe(false);
    expect(importNotesSchema.safeParse({ notes: notes.slice(0, 500) }).success).toBe(true);
  });
});

describe("profile and admin contracts", () => {
  it("allows only a display name on self-update", () => {
    expect(updateProfileSchema.parse({ displayName: " Ada " }).displayName).toBe("Ada");
    expect(
      updateProfileSchema.safeParse({ displayName: "Ada", role: "owner" }).success,
    ).toBe(false);
  });

  it("never lets an admin grant owner through the role endpoint", () => {
    expect(accountRoleSchema.safeParse({ role: "admin" }).success).toBe(true);
    expect(accountRoleSchema.safeParse({ role: "tutor" }).success).toBe(true);
    expect(accountRoleSchema.safeParse({ role: "owner" }).success).toBe(false);
  });

  it("requires at least one tutor field and validates ids", () => {
    expect(updateTutorSchema.safeParse({}).success).toBe(false);
    expect(updateTutorSchema.safeParse({ accountStatus: "active" }).success).toBe(true);
    expect(adminNotesQuerySchema.safeParse({ tutorId: "nope" }).success).toBe(false);
  });
});
