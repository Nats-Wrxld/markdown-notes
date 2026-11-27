import "server-only";

import { redirect } from "next/navigation";
import { getServerContext } from "@/lib/domain/context";
import { AppError } from "@/lib/domain/errors";
import { getCurrentProfile } from "@/lib/domain/session";
import * as notes from "@/lib/domain/notes";
import * as admin from "@/lib/domain/admin";
import * as settings from "@/lib/domain/settings";
import type { AppContext } from "@/lib/ports";

/**
 * Server Components are already guarded by their layouts, but layouts stream
 * inside Suspense. Resolving the guard here too avoids a logged exception when
 * the page renders concurrently with the redirect.
 */
async function pageContext(): Promise<AppContext> {
  let context: AppContext;
  try {
    context = await getServerContext();
  } catch (error) {
    if (error instanceof AppError && error.code === "unauthenticated") {
      redirect("/login");
    }
    throw error;
  }
  if (context.profile.account_status === "suspended") {
    redirect("/suspended");
  }
  return context;
}

async function orNull<T>(run: () => Promise<T>): Promise<T | null> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof AppError && error.code === "not_found") return null;
    throw error;
  }
}

/**
 * In-process client for Server Components. It resolves the incoming session
 * once and calls the same domain services the route handlers use — no
 * self-HTTP hop and no cookie re-serialisation.
 */
export const serverApi = {
  profile: {
    current: getCurrentProfile,
  },
  notes: {
    listMine: async (options: {
      page: number;
      pageSize: number;
      q?: string;
      tag?: string;
    }) => notes.listMyNotes(await pageContext(), options),
    getMine: async (id: string) => notes.getMyNote(await pageContext(), id),
    findMine: async (id: string) =>
      orNull(async () => notes.getMyNote(await pageContext(), id)),
  },
  settings: {
    public: settings.getPublicSettings,
  },
  admin: {
    overview: async () => notes.getAdminOverview(await pageContext()),
    listTutors: async (options: {
      page: number;
      pageSize: number;
      q?: string;
      status?: string;
    }) => admin.listTutors(await pageContext(), options),
    getTutor: async (id: string) => admin.getTutor(await pageContext(), id),
    findTutor: async (id: string) =>
      orNull(async () => admin.getTutor(await pageContext(), id)),
    listTutorNotes: async (id: string, page: number, pageSize = 20) =>
      notes.listNotesForTutor(await pageContext(), id, page, pageSize),
    listNotes: async (options: {
      page: number;
      pageSize: number;
      q?: string;
      tutorId?: string;
    }) => notes.listNotesForAdmin(await pageContext(), options),
    getNote: async (id: string) =>
      notes.getNoteForAdmin(await pageContext(), id),
    findNote: async (id: string) =>
      orNull(async () => notes.getNoteForAdmin(await pageContext(), id)),
    listActivity: async (page: number, pageSize = 20) =>
      admin.listActivity(await pageContext(), page, pageSize),
    listAdmins: async () => admin.listAdmins(await pageContext()),
    tutorOptions: async () => admin.listTutorOptions(await pageContext()),
    settings: async () => settings.getAdminSettings(await pageContext()),
  },
};
