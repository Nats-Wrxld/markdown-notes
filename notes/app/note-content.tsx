import type { JSONContent } from "@tiptap/core";
import type { ReactNode } from "react";

type NoteContentProps = {
  document: JSONContent;
};

function renderInline(node: JSONContent, key: string): ReactNode {
  if (node.type !== "text") {
    return renderNode(node, key);
  }

  let content: ReactNode = node.text ?? "";
  for (const [index, mark] of (node.marks ?? []).entries()) {
    switch (mark.type) {
      case "bold":
        content = <strong key={`${key}-mark-${index}`}>{content}</strong>;
        break;
      case "italic":
        content = <em key={`${key}-mark-${index}`}>{content}</em>;
        break;
      case "underline":
        content = <u key={`${key}-mark-${index}`}>{content}</u>;
        break;
      case "strike":
        content = <s key={`${key}-mark-${index}`}>{content}</s>;
        break;
      case "code":
        content = <code key={`${key}-mark-${index}`}>{content}</code>;
        break;
    }
  }

  return <span key={key}>{content}</span>;
}

function renderChildren(node: JSONContent, key: string): ReactNode[] {
  return (node.content ?? []).map((child, index) =>
    renderInline(child, `${key}-${index}`),
  );
}

function renderNode(node: JSONContent, key: string): ReactNode {
  const children = renderChildren(node, key);

  switch (node.type) {
    case "doc":
      return <div key={key}>{children}</div>;
    case "paragraph":
      return <p key={key}>{children.length > 0 ? children : <br />}</p>;
    case "heading": {
      const level = Number(node.attrs?.level);
      if (level === 1) return <h1 key={key}>{children}</h1>;
      if (level === 2) return <h2 key={key}>{children}</h2>;
      return <h3 key={key}>{children}</h3>;
    }
    case "bulletList":
      return <ul key={key}>{children}</ul>;
    case "orderedList":
      return (
        <ol key={key} start={Number(node.attrs?.start) || 1}>
          {children}
        </ol>
      );
    case "listItem":
      return <li key={key}>{children}</li>;
    case "taskList":
      return <ul key={key} className="note-task-list">{children}</ul>;
    case "taskItem":
      return (
        <li key={key} className="note-task-item">
          <input
            type="checkbox"
            checked={node.attrs?.checked === true}
            readOnly
            aria-label={node.attrs?.checked === true ? "Completed task" : "Incomplete task"}
          />
          <div>{children}</div>
        </li>
      );
    case "blockquote":
      return <blockquote key={key}>{children}</blockquote>;
    case "codeBlock":
      return (
        <pre key={key}>
          <code>{children}</code>
        </pre>
      );
    case "horizontalRule":
      return <hr key={key} />;
    case "hardBreak":
      return <br key={key} />;
    default:
      return null;
  }
}

export default function NoteContent({ document }: NoteContentProps) {
  return <div className="saved-note-content">{renderNode(document, "doc")}</div>;
}
