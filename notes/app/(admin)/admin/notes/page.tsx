import { getTutorOptions, listNotes, parsePage } from "@/lib/admin";
import AdminNoteCard from "@/components/admin/note-card";
import { Reveal } from "@/components/motion";
import Pagination from "@/components/pagination";
import { EmptyState } from "@/components/ui";

export const metadata = { title: "Note oversight" };

export default async function AdminNotesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const tutorId = typeof params.tutor === "string" ? params.tutor : "";
  const page = parsePage(params.page);

  const [result, tutors] = await Promise.all([
    listNotes({ page, query, tutorId: tutorId || undefined }),
    getTutorOptions(),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <Reveal className="mb-8">
        <p className="ui-text-accent-soft text-[11px] font-bold uppercase tracking-[0.2em]">
          Oversight
        </p>
        <h1 className="ui-text-primary mt-2 font-serif text-[clamp(2rem,5vw,3rem)] font-medium leading-[1.08] tracking-[-0.03em]">
          Tutor notes
        </h1>
        <p className="ui-text-muted mt-3 max-w-xl text-sm leading-6">
          Notes belong to their tutors. Administrative access is recorded in the audit log and
          disclosed to tutors in the privacy notice.
        </p>
      </Reveal>

      <form method="get" action="/admin/notes" className="mb-6 flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <label htmlFor="note-search" className="ui-text-secondary mb-2 block text-[13px] font-semibold">
            Search titles
          </label>
          <input
            id="note-search"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Note title"
            className="ui-input w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:ring-4"
          />
        </div>
        <div>
          <label htmlFor="note-tutor" className="ui-text-secondary mb-2 block text-[13px] font-semibold">
            Tutor
          </label>
          <select
            id="note-tutor"
            name="tutor"
            defaultValue={tutorId}
            className="ui-input max-w-[16rem] rounded-xl border px-4 py-3 text-sm outline-none transition focus:ring-4"
          >
            <option value="">All tutors</option>
            {tutors.map((tutor) => (
              <option key={tutor.id} value={tutor.id}>
                {tutor.display_name || tutor.email}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="ui-button ui-button-primary">
          Apply
        </button>
      </form>

      <p className="ui-text-muted mb-4 text-xs font-medium">
        {result.total} note{result.total === 1 ? "" : "s"}
        {query ? ` matching “${query}”` : ""}
      </p>

      {result.rows.length === 0 ? (
        <EmptyState
          title="No notes found"
          description={
            query || tutorId
              ? "Try a different search or tutor filter."
              : "Tutor notes will appear here once they start writing."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {result.rows.map((note) => (
            <AdminNoteCard key={note.id} note={note} />
          ))}
        </div>
      )}

      <Pagination
        page={result.page}
        pageCount={result.pageCount}
        basePath="/admin/notes"
        params={{ q: query, tutor: tutorId }}
      />
    </div>
  );
}