"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importLocalNotes } from "@/app/(tutor)/actions";
import { IMPORT_FLAG_KEY, loadNotes, type SavedNote } from "@/app/note-storage";

export default function ImportNotesBanner({
  serverNoteCount,
}: {
  serverNoteCount: number;
}) {
  const router = useRouter();
  const [localNotes, setLocalNotes] = useState<SavedNote[]>([]);
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (serverNoteCount > 0) {
        setReady(true);
        return;
      }
      try {
        if (window.localStorage.getItem(IMPORT_FLAG_KEY) === "1") {
          setReady(true);
          return;
        }
      } catch {
        // Storage unavailable — nothing to import.
      }
      const result = loadNotes();
      setLocalNotes(result.notes);
      setReady(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [serverNoteCount]);

  if (!ready || dismissed || serverNoteCount > 0 || localNotes.length === 0) {
    return null;
  }

  function handleImport() {
    const payload = localNotes.map(({ title, body, tags }) => ({
      title,
      body,
      tags,
    }));
    const formData = new FormData();
    formData.set("notes", JSON.stringify(payload));
    startTransition(async () => {
      const result = await importLocalNotes({}, formData);
      if (result.success) {
        try {
          window.localStorage.setItem(IMPORT_FLAG_KEY, "1");
        } catch {
          // Import succeeded; the flag is only a convenience.
        }
        setDismissed(true);
        router.refresh();
      } else {
        setMessage(result.error ?? "Your notes couldn’t be imported.");
      }
    });
  }

  return (
    <div className="ui-alert-info mb-8 rounded-[20px] border px-5 py-4 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">
            Bring your old notes with you
          </p>
          <p className="mt-1 text-xs leading-5 opacity-90">
            We found {localNotes.length}{" "}
            {localNotes.length === 1 ? "note" : "notes"} saved in this browser
            from before UrSpace had accounts. Import them into your space?
          </p>
          {message && (
            <p role="alert" className="ui-text-error mt-2 text-xs font-medium">
              {message}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setDismissed(true)}
            disabled={isPending}
            className="ui-button ui-button-ghost"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={isPending}
            className="ui-button ui-button-primary"
          >
            {isPending ? "Importing…" : `Import ${localNotes.length}`}
          </button>
        </div>
      </div>
    </div>
  );
}