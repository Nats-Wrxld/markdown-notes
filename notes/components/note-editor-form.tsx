"use client";

import {
  Suspense,
  useActionState,
  useCallback,
  useState,
} from "react";
import type { JSONContent } from "@tiptap/core";
import RichTextEditor from "@/app/rich-text-editor";
import type { NoteFormState } from "@/app/(tutor)/actions";
import type { DashboardNote } from "@/lib/types";

const EMPTY_DOCUMENT: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

type NoteEditorFormProps = {
  action: (
    previous: NoteFormState,
    formData: FormData,
  ) => Promise<NoteFormState>;
  note?: DashboardNote;
  idPrefix: string;
  submitLabel: string;
  pendingLabel: string;
  successMessage?: string;
  onSuccess?: (state: NoteFormState) => void;
  onCancel?: () => void;
};

export default function NoteEditorForm({
  action,
  note,
  idPrefix,
  submitLabel,
  pendingLabel,
  successMessage = "Note created — it’s in your space.",
  onSuccess,
  onCancel,
}: NoteEditorFormProps) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [body, setBody] = useState<JSONContent>(note?.body ?? EMPTY_DOCUMENT);
  const [tags, setTags] = useState(note?.tags.join(", ") ?? "");
  const [resetKey, setResetKey] = useState(0);
  const [dirty, setDirty] = useState(false);

  const [state, formAction, isPending] = useActionState(
    async (previous: NoteFormState, formData: FormData) => {
      const result = await action(previous, formData);
      if (result.success) {
        setDirty(false);
        if (!note) {
          setTitle("");
          setBody(EMPTY_DOCUMENT);
          setTags("");
          setResetKey((key) => key + 1);
        }
        onSuccess?.(result);
      }
      return result;
    },
    {},
  );

  const handleBodyChange = useCallback((content: JSONContent) => {
    setBody(content);
    setDirty(true);
  }, []);

  const titleError = state.fieldErrors?.title?.[0];
  const bodyError = state.fieldErrors?.body?.[0];
  const tagsError = state.fieldErrors?.tags?.[0];
  const titleId = `${idPrefix}-title`;
  const bodyId = `${idPrefix}-body`;
  const tagsId = `${idPrefix}-tags`;

  return (
    <form action={formAction} className="space-y-5">
      {note && <input type="hidden" name="noteId" value={note.id} />}

      <div>
        <label
          htmlFor={titleId}
          className="ui-text-secondary mb-2 block text-[13px] font-semibold"
        >
          Title
        </label>
        <input
          id={titleId}
          name="title"
          type="text"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setDirty(true);
          }}
          placeholder="Give your note a name"
          aria-invalid={Boolean(titleError)}
          aria-describedby={titleError ? `${titleId}-error` : undefined}
          className="ui-input w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:ring-4 aria-[invalid=true]:border-[#d88d83]"
        />
        {titleError && (
          <p id={`${titleId}-error`} role="alert" className="ui-text-error mt-2 text-xs font-medium">
            {titleError}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor={bodyId}
          className="ui-text-secondary mb-2 block text-[13px] font-semibold"
        >
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
            editorId={bodyId}
            initialContent={note?.body ?? EMPTY_DOCUMENT}
            onChange={handleBodyChange}
            resetKey={resetKey}
            disabled={isPending}
            invalid={Boolean(bodyError)}
          />
        </Suspense>
        {bodyError && (
          <p role="alert" className="ui-text-error mt-2 text-xs font-medium">
            {bodyError}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor={tagsId}
          className="ui-text-secondary mb-2 block text-[13px] font-semibold"
        >
          Tags <span className="ui-text-muted ml-1.5 font-normal">Optional</span>
        </label>
        <input
          id={tagsId}
          name="tags"
          type="text"
          value={tags}
          onChange={(event) => {
            setTags(event.target.value);
            setDirty(true);
          }}
          placeholder="ideas, work, inspiration"
          aria-invalid={Boolean(tagsError)}
          aria-describedby={tagsError ? `${tagsId}-error` : undefined}
          className="ui-input w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:ring-4"
        />
        {tagsError ? (
          <p id={`${tagsId}-error`} role="alert" className="ui-text-error mt-2 text-xs font-medium">
            {tagsError}
          </p>
        ) : (
          <p className="ui-text-muted mt-2 text-xs">Separate each tag with a comma.</p>
        )}
      </div>

      {state.success && !dirty && (
        <p role="status" className="ui-status-success rounded-xl border px-4 py-3 text-sm">
          {successMessage}
        </p>
      )}

      {state.error && (
        <p role="alert" className="ui-status-error rounded-xl border px-4 py-3 text-sm">
          {state.error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="ui-button ui-button-secondary"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="ui-button ui-button-primary w-full sm:w-auto"
        >
          {isPending ? pendingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}