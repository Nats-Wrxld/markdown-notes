import Link from "next/link";
import { notFound } from "next/navigation";
import { getTutor, listTutorNotes, parsePage, type AdminNote } from "@/lib/admin";
import Avatar from "@/components/avatar";
import AdminNoteCard from "@/components/admin/note-card";
import {
  AccountNameForm,
  AccountStatusButton,
  ResetLinkButton,
} from "@/components/admin/account-controls";
import Pagination from "@/components/pagination";
import { Badge, EmptyState } from "@/components/ui";

export const metadata = { title: "Tutor details" };

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "long" });

export default async function AdminTutorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const page = parsePage(query.page);

  const tutor = await getTutor(id);
  if (!tutor) notFound();

  const notesPage = await listTutorNotes(tutor.id, page);
  const owner = {
    id: tutor.id,
    display_name: tutor.display_name,
    email: tutor.email,
    avatar_url: tutor.avatar_url,
  };
  const notes: AdminNote[] = notesPage.rows.map((note) => ({ ...note, owner }));

  return (
    <div className="mx-auto w-full max-w-5xl">
      <Link
        href="/admin/tutors"
        className="ui-text-accent mb-6 inline-block text-xs font-semibold underline-offset-4 hover:underline"
      >
        ← All tutors
      </Link>

      <section className="ui-surface-panel mb-8 rounded-[24px] border p-7 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar profile={tutor} size={72} />
          <div className="min-w-0 flex-1">
            <h1 className="ui-text-primary truncate font-serif text-2xl font-medium tracking-[-0.02em]">
              {tutor.display_name || tutor.email}
            </h1>
            <p className="ui-text-muted mt-1 truncate text-sm">{tutor.email}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge tone="neutral">tutor</Badge>
              <Badge tone={tutor.account_status === "active" ? "success" : "warning"}>
                {tutor.account_status}
              </Badge>
              <span className="ui-text-muted text-[11px]">
                Joined {dateFormatter.format(new Date(tutor.created_at))}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 border-t border-[var(--border-soft)] pt-8 lg:grid-cols-2">
          <div>
            <h2 className="ui-text-secondary mb-4 text-[13px] font-semibold">Display name</h2>
            <AccountNameForm targetId={tutor.id} defaultValue={tutor.display_name} />
          </div>
          <div>
            <h2 className="ui-text-secondary mb-4 text-[13px] font-semibold">Account access</h2>
            <div className="space-y-4">
              <AccountStatusButton
                targetId={tutor.id}
                currentStatus={tutor.account_status}
                label={tutor.display_name || tutor.email}
              />
              <ResetLinkButton targetId={tutor.id} email={tutor.email} />
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="ui-text-primary font-serif text-xl font-medium">
            Notes <span className="ui-text-muted text-sm">({notesPage.total})</span>
          </h2>
          <Link
            href={`/admin/notes?tutor=${tutor.id}`}
            className="ui-text-accent text-xs font-semibold underline-offset-4 hover:underline"
          >
            Open in note oversight →
          </Link>
        </div>
        {notes.length === 0 ? (
          <EmptyState
            title="No notes"
            description="This tutor hasn’t created any notes yet."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {notes.map((note) => (
              <AdminNoteCard key={note.id} note={note} />
            ))}
          </div>
        )}
        <Pagination
          page={notesPage.page}
          pageCount={notesPage.pageCount}
          basePath={`/admin/tutors/${tutor.id}`}
        />
      </section>
    </div>
  );
}