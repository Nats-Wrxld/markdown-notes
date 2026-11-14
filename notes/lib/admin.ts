import "server-only";

import { connection } from "next/server";
import type { JSONContent } from "@tiptap/core";
import { createClient } from "@/lib/supabase/server";
import { parseNoteBody } from "@/lib/note-document";
import type { AuditLog, DashboardNote, NoteRow, Profile } from "@/lib/types";

export const ADMIN_PAGE_SIZE = 20;

const EMPTY_DOCUMENT: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export type Page<T> = {
  rows: T[];
  total: number;
  page: number;
  pageCount: number;
};

export type NoteOwner = Pick<Profile, "id" | "display_name" | "email" | "avatar_url">;

export type AdminNote = DashboardNote & { owner: NoteOwner };

export type AuditEntry = AuditLog & {
  actor: Pick<Profile, "id" | "display_name" | "email"> | null;
};

export type TutorOption = Pick<Profile, "id" | "display_name" | "email">;

export type AdminStats = {
  tutorTotal: number;
  tutorActive: number;
  tutorSuspended: number;
  adminTotal: number;
  noteTotal: number;
  notesThisWeek: number;
  recentNotes: AdminNote[];
  recentActivity: AuditEntry[];
};

export function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function toDashboardNote(row: NoteRow): DashboardNote {
  return {
    id: row.id,
    title: row.title,
    body: parseNoteBody(row.body) ?? EMPTY_DOCUMENT,
    tags: Array.isArray(row.tags) ? row.tags : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function profilesByIds(ids: string[]): Promise<Map<string, Profile>> {
  if (ids.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .in("id", [...new Set(ids)]);
  return new Map(((data ?? []) as Profile[]).map((profile) => [profile.id, profile]));
}

function toAdminNote(row: NoteRow, owners: Map<string, Profile>): AdminNote {
  const owner = owners.get(row.user_id);
  return {
    ...toDashboardNote(row),
    owner: {
      id: row.user_id,
      display_name: owner?.display_name ?? "",
      email: owner?.email ?? "Unknown account",
      avatar_url: owner?.avatar_url ?? null,
    },
  };
}

function toAuditEntry(row: AuditLog, actors: Map<string, Profile>): AuditEntry {
  const actor = row.actor_id ? actors.get(row.actor_id) : undefined;
  return {
    ...row,
    actor: actor
      ? { id: actor.id, display_name: actor.display_name, email: actor.email }
      : null,
  };
}

// PostgREST `or` filters use commas/parens as syntax — strip them from
// user-supplied search text before embedding it in an ilike pattern.
function searchPattern(query: string): string {
  return query.trim().replace(/[,()%]/g, "");
}

export async function getAdminStats(): Promise<AdminStats> {
  const supabase = await createClient();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    tutorTotal,
    tutorActive,
    tutorSuspended,
    adminTotal,
    noteTotal,
    notesThisWeek,
    recentNotesResult,
    activityResult,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "tutor"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "tutor").eq("account_status", "active"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "tutor").eq("account_status", "suspended"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin"),
    supabase.from("notes").select("id", { count: "exact", head: true }),
    supabase.from("notes").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
    supabase.from("notes").select("*").order("created_at", { ascending: false }).limit(5),
    supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(8),
  ]);

  const recentRows = (recentNotesResult.data ?? []) as NoteRow[];
  const activityRows = (activityResult.data ?? []) as AuditLog[];

  const [noteOwners, actors] = await Promise.all([
    profilesByIds(recentRows.map((row) => row.user_id)),
    profilesByIds(activityRows.map((row) => row.actor_id).filter((id): id is string => Boolean(id))),
  ]);

  return {
    tutorTotal: tutorTotal.count ?? 0,
    tutorActive: tutorActive.count ?? 0,
    tutorSuspended: tutorSuspended.count ?? 0,
    adminTotal: adminTotal.count ?? 0,
    noteTotal: noteTotal.count ?? 0,
    notesThisWeek: notesThisWeek.count ?? 0,
    recentNotes: recentRows.map((row) => toAdminNote(row, noteOwners)),
    recentActivity: activityRows.map((row) => toAuditEntry(row, actors)),
  };
}

export async function listTutors(options: {
  page: number;
  query?: string;
  status?: string;
}): Promise<Page<Profile>> {
  const supabase = await createClient();
  let request = supabase
    .from("profiles")
    .select("*", { count: "exact" })
    .eq("role", "tutor");

  const pattern = searchPattern(options.query ?? "");
  if (pattern) {
    request = request.or(`display_name.ilike.%${pattern}%,email.ilike.%${pattern}%`);
  }
  if (options.status === "active" || options.status === "suspended") {
    request = request.eq("account_status", options.status);
  }

  const from = (options.page - 1) * ADMIN_PAGE_SIZE;
  const { data, count } = await request
    .order("created_at", { ascending: false })
    .range(from, from + ADMIN_PAGE_SIZE - 1);

  const total = count ?? 0;
  return {
    rows: (data ?? []) as Profile[],
    total,
    page: options.page,
    pageCount: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
  };
}

export async function getTutor(id: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .eq("role", "tutor")
    .maybeSingle();
  return (data as Profile | null) ?? null;
}

export async function listTutorNotes(
  tutorId: string,
  page: number,
): Promise<Page<DashboardNote>> {
  const supabase = await createClient();
  const from = (page - 1) * ADMIN_PAGE_SIZE;
  const { data, count } = await supabase
    .from("notes")
    .select("*", { count: "exact" })
    .eq("user_id", tutorId)
    .order("created_at", { ascending: false })
    .range(from, from + ADMIN_PAGE_SIZE - 1);

  const total = count ?? 0;
  return {
    rows: ((data ?? []) as NoteRow[]).map(toDashboardNote),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
  };
}

export async function listNotes(options: {
  page: number;
  query?: string;
  tutorId?: string;
}): Promise<Page<AdminNote>> {
  const supabase = await createClient();
  let request = supabase.from("notes").select("*", { count: "exact" });

  const pattern = searchPattern(options.query ?? "");
  if (pattern) {
    request = request.ilike("title", `%${pattern}%`);
  }
  if (options.tutorId) {
    request = request.eq("user_id", options.tutorId);
  }

  const from = (options.page - 1) * ADMIN_PAGE_SIZE;
  const { data, count } = await request
    .order("created_at", { ascending: false })
    .range(from, from + ADMIN_PAGE_SIZE - 1);

  const rows = (data ?? []) as NoteRow[];
  const owners = await profilesByIds(rows.map((row) => row.user_id));
  const total = count ?? 0;
  return {
    rows: rows.map((row) => toAdminNote(row, owners)),
    total,
    page: options.page,
    pageCount: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
  };
}

export async function getAdminNote(
  id: string,
): Promise<{ note: DashboardNote; owner: Profile } | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notes")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;

  const row = data as NoteRow;
  const { data: ownerData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", row.user_id)
    .maybeSingle();
  if (!ownerData) return null;

  return { note: toDashboardNote(row), owner: ownerData as Profile };
}

export async function listAuditLogs(page: number): Promise<Page<AuditEntry>> {
  const supabase = await createClient();
  const from = (page - 1) * ADMIN_PAGE_SIZE;
  const { data, count } = await supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + ADMIN_PAGE_SIZE - 1);

  const rows = (data ?? []) as AuditLog[];
  const actors = await profilesByIds(
    rows.map((row) => row.actor_id).filter((id): id is string => Boolean(id)),
  );
  const total = count ?? 0;
  return {
    rows: rows.map((row) => toAuditEntry(row, actors)),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
  };
}

export async function listAdmins(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "admin")
    .order("created_at", { ascending: false });
  return (data ?? []) as Profile[];
}

export async function getTutorOptions(): Promise<TutorOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, email")
    .eq("role", "tutor")
    .order("display_name")
    .limit(200);
  return (data ?? []) as TutorOption[];
}

export async function getPlatformSettings(): Promise<{
  allowPublicSignup: boolean;
  platformNotice: string;
}> {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase
    .from("platform_settings")
    .select("key, value")
    .in("key", ["allow_public_signup", "platform_notice"]);

  const settings = new Map(
    ((data ?? []) as { key: string; value: unknown }[]).map((row) => [row.key, row.value]),
  );
  return {
    allowPublicSignup: settings.get("allow_public_signup") !== false,
    platformNotice:
      typeof settings.get("platform_notice") === "string"
        ? (settings.get("platform_notice") as string)
        : "",
  };
}