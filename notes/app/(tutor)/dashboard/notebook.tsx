"use client";

import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { EASE, Enter } from "@/components/motion";
import NoteContent from "@/app/note-content";
import NoteEditorForm from "@/components/note-editor-form";
import NoteOptionsMenu from "@/components/note-options-menu";
import {
  createNote,
  deleteNote,
  updateNote,
} from "@/app/(tutor)/actions";
import { getDocumentText } from "@/lib/note-document";
import type { DashboardNote } from "@/lib/types";

function DeleteNoteButton({
  noteId,
  title,
  onDeleted,
}: {
  noteId: string;
  title: string;
  onDeleted: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleDelete() {
    if (!window.confirm(`Delete “${title}”? This can’t be undone.`)) {
      return;
    }
    const formData = new FormData();
    formData.set("noteId", noteId);
    startTransition(async () => {
      const result = await deleteNote({}, formData);
      if (result.success) {
        onDeleted();
      } else {
        setError(result.error ?? "That note couldn’t be deleted.");
      }
    });
  }

  return (
    <span className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        aria-label={`Delete ${title}`}
        className="ui-button-secondary note-delete-button"
      >
        {isPending ? "Deleting…" : "Delete"}
      </button>
      {error && (
        <span role="alert" className="ui-text-error text-[11px]">
          {error}
        </span>
      )}
    </span>
  );
}

export default function DashboardNotebook({
  notes,
}: {
  notes: DashboardNote[];
}) {
  const router = useRouter();
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const reduce = useReducedMotion();
  const cardMotion = reduce
    ? { initial: false as const }
    : {
        layout: true,
        initial: { opacity: 0, y: 16, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, scale: 0.96, transition: { duration: 0.18 } },
        transition: { duration: 0.35, ease: EASE },
      };

  const refresh = useCallback(() => router.refresh(), [router]);
  const handleEdited = useCallback(() => {
    setEditingNoteId(null);
    router.refresh();
  }, [router]);

  const availableTags = [...new Set(notes.flatMap((note) => note.tags))].sort(
    (first, second) => first.localeCompare(second),
  );
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  const filteredNotes = notes.filter((note) => {
    if (activeTag && !note.tags.includes(activeTag)) {
      return false;
    }
    if (!normalizedQuery) {
      return true;
    }
    const titleMatches = note.title.toLocaleLowerCase().includes(normalizedQuery);
    const bodyMatches = getDocumentText(note.body)
      .toLocaleLowerCase()
      .includes(normalizedQuery);
    const tagQuery = normalizedQuery.replace(/^#+/, "");
    const tagMatches =
      tagQuery.length > 0 &&
      note.tags.some(
        (tag) =>
          tag.toLocaleLowerCase().includes(tagQuery) ||
          `#${tag.toLocaleLowerCase()}`.includes(normalizedQuery),
      );
    return titleMatches || bodyMatches || tagMatches;
  });

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] xl:gap-8">
      <section className="ui-surface-card rounded-[26px] border p-4 sm:p-6 lg:p-7">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 sm:mb-5">
          <div>
            <p className="ui-text-accent-soft text-xs font-semibold">A fresh page</p>
            <h2 className="ui-text-primary mt-1.5 font-serif text-xl font-medium tracking-[-0.02em]">
              Capture a thought
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="ui-surface-subtle hidden size-10 items-center justify-center rounded-2xl sm:flex">
              <svg viewBox="0 0 24 24" fill="none" className="ui-text-accent size-5" aria-hidden="true">
                <path d="m14.5 5.5 4 4M4 20l4.3-.9L19 8.4a2.1 2.1 0 0 0-3-3L5.3 16.1 4 20Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <NoteOptionsMenu />
          </div>
        </div>

        <NoteEditorForm
          action={createNote}
          idPrefix="note"
          submitLabel="Save note"
          pendingLabel="Saving your note…"
          onSuccess={refresh}
        />
      </section>

      <section aria-labelledby="notes-heading" className="min-w-0">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="ui-text-accent-soft text-xs font-semibold">Your collection</p>
            <h2 id="notes-heading" className="ui-text-primary mt-1 font-serif text-xl font-medium tracking-[-0.02em]">
              Recent notes
            </h2>
          </div>
          <span className="ui-status-pill rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm">
            {notes.length} {notes.length === 1 ? "note" : "notes"}
          </span>
        </div>

        <div className="notes-search-controls mb-4">
          <div className="notes-search-field">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="8.75" cy="8.75" r="5.75" stroke="currentColor" strokeWidth="1.5" />
              <path d="m13 13 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search your notes..."
              aria-label="Search your notes"
              className="ui-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="notes-search-clear"
              >
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
          <label className="notes-tag-filter">
            <span className="sr-only">Filter notes by tag</span>
            <select
              value={activeTag}
              onChange={(event) => setActiveTag(event.target.value)}
              aria-label="Filter notes by tag"
              className="ui-input"
            >
              <option value="">All tags</option>
              {availableTags.map((tag) => (
                <option key={tag} value={tag}>
                  #{tag}
                </option>
              ))}
            </select>
          </label>
        </div>

        {notes.length > 0 && (
          <p className="ui-text-muted mb-3 text-xs" role="status" aria-live="polite">
            {filteredNotes.length === notes.length && !normalizedQuery && !activeTag
              ? `${notes.length} ${notes.length === 1 ? "note" : "notes"}`
              : `${filteredNotes.length} of ${notes.length} notes`}
          </p>
        )}

        {filteredNotes.length > 0 ? (
          <div className="space-y-3">
            <AnimatePresence initial={false} mode="popLayout">
              {filteredNotes.map((note) => (
                <motion.article
                  key={note.id}
                  {...cardMotion}
                  className="ui-surface-card rounded-2xl border p-5 transition duration-200 hover:-translate-y-0.5 sm:p-6"
                >
                {editingNoteId === note.id ? (
                  <NoteEditorForm
                    action={updateNote}
                    note={note}
                    idPrefix={`edit-${note.id}`}
                    submitLabel="Save changes"
                    pendingLabel="Saving changes…"
                    successMessage="Changes saved."
                    onSuccess={handleEdited}
                    onCancel={() => setEditingNoteId(null)}
                  />
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="ui-text-primary min-w-0 break-words text-base font-semibold tracking-[-0.025em]">
                        <Link
                          href={`/notes/${note.id}`}
                          className="underline-offset-4 hover:underline"
                        >
                          {note.title}
                        </Link>
                      </h3>
                      <div className="note-card-actions">
                        <button
                          type="button"
                          onClick={() => setEditingNoteId(note.id)}
                          aria-label={`Edit ${note.title}`}
                          className="ui-button-secondary shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold"
                        >
                          Edit
                        </button>
                        <DeleteNoteButton
                          noteId={note.id}
                          title={note.title}
                          onDeleted={refresh}
                        />
                      </div>
                    </div>
                    <div className="mt-2">
                      <NoteContent document={note.body} />
                    </div>
                    {note.tags.length > 0 && (
                      <ul className="mt-4 flex flex-wrap gap-2" aria-label="Tags">
                        {note.tags.map((tag) => (
                          <li key={tag} className="ui-tag rounded-full px-2.5 py-1 text-[11px] font-medium">
                            {tag}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
                </motion.article>
              ))}
            </AnimatePresence>
          </div>
        ) : notes.length > 0 ? (
          <Enter className="ui-surface-panel flex min-h-[180px] flex-col items-center justify-center rounded-[24px] border px-6 py-10 text-center">
            <h3 className="ui-text-secondary text-sm font-semibold">
              No notes found. Try another search.
            </h3>
            <p className="ui-text-muted mt-2 max-w-xs text-xs leading-5">
              Adjust your search or tag filter to see more notes.
            </p>
          </Enter>
        ) : (
          <Enter className="ui-surface-panel flex min-h-[270px] flex-col items-center justify-center rounded-[24px] border border-dashed px-6 py-10 text-center">
            <span className="empty-float ui-surface-subtle mb-4 flex size-12 items-center justify-center rounded-2xl">
              <svg viewBox="0 0 24 24" fill="none" className="ui-text-accent size-6" aria-hidden="true">
                <path d="M7 3.8h7l5 5v10.4a1.8 1.8 0 0 1-1.8 1.8H7a2 2 0 0 1-2-2V5.8a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M14 4v5h5m-9 4h4m-4 3.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <h3 className="ui-text-secondary text-sm font-semibold">Your notes will find a home here</h3>
            <p className="ui-text-muted mt-2 max-w-xs text-xs leading-5">
              Write down your first thought and it&apos;ll be waiting for you in this space.
            </p>
          </Enter>
        )}
      </section>
    </div>
  );
}