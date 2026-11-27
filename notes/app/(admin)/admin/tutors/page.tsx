import Link from "next/link";
import { serverApi } from "@/lib/api-client/server";
import { parsePage } from "@/lib/contracts/common";
import { getCurrentProfile } from "@/lib/auth";
import Avatar from "@/components/avatar";
import CreateAccountForm from "@/components/admin/create-account-form";
import Pagination from "@/components/pagination";
import { HoverLift, Reveal } from "@/components/motion";
import { Badge, EmptyState } from "@/components/ui";

export const metadata = { title: "Tutors" };

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

export default async function AdminTutorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const status = typeof params.status === "string" ? params.status : "";
  const page = parsePage(params.page);

  const [result, profile] = await Promise.all([
    serverApi.admin.listTutors({
      page,
      pageSize: 20,
      q: query,
      status: status || undefined,
    }),
    getCurrentProfile(),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <Reveal className="mb-8">
        <p className="ui-text-accent-soft text-[11px] font-bold uppercase tracking-[0.2em]">
          Account management
        </p>
        <h1 className="ui-text-primary mt-2 font-serif text-[clamp(2rem,5vw,3rem)] font-medium leading-[1.08] tracking-[-0.03em]">
          Tutors
        </h1>
      </Reveal>

      <Reveal delay={0.08}>
        <section className="ui-surface-panel mb-8 rounded-[24px] border p-7 shadow-sm">
          <h2 className="ui-text-primary font-serif text-xl font-medium">Create an account</h2>
          <p className="ui-text-muted mt-1.5 mb-6 text-sm">
            Provision a tutor{profile?.role === "owner" ? " or administrator" : ""} directly. They can
            log in immediately with the temporary password.
          </p>
          <CreateAccountForm canCreateAdmins={profile?.role === "owner"} />
        </section>
      </Reveal>

      <form method="get" action="/admin/tutors" className="mb-6 flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <label htmlFor="tutor-search" className="ui-text-secondary mb-2 block text-[13px] font-semibold">
            Search
          </label>
          <input
            id="tutor-search"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Name or email"
            className="ui-input w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:ring-4"
          />
        </div>
        <div>
          <label htmlFor="tutor-status" className="ui-text-secondary mb-2 block text-[13px] font-semibold">
            Status
          </label>
          <select
            id="tutor-status"
            name="status"
            defaultValue={status}
            className="ui-input rounded-xl border px-4 py-3 text-sm outline-none transition focus:ring-4"
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
        <button type="submit" className="ui-button ui-button-primary">
          Apply
        </button>
      </form>

      <p className="ui-text-muted mb-4 text-xs font-medium">
        {result.total} tutor{result.total === 1 ? "" : "s"}
        {query ? ` matching “${query}”` : ""}
      </p>

      {result.rows.length === 0 ? (
        <EmptyState
          title="No tutors found"
          description={
            query || status
              ? "Try a different search or filter."
              : "Create the first tutor account above, or wait for public signups."
          }
        />
      ) : (
        <Reveal delay={0.12}>
        <ul className="space-y-3">
          {result.rows.map((tutor) => (
            <li key={tutor.id}>
              <HoverLift>
              <Link
                href={`/admin/tutors/${tutor.id}`}
                className="ui-surface-panel flex flex-wrap items-center gap-4 rounded-[20px] border px-5 py-4 shadow-sm"
              >
                <Avatar profile={tutor} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="ui-text-primary block truncate text-sm font-semibold">
                    {tutor.display_name || tutor.email}
                  </span>
                  <span className="ui-text-muted block truncate text-xs">{tutor.email}</span>
                </span>
                <Badge tone={tutor.account_status === "active" ? "success" : "warning"}>
                  {tutor.account_status}
                </Badge>
                <span className="ui-text-muted hidden text-[11px] sm:block">
                  Joined {dateFormatter.format(new Date(tutor.created_at))}
                </span>
                <span className="ui-text-accent text-xs font-semibold">Manage →</span>
              </Link>
              </HoverLift>
            </li>
          ))}
        </ul>
        </Reveal>
      )}

      <Pagination
        page={result.page}
        pageCount={result.pageCount}
        basePath="/admin/tutors"
        params={{ q: query, status }}
      />
    </div>
  );
}