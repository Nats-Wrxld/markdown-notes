import type { JSONContent } from "@tiptap/core";
import { parseNoteBody } from "@/lib/note-document";
import type { AuditLog, Page, Profile } from "@/lib/types";
import type { PlatformSettings, StoredNote } from "@/lib/ports";
import type { AccountStatus, Role } from "@/lib/contracts/common";

/** Explicit column lists keep list queries narrow — no `select *`. */
export const PROFILE_COLUMNS =
  "id,email,display_name,avatar_url,role,account_status,created_at,updated_at";
export const NOTE_COLUMNS =
  "id,user_id,title,body,tags,created_at,updated_at";
export const NOTE_SUMMARY_COLUMNS = "created_at,tags";
export const AUDIT_COLUMNS =
  "id,actor_id,action,target_type,target_id,details,created_at";

export const EMPTY_DOCUMENT: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export type ProfileRow = {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  role: Role;
  account_status: AccountStatus;
  created_at: string;
  updated_at: string;
};

export type NoteRow = {
  id: string;
  user_id: string;
  title: string;
  body: unknown;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
};

export type AuditRow = {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

export function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    role: row.role,
    account_status: row.account_status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function toStoredNote(row: NoteRow): StoredNote {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    body: parseNoteBody(row.body) ?? EMPTY_DOCUMENT,
    tags: Array.isArray(row.tags) ? row.tags : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toAuditLog(row: AuditRow): AuditLog {
  return {
    id: row.id,
    actor_id: row.actor_id,
    action: row.action,
    target_type: row.target_type,
    target_id: row.target_id,
    details: row.details ?? {},
    created_at: row.created_at,
  };
}

export function toPage<T>(
  rows: T[],
  total: number,
  page: number,
  pageSize: number,
): Page<T> {
  return {
    rows,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Same defaults the app has always used for the two public settings rows. */
export function toPlatformSettings(
  rows: { key: string; value: unknown }[],
): PlatformSettings {
  const settings = new Map(rows.map((row) => [row.key, row.value]));
  return {
    allowPublicSignup: settings.get("allow_public_signup") !== false,
    platformNotice:
      typeof settings.get("platform_notice") === "string"
        ? (settings.get("platform_notice") as string)
        : "",
  };
}
