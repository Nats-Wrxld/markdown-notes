"use client";

import { useCallback, useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import type { JSONContent } from "@tiptap/core";
import { safeLinkHref } from "@/lib/note-document";
import { NoteEditorBackdrop, useNoteEditorWallpaper } from "@/app/background-settings";

const EMPTY_DOCUMENT: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

type RichTextEditorProps = {
  onChange: (content: JSONContent) => void;
  resetKey: number;
  initialContent?: JSONContent;
  editorId?: string;
  disabled?: boolean;
  invalid?: boolean;
};

type ToolbarButtonProps = {
  label: string;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
  onClick: () => void;
  onMouseDown: (event: MouseEvent<HTMLButtonElement>) => void;
};

function ToolbarButton({
  label,
  active = false,
  disabled = false,
  children,
  onClick,
  onMouseDown,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={onMouseDown}
      onClick={onClick}
      className="editor-tool"
    >
      {children}
    </button>
  );
}

function ToolIcon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    bold: <><path d="M7 5h6a3 3 0 0 1 0 6H7z" /><path d="M7 11h7a3 3 0 0 1 0 6H7z" /></>,
    italic: <><path d="M14 4h-5" /><path d="M15 20h-5" /><path d="m14 4-5 16" /></>,
    underline: <><path d="M6 4v6a6 6 0 0 0 12 0V4" /><path d="M4 20h16" /></>,
    strike: <><path d="M5 5.5C6.5 3.8 9 3 12 3c3.5 0 6 1.4 6 4" /><path d="M4 12h16" /><path d="M18 16c-.8 2-3.2 3-6 3-3.2 0-5.8-1-6.5-3" /></>,
    paragraph: <><path d="M13 19V5H9a4 4 0 0 0 0 8h4" /><path d="M17 5v14" /></>,
    bullet: <><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" /></>,
    ordered: <><path d="M10 6h10M10 12h10M10 18h10" /><path d="M4 5h1v3M4 8h2M4 11h2l-2 2h2M4 17c0-1 2-1 2 0s-2 1-2 2h2" /></>,
    checklist: <><path d="m3 6 1.5 1.5L7 5" /><path d="M10 6h10M10 12h10M10 18h10" /><rect x="3" y="10" width="4" height="4" rx="1" /><rect x="3" y="16" width="4" height="4" rx="1" /></>,
    undo: <><path d="M9 14 4 9l5-5" /><path d="M4 9h9a6 6 0 0 1 0 12h-2" /></>,
    redo: <><path d="m15 14 5-5-5-5" /><path d="M20 9h-9a6 6 0 0 0 0 12h2" /></>,
    clear: <><path d="M4 7h16M10 11v6M14 11v6" /><path d="m6 7 1 13h10l1-13M9 7V4h6v3" /></>,
    link: <><path d="M9.5 14.5 14.5 9.5" /><path d="M11 6.5 12.8 4.7a3.5 3.5 0 0 1 5 5L16 11.5" /><path d="M13 17.5 11.2 19.3a3.5 3.5 0 0 1-5-5L8 12.5" /></>,
  };

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

export default function RichTextEditor({
  onChange,
  resetKey,
  initialContent = EMPTY_DOCUMENT,
  editorId = "note-body",
  disabled = false,
  invalid = false,
}: RichTextEditorProps) {
  const { wallpaper } = useNoteEditorWallpaper();

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          link: {
            openOnClick: false,
            autolink: true,
            protocols: ["http", "https", "mailto"],
            HTMLAttributes: {
              rel: "noopener noreferrer nofollow",
              target: "_blank",
            },
          },
        }),
        TaskList,
        TaskItem.configure({ nested: true }),
      ],
      content: initialContent,
      immediatelyRender: false,
      editable: !disabled,
      editorProps: {
        attributes: {
          id: editorId,
          class: "note-editor-content",
          "aria-multiline": "true",
          "data-placeholder": "Write something worth remembering…",
        },
      },
      onUpdate: ({ editor: currentEditor, transaction }) => {
        // Sync only on real document changes; editable toggles emit updates without changing the doc and would re-mark the form dirty.
        if (transaction.docChanged) onChange(currentEditor.getJSON());
      },
    },
    [onChange],
  );

  const state = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      if (!currentEditor) {
        return null;
      }

      return {
        bold: currentEditor.isActive("bold"),
        italic: currentEditor.isActive("italic"),
        underline: currentEditor.isActive("underline"),
        strike: currentEditor.isActive("strike"),
        link: currentEditor.isActive("link"),
        paragraph: currentEditor.isActive("paragraph"),
        heading1: currentEditor.isActive("heading", { level: 1 }),
        heading2: currentEditor.isActive("heading", { level: 2 }),
        heading3: currentEditor.isActive("heading", { level: 3 }),
        bulletList: currentEditor.isActive("bulletList"),
        orderedList: currentEditor.isActive("orderedList"),
        taskList: currentEditor.isActive("taskList"),
        canUndo: currentEditor.can().undo(),
        canRedo: currentEditor.can().redo(),
      };
    },
  });

  const handleMouseDown = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
    },
    [],
  );

  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState("");

  function openLinkEditor() {
    if (!editor) return;
    const current = editor.getAttributes("link").href;
    setLinkUrl(typeof current === "string" ? current : "");
    setLinkError("");
    setLinkOpen((open) => !open);
  }

  function applyLink() {
    if (!editor) return;
    const href = safeLinkHref(linkUrl.trim());
    if (!href) {
      setLinkError("Enter a valid link starting with http://, https://, or mailto:.");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setLinkOpen(false);
    setLinkError("");
  }

  function removeLink() {
    if (!editor) return;
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkUrl("");
    setLinkOpen(false);
    setLinkError("");
  }

  useEffect(() => {
    if (editor && resetKey > 0) {
      // emitUpdate=false: the form resets body state itself; emitting would re-mark it dirty and hide the save confirmation.
      editor.commands.clearContent(false);
    }
  }, [editor, resetKey]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.view.dom.setAttribute("aria-invalid", String(invalid));
    if (invalid) {
      editor.view.dom.setAttribute("aria-describedby", "note-error");
    } else {
      editor.view.dom.removeAttribute("aria-describedby");
    }
  }, [editor, invalid]);

  if (!editor || !state) {
    return (
      <div className="note-editor-shell" aria-label="Note editor loading">
        <div className="note-editor-loading">Preparing your writing space…</div>
      </div>
    );
  }

  return (
    <div
      className={`note-editor-shell ${invalid ? "note-editor-invalid" : ""}`}
      data-wallpaper={wallpaper ? "true" : undefined}
    >
      <NoteEditorBackdrop />
      <div className="note-editor-toolbar" role="toolbar" aria-label="Text formatting">
        <div className="editor-tool-group" aria-label="Text style">
          <ToolbarButton label="Normal paragraph" active={state.paragraph} onMouseDown={handleMouseDown} onClick={() => editor.chain().focus().setParagraph().run()}>
            <ToolIcon name="paragraph" />
          </ToolbarButton>
          {[1, 2, 3].map((level) => (
            <ToolbarButton
              key={level}
              label={`Heading ${level}`}
              active={state[`heading${level}` as "heading1" | "heading2" | "heading3"]}
              onMouseDown={handleMouseDown}
              onClick={() => editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run()}
            >
              <span className="editor-heading-icon">H{level}</span>
            </ToolbarButton>
          ))}
        </div>
        <span className="editor-toolbar-divider" aria-hidden="true" />
        <div className="editor-tool-group" aria-label="Text formatting">
          <ToolbarButton label="Bold (Ctrl+B)" active={state.bold} onMouseDown={handleMouseDown} onClick={() => editor.chain().focus().toggleBold().run()}>
            <ToolIcon name="bold" />
          </ToolbarButton>
          <ToolbarButton label="Italic (Ctrl+I)" active={state.italic} onMouseDown={handleMouseDown} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <ToolIcon name="italic" />
          </ToolbarButton>
          <ToolbarButton label="Underline (Ctrl+U)" active={state.underline} onMouseDown={handleMouseDown} onClick={() => editor.chain().focus().toggleUnderline().run()}>
            <ToolIcon name="underline" />
          </ToolbarButton>
          <ToolbarButton label="Strikethrough" active={state.strike} onMouseDown={handleMouseDown} onClick={() => editor.chain().focus().toggleStrike().run()}>
            <ToolIcon name="strike" />
          </ToolbarButton>
          <ToolbarButton label="Link" active={state.link} onMouseDown={handleMouseDown} onClick={openLinkEditor}>
            <ToolIcon name="link" />
          </ToolbarButton>
        </div>
        <span className="editor-toolbar-divider" aria-hidden="true" />
        <div className="editor-tool-group" aria-label="Lists">
          <ToolbarButton label="Bulleted list" active={state.bulletList} onMouseDown={handleMouseDown} onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <ToolIcon name="bullet" />
          </ToolbarButton>
          <ToolbarButton label="Numbered list" active={state.orderedList} onMouseDown={handleMouseDown} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <ToolIcon name="ordered" />
          </ToolbarButton>
          <ToolbarButton label="Checklist" active={state.taskList} onMouseDown={handleMouseDown} onClick={() => editor.chain().focus().toggleTaskList().run()}>
            <ToolIcon name="checklist" />
          </ToolbarButton>
        </div>
        <span className="editor-toolbar-divider editor-history-divider" aria-hidden="true" />
        <div className="editor-tool-group editor-history-tools" aria-label="History and cleanup">
          <ToolbarButton label="Undo (Ctrl+Z)" disabled={!state.canUndo} onMouseDown={handleMouseDown} onClick={() => editor.chain().focus().undo().run()}>
            <ToolIcon name="undo" />
          </ToolbarButton>
          <ToolbarButton label="Redo (Ctrl+Shift+Z)" disabled={!state.canRedo} onMouseDown={handleMouseDown} onClick={() => editor.chain().focus().redo().run()}>
            <ToolIcon name="redo" />
          </ToolbarButton>
          <ToolbarButton label="Clear formatting" onMouseDown={handleMouseDown} onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
            <ToolIcon name="clear" />
          </ToolbarButton>
        </div>
      </div>
      {linkOpen && (
        <div className="editor-link-row">
          <input
            type="url"
            value={linkUrl}
            onChange={(event) => {
              setLinkUrl(event.target.value);
              setLinkError("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyLink();
              }
            }}
            placeholder="https://example.com"
            aria-label="Link URL"
            className="ui-input min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
          />
          <button type="button" onClick={applyLink} className="ui-button ui-button-primary min-h-0 rounded-lg px-3 py-2 text-xs">
            Apply
          </button>
          <button type="button" onClick={removeLink} className="ui-button ui-button-secondary min-h-0 rounded-lg px-3 py-2 text-xs">
            Remove
          </button>
          <button type="button" onClick={() => setLinkOpen(false)} aria-label="Close link editor" className="ui-button ui-button-ghost min-h-0 rounded-lg px-2 py-2 text-xs">
            <svg viewBox="0 0 20 20" fill="none" className="size-4" aria-hidden="true">
              <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          {linkError && (
            <p role="alert" className="ui-text-error w-full text-xs font-medium">
              {linkError}
            </p>
          )}
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
