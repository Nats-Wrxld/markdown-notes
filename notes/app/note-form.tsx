"use client";

import {
  Suspense,
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import type { JSONContent } from "@tiptap/core";
import { checkNote, type Note, type NoteActionResult } from "./actions";
import NoteContent from "./note-content";
import {
  getNoteBodyText,
  loadNotes,
  persistNotes,
  type SavedNote,
} from "./note-storage";
import RichTextEditor from "./rich-text-editor";

const EMPTY_DOCUMENT: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

type EditingNoteFormProps = {
  note: SavedNote;
  onSave: (note: Note) => void;
  onCancel: () => void;
};

function EditingNoteForm({ note, onSave, onCancel }: EditingNoteFormProps) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [tags, setTags] = useState(note.tags.join(", "));
  const [result, setResult] = useState<NoteActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDirty, setIsDirty] = useState(false);
  const handleBodyChange = useCallback((content: JSONContent) => {
    setBody(content);
    setIsDirty(true);
    setResult(null);
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const actionResult = await checkNote(formData);
      setResult(actionResult);
      if (actionResult.success) {
        onSave(actionResult.note);
      }
    });
  }

  const missingFields = result?.success === false ? result.missingFields : [];
  const titleId = `edit-title-${note.id}`;
  const bodyId = `edit-body-${note.id}`;
  const tagsId = `edit-tags-${note.id}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="ui-text-accent-soft text-xs font-semibold text-[#a56849]">Editing note</p>
          <h3 className="ui-text-primary mt-1 text-lg font-semibold tracking-[-0.03em] text-[#40362f]">
            Update your thought
          </h3>
        </div>
        {isDirty && <span className="ui-text-muted text-xs text-[#8e7563]">Unsaved changes</span>}
      </div>

      <div>
        <label htmlFor={titleId} className="ui-text-secondary mb-2 block text-[13px] font-semibold text-[#51463e]">
          Title
        </label>
        <input
          id={titleId}
          name="title"
          type="text"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setIsDirty(true);
            setResult(null);
          }}
          aria-invalid={missingFields.includes("title")}
          aria-describedby={missingFields.includes("title") ? "edit-note-error" : undefined}
          className="ui-input w-full rounded-xl border border-[#e9e1d9] bg-[#fffefd] px-4 py-3 text-sm text-[#40362f] outline-none transition placeholder:text-[#a39a92] focus:border-[#c98b69] focus:ring-4 focus:ring-[#c98b69]/15 aria-[invalid=true]:border-[#d88d83]"
        />
      </div>

      <div>
        <label htmlFor={bodyId} className="ui-text-secondary mb-2 block text-[13px] font-semibold text-[#51463e]">
          Note
        </label>
        <input type="hidden" name="body" value={JSON.stringify(body)} />
        <Suspense
          fallback={
            <div className="note-editor-shell">
              <div className="note-editor-loading">Preparing your writing space…</div>
            </div>
          }
        >
          <RichTextEditor
            key={note.id}
            editorId={bodyId}
            initialContent={note.body}
            onChange={handleBodyChange}
            resetKey={0}
            disabled={isPending}
            invalid={missingFields.includes("body")}
          />
        </Suspense>
      </div>

      <div>
        <label htmlFor={tagsId} className="ui-text-secondary mb-2 block text-[13px] font-semibold text-[#51463e]">
          Tags <span className="ui-text-muted ml-1.5 font-normal text-[#92877f]">Optional</span>
        </label>
        <input
          id={tagsId}
          name="tags"
          type="text"
          value={tags}
          onChange={(event) => {
            setTags(event.target.value);
            setIsDirty(true);
            setResult(null);
          }}
          placeholder="ideas, work, inspiration"
          className="ui-input w-full rounded-xl border border-[#e9e1d9] bg-[#fffefd] px-4 py-3 text-sm text-[#40362f] outline-none transition placeholder:text-[#a39a92] focus:border-[#c98b69] focus:ring-4 focus:ring-[#c98b69]/15"
        />
        <p className="ui-text-muted mt-2 text-xs text-[#92877f]">Separate each tag with a comma.</p>
      </div>

      {result?.success === false && (
        <p id="edit-note-error" role="alert" className="ui-status-error rounded-xl border border-[#efd8d0] bg-[#fff8f4] px-4 py-3 text-sm text-[#985744]">
          {result.error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-[#eee7df] pt-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="ui-button-secondary rounded-xl border border-[#e9e1d9] bg-white px-4 py-2.5 text-sm font-semibold text-[#66584f] transition hover:bg-[#fcf8f3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a96849] disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="ui-button-primary rounded-xl bg-[#b87553] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#a96849] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a96849] disabled:cursor-wait disabled:opacity-60"
        >
          {isPending ? "Saving changes…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

export default function NoteForm() {
  const [notes, setNotes] = useState<SavedNote[]>([]);
  const notesRef = useRef<SavedNote[]>([]);
  const [isNotesLoaded, setIsNotesLoaded] = useState(false);
  const [storageMessage, setStorageMessage] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [savedNoteId, setSavedNoteId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState<JSONContent>(EMPTY_DOCUMENT);
  const [tags, setTags] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [editorResetKey, setEditorResetKey] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const result = loadNotes();
      notesRef.current = result.notes;
      setNotes(result.notes);
      setStorageMessage(result.error ?? "");
      setIsNotesLoaded(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  function commitNotes(nextNotes: SavedNote[]) {
    notesRef.current = nextNotes;
    setNotes(nextNotes);

    try {
      persistNotes(nextNotes);
      setStorageMessage("");
    } catch {
      setStorageMessage(
        "Your changes are visible for now, but couldn’t be saved in this browser. Check storage permissions.",
      );
    }
  }

  const handleBodyChange = useCallback((content: JSONContent) => {
    setShowFeedback(false);
    setBody(content);
  }, []);

  const [result, formAction, isPending] = useActionState(
    async (
      _previousResult: NoteActionResult | null,
      formData: FormData,
    ): Promise<NoteActionResult> => {
      const actionResult = await checkNote(formData);
      setShowFeedback(true);

      if (actionResult.success) {
        const now = new Date().toISOString();
        commitNotes([
          ...notesRef.current,
          {
            ...actionResult.note,
            id: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now,
          },
        ]);
        setTitle("");
        setBody(EMPTY_DOCUMENT);
        setTags("");
        setEditorResetKey((currentKey) => currentKey + 1);
        formRef.current?.reset();
      }

      return actionResult;
    },
    null,
  );

  const visibleResult = showFeedback ? result : null;
  const missingFields =
    visibleResult?.success === false ? visibleResult.missingFields : [];

  function clearFeedback() {
    setShowFeedback(false);
  }

  function saveEditedNote(noteId: string, updates: Note) {
    const now = new Date().toISOString();
    commitNotes(
      notesRef.current.map((note) =>
        note.id === noteId ? { ...note, ...updates, updatedAt: now } : note,
      ),
    );
    setEditingNoteId(null);
    setSavedNoteId(noteId);
  }

  function deleteNote(noteId: string) {
    commitNotes(notesRef.current.filter((note) => note.id !== noteId));
    if (editingNoteId === noteId) setEditingNoteId(null);
    if (savedNoteId === noteId) setSavedNoteId(null);
  }

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

    const titleMatches = note.title
      .toLocaleLowerCase()
      .includes(normalizedQuery);
    const bodyMatches = getNoteBodyText(note.body)
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
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:gap-10">
      <section className="ui-surface-panel rounded-[26px] border border-white/90 bg-white/90 p-5 shadow-[0_18px_60px_rgba(65,55,104,0.08)] backdrop-blur-xl sm:p-8">
        <div className="mb-7 flex items-start justify-between gap-4">
          <div>
            <p className="ui-text-accent-soft text-xs font-semibold text-[#a56849]">A fresh page</p>
            <h2 className="ui-text-primary mt-1.5 text-xl font-semibold tracking-[-0.04em] text-[#40362f]">
              Capture a thought
            </h2>
          </div>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#f8ece2] text-[#b87553]">
            <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
              <path d="m14.5 5.5 4 4M4 20l4.3-.9L19 8.4a2.1 2.1 0 0 0-3-3L5.3 16.1 4 20Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>

        <form ref={formRef} action={formAction} className="space-y-5">
          <div>
            <label htmlFor="note-title" className="ui-text-secondary mb-2 block text-[13px] font-semibold text-[#51463e]">
              Title
            </label>
            <input
              id="note-title"
              name="title"
              type="text"
              value={title}
              onChange={(event) => {
                clearFeedback();
                setTitle(event.target.value);
              }}
              placeholder="Give your note a name"
              aria-invalid={missingFields.includes("title")}
              aria-describedby={missingFields.includes("title") ? "note-error" : undefined}
              className="ui-input w-full rounded-xl border border-[#e9e1d9] bg-[#fffefd] px-4 py-3 text-sm text-[#40362f] outline-none transition placeholder:text-[#a39a92] focus:border-[#c98b69] focus:ring-4 focus:ring-[#c98b69]/15 aria-[invalid=true]:border-[#d88d83]"
            />
          </div>

          <div>
            <label htmlFor="note-body" className="ui-text-secondary mb-2 block text-[13px] font-semibold text-[#51463e]">
              Note
            </label>
            <input
              name="body"
              type="hidden"
              value={JSON.stringify(body)}
            />
            <Suspense
              fallback={
                <div className="note-editor-shell">
                  <div className="note-editor-loading">Preparing your writing space…</div>
                </div>
              }
            >
              <RichTextEditor
                editorId="note-body"
                onChange={handleBodyChange}
                resetKey={editorResetKey}
                disabled={isPending}
                invalid={missingFields.includes("body")}
              />
            </Suspense>
            {missingFields.includes("body") && (
              <span id="note-body-error" className="sr-only">
                {visibleResult?.success === false ? visibleResult.error : ""}
              </span>
            )}
          </div>

          <div>
            <label htmlFor="note-tags" className="ui-text-secondary mb-2 block text-[13px] font-semibold text-[#51463e]">
              Tags
              <span className="ui-text-muted ml-1.5 font-normal text-[#92877f]">Optional</span>
            </label>
            <div className="relative">
              <svg viewBox="0 0 20 20" fill="none" className="ui-text-muted pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#9a8f87]" aria-hidden="true">
                <path d="M10.8 3.3H5.4a2 2 0 0 0-2 2v5.4l6.9 6.9 6.5-6.5-6-6.1ZM6.5 6.6h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <input
                id="note-tags"
                name="tags"
                type="text"
                value={tags}
                onChange={(event) => {
                  clearFeedback();
                  setTags(event.target.value);
                }}
                placeholder="ideas, work, inspiration"
                className="ui-input w-full rounded-xl border border-[#e9e1d9] bg-[#fffefd] py-3 pl-10 pr-4 text-sm text-[#40362f] outline-none transition placeholder:text-[#a39a92] focus:border-[#c98b69] focus:ring-4 focus:ring-[#c98b69]/15"
              />
            </div>
            <p className="ui-text-muted mt-2 text-xs text-[#92877f]">Separate each tag with a comma.</p>
          </div>

          {visibleResult?.success && (
            <p role="status" className="ui-status-success rounded-xl border border-[#dce9dd] bg-[#f4f8f2] px-4 py-3 text-sm text-[#4c7053]">
              Note created — it&apos;s in your space.
            </p>
          )}

          {visibleResult?.success === false && (
            <p id="note-error" role="alert" className="ui-status-error rounded-xl border border-[#efd8d0] bg-[#fff8f4] px-4 py-3 text-sm text-[#985744]">
              {visibleResult.error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending || !isNotesLoaded}
            className="ui-button-primary group flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#b87553] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_7px_18px_rgba(158,98,68,0.18)] transition hover:bg-[#a96849] hover:shadow-[0_9px_22px_rgba(158,98,68,0.24)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a96849] disabled:cursor-wait disabled:opacity-70"
          >
            {isPending ? "Saving your note..." : !isNotesLoaded ? "Loading notes..." : "Save note"}
            {!isPending && (
              <svg viewBox="0 0 20 20" fill="none" className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true">
                <path d="M4.2 10h11.6m-4.6-4.6 4.6 4.6-4.6 4.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </form>
      </section>

      <section aria-labelledby="notes-heading" className="pt-1 lg:pt-2">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="ui-text-accent-soft text-xs font-semibold text-[#a56849]">Your collection</p>
            <h2 id="notes-heading" className="ui-text-primary mt-1 text-xl font-semibold tracking-[-0.04em] text-[#40362f]">
              Recent notes
            </h2>
          </div>
          <span className="ui-status-pill rounded-full border border-white/90 bg-white/75 px-3 py-1.5 text-xs font-medium text-[#786d65] shadow-sm">
            {notes.length} {notes.length === 1 ? "note" : "notes"}
          </span>
        </div>

        {storageMessage && (
          <p role="status" className="ui-status-error mb-4 rounded-xl border px-4 py-3 text-sm">
            {storageMessage}
          </p>
        )}

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

        {isNotesLoaded && notes.length > 0 && (
          <p className="ui-text-muted mb-3 text-xs" role="status" aria-live="polite">
            {filteredNotes.length === notes.length && !normalizedQuery && !activeTag
              ? `${notes.length} ${notes.length === 1 ? "note" : "notes"}`
              : `${filteredNotes.length} of ${notes.length} notes`}
          </p>
        )}

        {isNotesLoaded && filteredNotes.length > 0 ? (
          <div className="space-y-3">
            {filteredNotes.map((note) => (
              <article
                key={note.id}
                className="ui-surface-panel rounded-2xl border border-white/90 bg-white/85 p-5 shadow-[0_12px_36px_rgba(65,55,104,0.06)] backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(65,55,104,0.1)] sm:p-6"
              >
                {editingNoteId === note.id ? (
                  <EditingNoteForm
                    note={note}
                    onSave={(updates) => saveEditedNote(note.id, updates)}
                    onCancel={() => setEditingNoteId(null)}
                  />
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="ui-text-primary min-w-0 break-words text-base font-semibold tracking-[-0.025em] text-[#40362f]">
                        {note.title}
                      </h3>
                      <div className="note-card-actions">
                        <button
                          type="button"
                          onClick={() => {
                            setSavedNoteId(null);
                            setEditingNoteId(note.id);
                          }}
                          aria-label={`Edit ${note.title}`}
                          className="ui-button-secondary shrink-0 rounded-lg border border-[#eadfd5] bg-white/80 px-3 py-1.5 text-xs font-semibold text-[#8d563a] transition hover:border-[#d8b69e] hover:bg-[#fcf5ee] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a96849]"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteNote(note.id)}
                          aria-label={`Delete ${note.title}`}
                          className="ui-button-secondary note-delete-button"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {savedNoteId === note.id && (
                      <p role="status" className="ui-text-success mt-2 text-xs font-medium text-[#4c7053]">
                        Changes saved.
                      </p>
                    )}
                    <div className="mt-2">
                      <NoteContent document={note.body} />
                    </div>
                    {note.tags.length > 0 && (
                      <ul className="mt-4 flex flex-wrap gap-2" aria-label="Tags">
                        {note.tags.map((tag) => (
                          <li key={tag} className="ui-tag rounded-full bg-[#f6ece2] px-2.5 py-1 text-[11px] font-medium text-[#8a6048]">
                            {tag}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </article>
            ))}
          </div>
        ) : !isNotesLoaded ? (
          <div className="ui-surface-panel flex min-h-[180px] items-center justify-center rounded-[24px] border px-6 py-10 text-center">
            <p className="ui-text-muted text-sm" role="status">
              Restoring your notes…
            </p>
          </div>
        ) : notes.length > 0 ? (
          <div className="ui-surface-panel flex min-h-[180px] flex-col items-center justify-center rounded-[24px] border px-6 py-10 text-center">
            <h3 className="ui-text-secondary text-sm font-semibold">
              No notes found. Try another search.
            </h3>
            <p className="ui-text-muted mt-2 max-w-xs text-xs leading-5">
              Adjust your search or tag filter to see more notes.
            </p>
          </div>
        ) : (
          <div className="ui-surface-panel flex min-h-[270px] flex-col items-center justify-center rounded-[24px] border border-dashed border-[#e4d7ca] bg-white/45 px-6 py-10 text-center">
            <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-[#f8ece2] text-[#b87553]">
              <svg viewBox="0 0 24 24" fill="none" className="size-6" aria-hidden="true">
                <path d="M7 3.8h7l5 5v10.4a1.8 1.8 0 0 1-1.8 1.8H7a2 2 0 0 1-2-2V5.8a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M14 4v5h5m-9 4h4m-4 3.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <h3 className="ui-text-secondary text-sm font-semibold text-[#51463e]">Your notes will find a home here</h3>
            <p className="ui-text-muted mt-2 max-w-xs text-xs leading-5 text-[#8e837b]">
              Write down your first thought and it&apos;ll be waiting for you in this space.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
