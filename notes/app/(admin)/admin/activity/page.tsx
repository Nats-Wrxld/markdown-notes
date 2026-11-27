import { serverApi } from "@/lib/api-client/server";
import { parsePage } from "@/lib/contracts/common";
import { Reveal } from "@/components/motion";
import Pagination from "@/components/pagination";
import { EmptyState } from "@/components/ui";

export const metadata = { title: "Activity log" };

const ACTION_LABELS: Record<string, string> = {
  "auth.signup": "Signed up",
  "auth.login": "Logged in",
  "auth.logout": "Logged out",
  "auth.password_reset": "Reset their password",
  password_changed: "Changed their password",
  "account.created": "Created an account",
  "account.suspended": "Suspended an account",
  "account.reactivated": "Reactivated an account",
  "account.renamed": "Updated a display name",
  "account.reset_requested": "Sent a password reset link",
  "note.updated_by_staff": "Edited a tutor note",
  "note.deleted_by_staff": "Deleted a tutor note",
  "settings.updated": "Updated platform settings",
};

const timeFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const result = await serverApi.admin.listActivity(page);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <Reveal className="mb-8">
        <p className="ui-text-accent-soft text-[11px] font-bold uppercase tracking-[0.2em]">
          Audit trail
        </p>
        <h1 className="ui-text-primary mt-2 font-serif text-[clamp(2rem,5vw,3rem)] font-medium leading-[1.08] tracking-[-0.03em]">
          Platform activity
        </h1>
        <p className="ui-text-muted mt-3 max-w-xl text-sm leading-6">
          Sensitive operations are recorded here: signins, account provisioning, suspensions,
          oversight edits, and settings changes.
        </p>
      </Reveal>

      {result.rows.length === 0 ? (
        <EmptyState
          title="Nothing recorded yet"
          description="Activity will appear as people use the platform."
        />
      ) : (
        <div className="ui-surface-panel overflow-x-auto rounded-[20px] border shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="ui-text-muted border-b border-[var(--border-soft)] text-[11px] uppercase tracking-[0.12em]">
                <th scope="col" className="px-5 py-3 font-semibold">When</th>
                <th scope="col" className="px-5 py-3 font-semibold">Who</th>
                <th scope="col" className="px-5 py-3 font-semibold">Action</th>
                <th scope="col" className="px-5 py-3 font-semibold">Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-soft)]">
              {result.rows.map((entry) => (
                <tr key={entry.id}>
                  <td className="ui-text-muted whitespace-nowrap px-5 py-3.5 text-xs">
                    <time dateTime={entry.created_at}>
                      {timeFormatter.format(new Date(entry.created_at))}
                    </time>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="ui-text-primary block text-xs font-semibold">
                      {entry.actor?.display_name || entry.actor?.email || "System / removed account"}
                    </span>
                    {entry.actor?.display_name && (
                      <span className="ui-text-muted block text-[11px]">{entry.actor.email}</span>
                    )}
                  </td>
                  <td className="ui-text-primary px-5 py-3.5 text-xs font-medium">
                    {ACTION_LABELS[entry.action] ?? entry.action}
                  </td>
                  <td className="ui-text-muted px-5 py-3.5 text-[11px]">
                    {entry.target_type ? `${entry.target_type} ${entry.target_id ?? ""}`.trim() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={result.page} pageCount={result.pageCount} basePath="/admin/activity" />
    </div>
  );
}