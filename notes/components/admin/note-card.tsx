import Link from "next/link";
import Avatar from "@/components/avatar";
import { getDocumentText } from "@/lib/note-document";
import type { AdminNote } from "@/lib/types";

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

export default function AdminNoteCard({ note }: { note: AdminNote }) {
  const excerpt = getDocumentText(note.body).trim().slice(0, 160);

  return (
    <article className="ui-surface-panel rounded-[20px] border p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">
            <Link
              href={`/admin/notes/${note.id}`}
              className="ui-text-primary underline-offset-4 hover:underline"
            >
              {note.title}
            </Link>
          </h3>
          <p className="ui-text-muted mt-1 line-clamp-2 text-xs leading-5">
            {excerpt || "No content"}
          </p>
        </div>
        <time className="ui-text-muted shrink-0 text-[11px]" dateTime={note.createdAt}>
          {dateFormatter.format(new Date(note.createdAt))}
        </time>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <Avatar profile={note.owner} size={22} />
          <span className="ui-text-secondary truncate text-xs font-medium">
            {note.owner.display_name || note.owner.email}
          </span>
        </span>
        {note.tags.length > 0 && (
          <span className="flex flex-wrap gap-1.5">
            {note.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="ui-badge ui-badge-neutral">
                {tag}
              </span>
            ))}
          </span>
        )}
      </div>
    </article>
  );
}