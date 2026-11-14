import "server-only";

import type { JSONContent } from "@tiptap/core";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { parseNoteBody } from "@/lib/note-document";
import type { DashboardNote, NoteRow } from "@/lib/types";

const EMPTY_DOCUMENT: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

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

export async function getMyNotes(): Promise<DashboardNote[]> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return (data as NoteRow[]).map(toDashboardNote);
}

export async function getMyNote(id: string): Promise<DashboardNote | null> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("id", id)
    .eq("user_id", profile.id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return toDashboardNote(data as NoteRow);
}

export function summarizeNotes(notes: DashboardNote[]): {
  total: number;
  thisWeek: number;
  tagCount: number;
} {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeek = notes.filter(
    (note) => new Date(note.createdAt).getTime() >= weekAgo,
  ).length;
  const tagCount = new Set(notes.flatMap((note) => note.tags)).size;
  return { total: notes.length, thisWeek, tagCount };
}