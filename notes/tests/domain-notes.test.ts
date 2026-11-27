import { describe, expect, it, vi } from "vitest";
import type { AppContext, AppScope, NotesPort } from "@/lib/ports";
import type { Profile } from "@/lib/types";
import {
  createMyNote,
  getMyNote,
  listMyNotes,
  listNotesForAdmin,
  updateNoteAsStaff,
} from "@/lib/domain/notes";
import { AppError } from "@/lib/domain/errors";

const BODY = {
  type: "doc",
  content: [
    { type: "paragraph", content: [{ type: "text", text: "Hello" }] },
  ],
};

const profile: Profile = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "tutor@example.com",
  display_name: "Tutor",
  avatar_url: null,
  role: "tutor",
  account_status: "active",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

function contextWith(notes: Partial<NotesPort>, overrides: Partial<Profile> = {}) {
  const auditAppend = vi.fn(async () => undefined);
  const scope = {
    notes,
    profiles: {
      findByIds: vi.fn(async () => []),
      findById: vi.fn(async () => null),
    },
    audit: { append: auditAppend },
  } as unknown as AppScope;

  const context: AppContext = {
    profile: { ...profile, ...overrides },
    scope,
    via: "cookie",
  };
  return { context, auditAppend };
}

describe("note ownership", () => {
  it("scopes reads to the caller and hides other users' notes", async () => {
    const findOwned = vi.fn(async () => null);
    const { context } = contextWith({ findOwned });

    await expect(getMyNote(context, "n1")).rejects.toMatchObject({
      code: "not_found",
    });
    expect(findOwned).toHaveBeenCalledWith("n1", profile.id);
  });

  it("stamps new notes with the caller's id, never a client value", async () => {
    const create = vi.fn(async () => ({
      id: "n1",
      userId: profile.id,
      title: "Hello",
      body: BODY,
      tags: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    }));
    const { context } = contextWith({ create });

    await createMyNote(context, { title: "Hello", body: BODY, tags: [] });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: profile.id }),
    );
  });

  it("rejects an empty document before touching the provider", async () => {
    const create = vi.fn();
    const { context } = contextWith({ create });

    await expect(
      createMyNote(context, { title: "Hello", body: { type: "doc" }, tags: [] }),
    ).rejects.toMatchObject({ code: "validation_error" });
    expect(create).not.toHaveBeenCalled();
  });
});

describe("suspension", () => {
  it("blocks suspended accounts before any provider call", async () => {
    const create = vi.fn();
    const { context } = contextWith(
      { create },
      { account_status: "suspended" },
    );

    await expect(
      createMyNote(context, { title: "Hello", body: BODY, tags: [] }),
    ).rejects.toMatchObject({ code: "account_suspended" });
    expect(create).not.toHaveBeenCalled();
  });
});

describe("pagination and summary", () => {
  it("uses the page total and avoids a second query for one page", async () => {
    const summaryByOwner = vi.fn();
    const { context } = contextWith({
      listByOwner: vi.fn(async () => ({
        rows: [
          {
            id: "n1",
            userId: profile.id,
            title: "Hello",
            body: BODY,
            tags: ["one"],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        total: 1,
        page: 1,
        pageCount: 1,
      })),
      summaryByOwner,
    });

    const result = await listMyNotes(context, { page: 1, pageSize: 20 });
    expect(result.meta.total).toBe(1);
    expect(result.summary).toEqual({ thisWeek: 1, tagCount: 1 });
    expect(summaryByOwner).not.toHaveBeenCalled();
  });

  it("asks for a narrow summary only when the collection exceeds one page", async () => {
    const summaryByOwner = vi.fn(async () => ({ thisWeek: 4, tagCount: 9 }));
    const { context } = contextWith({
      listByOwner: vi.fn(async () => ({
        rows: [],
        total: 250,
        page: 1,
        pageCount: 13,
      })),
      summaryByOwner,
    });

    const result = await listMyNotes(context, { page: 1, pageSize: 20 });
    expect(result.meta.pageCount).toBe(13);
    expect(result.summary).toEqual({ thisWeek: 4, tagCount: 9 });
    expect(summaryByOwner).toHaveBeenCalledWith(profile.id);
  });
});

describe("staff authorization", () => {
  it("denies the admin collection to a tutor", async () => {
    const { context } = contextWith({});
    await expect(
      listNotesForAdmin(context, { page: 1, pageSize: 20 }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("allows staff and audits oversight edits", async () => {
    const notes = {
      findById: vi.fn(async () => ({
        id: "n1",
        userId: "22222222-2222-4222-8222-222222222222",
        title: "Old",
        body: BODY,
        tags: [],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      })),
      update: vi.fn(async () => ({
        id: "n1",
        userId: "22222222-2222-4222-8222-222222222222",
        title: "New",
        body: BODY,
        tags: [],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      })),
    };
    const auditAppend = vi.fn(async () => undefined);
    const scope = {
      notes,
      audit: { append: auditAppend },
    } as unknown as AppScope;
    const context: AppContext = {
      profile: { ...profile, role: "admin" },
      scope,
      via: "cookie",
    };

    const note = await updateNoteAsStaff(context, "n1", { title: "New" });
    expect(note.title).toBe("New");
    expect(auditAppend).toHaveBeenCalledWith(
      expect.objectContaining({ action: "note.updated_by_staff" }),
    );
  });

  it("uses the documented error type for denied writes", async () => {
    const { context } = contextWith({});
    await expect(
      updateNoteAsStaff(context, "n1", { title: "x" }),
    ).rejects.toBeInstanceOf(AppError);
  });
});
