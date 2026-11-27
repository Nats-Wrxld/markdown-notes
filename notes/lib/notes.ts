import type { DashboardNote } from "@/lib/types";

/** Pure dashboard statistic helper. No data access lives here any more. */
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
