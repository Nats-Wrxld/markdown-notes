"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import NoteEditorForm from "@/components/note-editor-form";
import { adminDeleteNote, adminUpdateNote } from "@/lib/api-client/admin";
import type { DashboardNote } from "@/lib/types";

export default function NoteOversight({ note }: { note: DashboardNote }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    const confirmed = window.confirm(
      `Delete “${note.title}” permanently? This removes the tutor’s note and can’t be undone.`,
    );
    if (!confirmed) return;

    const formData = new FormData();
    formData.set("noteId", note.id);
    startTransition(async () => {
      const result = await adminDeleteNote({}, formData);
      if (result.success) {
        router.push("/admin/notes");
        router.refresh();
      } else {
        setMessage(result.error ?? "Delete failed.");
      }
    });
  }

  if (editing) {
    return (
      <div className="ui-surface-panel rounded-[24px] border p-7 sm:p-8">
        <h2 className="ui-text-primary mb-6 font-serif text-xl font-medium">Edit note</h2>
        <NoteEditorForm
          action={adminUpdateNote}
          note={note}
          idPrefix="admin-note"
          submitLabel="Save changes"
          pendingLabel="Saving…"
          successMessage="Note updated."
          onSuccess={() => {
            setEditing(false);
            router.refresh();
          }}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="ui-button ui-button-secondary"
      >
        Edit note
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="ui-button ui-button-danger"
      >
        {isPending ? "Deleting…" : "Delete note"}
      </button>
      {message && (
        <p role="alert" className="ui-text-error w-full text-xs font-medium">
          {message}
        </p>
      )}
    </div>
  );
}