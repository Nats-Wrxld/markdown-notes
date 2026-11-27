import Link from "next/link";
import { notFound } from "next/navigation";
import { serverApi } from "@/lib/api-client/server";
import NoteContent from "@/app/note-content";
import Avatar from "@/components/avatar";
import NoteOversight from "@/components/admin/note-oversight";
import { Badge } from "@/components/ui";

export const metadata = { title: "Note oversight" };

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "long",
  timeStyle: "short",
});

export default async function AdminNoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await serverApi.admin.findNote(id);
  if (!result) notFound();

  const { note, owner } = result;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Link
        href="/admin/notes"
        className="ui-text-accent mb-6 inline-block text-xs font-semibold underline-offset-4 hover:underline"
      >
        ← All notes
      </Link>

      <div className="ui-surface-panel mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[20px] border px-5 py-4 shadow-sm">
        <span className="flex min-w-0 items-center gap-3">
          <Avatar profile={owner} size={36} />
          <span className="min-w-0">
            <span className="ui-text-muted block text-[11px] font-medium uppercase tracking-[0.14em]">
              Note owner
            </span>
            <Link
              href={`/admin/tutors/${owner.id}`}
              className="ui-text-primary block truncate text-sm font-semibold underline-offset-4 hover:underline"
            >
              {owner.display_name || owner.email}
            </Link>
          </span>
        </span>
        <Badge tone={owner.account_status === "active" ? "success" : "warning"}>
          {owner.account_status}
        </Badge>
      </div>

      <article className="ui-surface-panel ui-shadow-panel rounded-[24px] border p-7 sm:p-10">
        <h1 className="ui-text-primary font-serif text-[clamp(1.6rem,4vw,2.4rem)] font-medium leading-[1.15] tracking-[-0.02em]">
          {note.title}
        </h1>
        <p className="ui-text-muted mt-3 text-xs">
          Created {dateFormatter.format(new Date(note.createdAt))} · Updated{" "}
          {dateFormatter.format(new Date(note.updatedAt))}
        </p>
        {note.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {note.tags.map((tag) => (
              <span key={tag} className="ui-badge ui-badge-neutral">
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="saved-note-content mt-8">
          <NoteContent document={note.body} />
        </div>
      </article>

      <div className="mt-6">
        <NoteOversight note={note} />
      </div>
    </div>
  );
}