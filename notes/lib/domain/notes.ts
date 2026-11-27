import "server-only";

import {
  getDocumentText,
  parseNoteBody,
} from "@/lib/note-document";
import type {
  AdminNote,
  AdminStats,
  DashboardNote,
  Page,
  Profile,
} from "@/lib/types";
import type { AppContext, StoredNote } from "@/lib/ports";
import type { PageMeta } from "@/lib/contracts/common";
import type { CreateNoteInput, UpdateNoteInput } from "@/lib/contracts/note";
import { pageMeta } from "@/lib/contracts/common";
import { requireActive, requireStaff } from "@/lib/api/policies";
import { AppError, fromPortError } from "./errors";
import { audit } from "./audit";

export type NotesPage = {
  items: DashboardNote[];
  meta: PageMeta;
  summary: { thisWeek: number; tagCount: number };
};

function toDashboard(note: StoredNote): DashboardNote {
  return {
    id: note.id,
    title: note.title,
    body: note.body,
    tags: note.tags,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

function toAdmin(note: StoredNote, owner: Profile | undefined): AdminNote {
  return {
    ...toDashboard(note),
    owner: {
      id: note.userId,
      display_name: owner?.display_name ?? "",
      email: owner?.email ?? "Unknown account",
      avatar_url: owner?.avatar_url ?? null,
    },
  };
}

function parseBodyOrThrow(body: unknown): StoredNote["body"] {
  const parsed = parseNoteBody(body);
  if (!parsed || !getDocumentText(parsed).trim()) {
    throw new AppError(
      "validation_error",
      "Please fix the highlighted fields before saving.",
      { fieldErrors: { body: ["Add a note body before saving."] } },
    );
  }
  return parsed;
}

/** Notes always belong to the caller; staff use the admin collection. */
export async function listMyNotes(
  context: AppContext,
  options: { page: number; pageSize: number; q?: string; tag?: string },
): Promise<NotesPage> {
  requireActive(context);
  try {
    const page = await context.scope.notes.listByOwner(context.profile.id, options);
    const items = page.rows.map(toDashboard);

    // For a single page we already have every row: avoid a second query.
    const summary =
      page.total <= options.pageSize
        ? summaryOf(items)
        : await context.scope.notes.summaryByOwner(context.profile.id);

    return {
      items,
      meta: pageMeta(options.page, options.pageSize, page.total),
      summary,
    };
  } catch (error) {
    throw fromPortError(error as never, "Your notes could not be loaded.");
  }
}

export function summaryOf(notes: DashboardNote[]): {
  thisWeek: number;
  tagCount: number;
} {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return {
    thisWeek: notes.filter(
      (note) => new Date(note.createdAt).getTime() >= weekAgo,
    ).length,
    tagCount: new Set(notes.flatMap((note) => note.tags)).size,
  };
}

export async function getMyNote(
  context: AppContext,
  id: string,
): Promise<DashboardNote> {
  requireActive(context);
  const note = await context.scope.notes.findOwned(id, context.profile.id);
  if (!note) {
    throw new AppError("not_found", "That note could not be found.");
  }
  return toDashboard(note);
}

export async function createMyNote(
  context: AppContext,
  input: CreateNoteInput,
): Promise<DashboardNote> {
  requireActive(context);
  const body = parseBodyOrThrow(input.body);
  try {
    const note = await context.scope.notes.create({
      ownerId: context.profile.id,
      title: input.title,
      body,
      tags: input.tags,
    });
    return toDashboard(note);
  } catch (error) {
    throw fromPortError(error as never, "Your note couldn’t be saved. Please try again.");
  }
}

export async function updateMyNote(
  context: AppContext,
  id: string,
  input: UpdateNoteInput,
): Promise<DashboardNote> {
  requireActive(context);
  const patch: { title?: string; body?: StoredNote["body"]; tags?: string[] } = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.tags !== undefined) patch.tags = input.tags;
  if (input.body !== undefined) patch.body = parseBodyOrThrow(input.body);

  try {
    const note = await context.scope.notes.updateOwned(
      id,
      context.profile.id,
      patch,
    );
    if (!note) {
      throw new AppError("not_found", "That note could not be found.");
    }
    return toDashboard(note);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw fromPortError(error as never, "Your changes couldn’t be saved. Please try again.");
  }
}

export async function deleteMyNote(
  context: AppContext,
  id: string,
): Promise<void> {
  requireActive(context);
  try {
    const deleted = await context.scope.notes.deleteOwned(id, context.profile.id);
    if (!deleted) {
      throw new AppError("not_found", "That note could not be found.");
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw fromPortError(error as never, "That note couldn’t be deleted. Please try again.");
  }
}

export async function importMyNotes(
  context: AppContext,
  notes: { title: string; body: unknown; tags: string[] }[],
): Promise<number> {
  requireActive(context);

  const rows: {
    ownerId: string;
    title: string;
    body: StoredNote["body"];
    tags: string[];
  }[] = [];

  for (const item of notes) {
    const body = parseNoteBody(item.body);
    if (!body || !getDocumentText(body).trim()) continue;
    rows.push({
      ownerId: context.profile.id,
      title: item.title,
      body,
      tags: item.tags,
    });
  }

  if (rows.length === 0) {
    throw new AppError(
      "validation_error",
      "No readable notes were found to import.",
    );
  }

  try {
    return await context.scope.notes.createMany(rows);
  } catch (error) {
    throw fromPortError(error as never, "Your notes couldn’t be imported. Please try again.");
  }
}

/* ------------------------------ admin notes ------------------------------ */

export async function listNotesForAdmin(
  context: AppContext,
  options: { page: number; pageSize: number; q?: string; tutorId?: string },
): Promise<Page<AdminNote>> {
  requireStaff(context);
  try {
    const result = await context.scope.notes.listAll(options);
    const owners = await context.scope.profiles.findByIds(
      result.rows.map((note) => note.userId),
    );
    const byId = new Map(owners.map((owner) => [owner.id, owner]));
    return {
      ...result,
      rows: result.rows.map((note) => toAdmin(note, byId.get(note.userId))),
    };
  } catch (error) {
    throw fromPortError(error as never, "Notes could not be loaded.");
  }
}

export async function listNotesForTutor(
  context: AppContext,
  tutorId: string,
  page: number,
  pageSize: number,
): Promise<Page<AdminNote>> {
  requireStaff(context);
  try {
    const tutor = await context.scope.profiles.findTutor(tutorId);
    if (!tutor) {
      throw new AppError("not_found", "That account could not be found.");
    }
    const result = await context.scope.notes.listByTutor(tutorId, page, pageSize);
    return {
      ...result,
      rows: result.rows.map((note) => toAdmin(note, tutor)),
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw fromPortError(error as never, "Notes could not be loaded.");
  }
}

export async function getNoteForAdmin(
  context: AppContext,
  id: string,
): Promise<{ note: DashboardNote; owner: Profile }> {
  requireStaff(context);
  const note = await context.scope.notes.findById(id);
  if (!note) {
    throw new AppError("not_found", "That note could not be found.");
  }
  const owner = await context.scope.profiles.findById(note.userId);
  if (!owner) {
    throw new AppError("not_found", "That note could not be found.");
  }
  return { note: toDashboard(note), owner };
}

export async function updateNoteAsStaff(
  context: AppContext,
  id: string,
  input: UpdateNoteInput,
): Promise<DashboardNote> {
  requireStaff(context);

  const existing = await context.scope.notes.findById(id);
  if (!existing) {
    throw new AppError("not_found", "That note could not be found.");
  }

  const patch: { title?: string; body?: StoredNote["body"]; tags?: string[] } = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.tags !== undefined) patch.tags = input.tags;
  if (input.body !== undefined) patch.body = parseBodyOrThrow(input.body);

  try {
    const note = await context.scope.notes.update(id, patch);
    if (!note) {
      throw new AppError("not_found", "That note could not be found.");
    }
    await audit(context, {
      action: "note.updated_by_staff",
      targetType: "note",
      targetId: id,
      details: { ownerId: existing.userId },
    });
    return toDashboard(note);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw fromPortError(error as never, "The note couldn’t be updated. Please try again.");
  }
}

export async function deleteNoteAsStaff(
  context: AppContext,
  id: string,
): Promise<void> {
  requireStaff(context);

  const existing = await context.scope.notes.findById(id);
  if (!existing) {
    throw new AppError("not_found", "That note could not be found.");
  }

  const deleted = await context.scope.notes.delete(id);
  if (!deleted) {
    throw new AppError("not_found", "That note could not be found.");
  }

  await audit(context, {
    action: "note.deleted_by_staff",
    targetType: "note",
    targetId: id,
    details: { ownerId: existing.userId, title: existing.title },
  });
}

/* ------------------------------ admin stats ------------------------------ */

export async function getAdminOverview(
  context: AppContext,
): Promise<AdminStats> {
  requireStaff(context);
  const weekAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  try {
    const [
      tutorTotal,
      tutorActive,
      tutorSuspended,
      adminTotal,
      noteTotal,
      notesThisWeek,
      recentNotes,
      recentActivity,
    ] = await Promise.all([
      context.scope.profiles.countByRole("tutor"),
      context.scope.profiles.countByRole("tutor", "active"),
      context.scope.profiles.countByRole("tutor", "suspended"),
      context.scope.profiles.countByRole("admin"),
      context.scope.notes.countAll(),
      context.scope.notes.countSince(weekAgo),
      context.scope.notes.recent(5),
      context.scope.audit.recent(8),
    ]);

    // One profile lookup for both note owners and audit actors.
    const ids = [
      ...recentNotes.map((note) => note.userId),
      ...recentActivity
        .map((entry) => entry.actor_id)
        .filter((id): id is string => Boolean(id)),
    ];
    const profiles = await context.scope.profiles.findByIds(ids);
    const byId = new Map(profiles.map((profile) => [profile.id, profile]));

    return {
      tutorTotal,
      tutorActive,
      tutorSuspended,
      adminTotal,
      noteTotal,
      notesThisWeek,
      recentNotes: recentNotes.map((note) =>
        toAdmin(note, byId.get(note.userId)),
      ),
      recentActivity: recentActivity.map((entry) => {
        const actor = entry.actor_id ? byId.get(entry.actor_id) : undefined;
        return {
          ...entry,
          actor: actor
            ? {
                id: actor.id,
                display_name: actor.display_name,
                email: actor.email,
              }
            : null,
        };
      }),
    };
  } catch (error) {
    throw fromPortError(error as never, "The overview could not be loaded.");
  }
}
