"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { EASE, Enter } from "@/components/motion";
import NoteContent from "@/app/note-content";
import NoteEditorForm from "@/components/note-editor-form";
import { deleteNote, updateNote } from "@/lib/api-client/notes";
import type { DashboardNote } from "@/lib/types";

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default function NoteDetail({ note }: { note: DashboardNote }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const reduce = useReducedMotion();
  const modeMotion = reduce
    ? { initial: false as const }
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -10, transition: { duration: 0.15 } },
        transition: { duration: 0.25, ease: EASE },
      };

  function handleEdited() {
    setIsEditing(false);
    router.refresh();
  }

  function handleDelete() {
    if (!window.confirm(`Delete “${note.title}”? This can’t be undone.`)) {
      return;
    }
    const formData = new FormData();
    formData.set("noteId", note.id);
    startTransition(async () => {
      const result = await deleteNote({}, formData);
      if (result.success) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setError(result.error ?? "That note couldn’t be deleted.");
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Link
        href="/dashboard"
        className="ui-text-accent mb-6 inline-flex items-center gap-2 text-sm font-semibold underline-offset-4 hover:underline"
      >
        <svg viewBox="0 0 20 20" fill="none" className="size-4" aria-hidden="true">
          <path d="M15.8 10H4.2m4.6-4.6L4.2 10l4.6 4.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to notebook
      </Link>

      <Enter>
      <article className="ui-surface-panel ui-shadow-panel rounded-[26px] border p-6 sm:p-9">
        <AnimatePresence mode="wait" initial={false}>
        {isEditing ? (
          <motion.div key="edit" {...modeMotion}>
            <p className="ui-text-accent-soft mb-5 text-xs font-semibold">Editing note</p>
            <NoteEditorForm
              action={updateNote}
              note={note}
              idPrefix={`detail-${note.id}`}
              submitLabel="Save changes"
              pendingLabel="Saving changes…"
              successMessage="Changes saved."
              onSuccess={handleEdited}
              onCancel={() => setIsEditing(false)}
            />
          </motion.div>
        ) : (
          <motion.div key="view" {...modeMotion}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <h1 className="ui-text-primary min-w-0 break-words font-serif text-3xl font-medium tracking-[-0.02em]">
                {note.title}
              </h1>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="ui-button ui-button-secondary"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isPending}
                  className="ui-button ui-button-danger"
                >
                  {isPending ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>

            <p className="ui-text-muted mt-3 text-xs">
              Created {dateFormatter.format(new Date(note.createdAt))}
              {note.updatedAt !== note.createdAt && (
                <> · Updated {dateFormatter.format(new Date(note.updatedAt))}</>
              )}
            </p>

            {error && (
              <p role="alert" className="ui-status-error mt-4 rounded-xl border px-4 py-3 text-sm">
                {error}
              </p>
            )}

            <div className="mt-6">
              <NoteContent document={note.body} />
            </div>

            {note.tags.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-2" aria-label="Tags">
                {note.tags.map((tag) => (
                  <li key={tag} className="ui-tag rounded-full px-2.5 py-1 text-[11px] font-medium">
                    {tag}
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
        </AnimatePresence>
      </article>
      </Enter>
    </div>
  );
}