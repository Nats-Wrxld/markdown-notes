import Link from "next/link";
import { getAdminStats } from "@/lib/admin";
import { getCurrentProfile } from "@/lib/auth";
import AdminNoteCard from "@/components/admin/note-card";
import { AnimatedNumber, HoverLift, Reveal, Stagger, StaggerItem } from "@/components/motion";
import { EmptyState } from "@/components/ui";

export const metadata = { title: "Admin overview" };

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

function StatCard({ label, value, href }: { label: string; value: number; href?: string }) {
  const body = (
    <>
      <p className="ui-text-muted text-xs font-medium">{label}</p>
      <AnimatedNumber
        value={value}
        className="ui-text-primary mt-1 block font-serif text-3xl font-medium tracking-[-0.02em]"
      />
    </>
  );
  const className = "ui-surface-panel block h-full rounded-[20px] border px-5 py-4 shadow-sm";
  return href ? (
    <HoverLift className="h-full">
      <Link href={href} className={className}>
        {body}
      </Link>
    </HoverLift>
  ) : (
    <HoverLift className={className}>{body}</HoverLift>
  );
}

export default async function AdminOverviewPage() {
  const [stats, profile] = await Promise.all([getAdminStats(), getCurrentProfile()]);
  const isOwner = profile?.role === "owner";

  return (
    <div className="mx-auto w-full max-w-6xl">
      <Reveal className="mb-8">
        <p className="ui-text-accent-soft text-[11px] font-bold uppercase tracking-[0.2em]">
          {isOwner ? "Owner console" : "Admin console"}
        </p>
        <h1 className="ui-text-primary mt-2 font-serif text-[clamp(2rem,5vw,3rem)] font-medium leading-[1.08] tracking-[-0.03em]">
          Platform overview
        </h1>
      </Reveal>

      <Stagger className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StaggerItem><StatCard label="Tutors" value={stats.tutorTotal} href="/admin/tutors" /></StaggerItem>
        <StaggerItem><StatCard label="Active tutors" value={stats.tutorActive} href="/admin/tutors?status=active" /></StaggerItem>
        <StaggerItem><StatCard label="Suspended" value={stats.tutorSuspended} href="/admin/tutors?status=suspended" /></StaggerItem>
        <StaggerItem><StatCard label="Tutor notes" value={stats.noteTotal} href="/admin/notes" /></StaggerItem>
        <StaggerItem><StatCard label="Notes this week" value={stats.notesThisWeek} /></StaggerItem>
      </Stagger>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="ui-text-primary font-serif text-xl font-medium">Recent notes</h2>
            <Link href="/admin/notes" className="ui-text-accent text-xs font-semibold underline-offset-4 hover:underline">
              View all →
            </Link>
          </div>
          {stats.recentNotes.length === 0 ? (
            <EmptyState
              title="No notes yet"
              description="Notes created by tutors will appear here for oversight."
            />
          ) : (
            <Stagger className="space-y-3">
              {stats.recentNotes.map((note) => (
                <StaggerItem key={note.id}>
                  <AdminNoteCard note={note} />
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="ui-text-primary font-serif text-xl font-medium">Recent activity</h2>
            <Link href="/admin/activity" className="ui-text-accent text-xs font-semibold underline-offset-4 hover:underline">
              Full audit log →
            </Link>
          </div>
          {stats.recentActivity.length === 0 ? (
            <EmptyState
              title="No activity yet"
              description="Signins, account changes, and oversight actions are recorded here."
            />
          ) : (
            <ul className="ui-surface-panel divide-y divide-[var(--border-soft)] rounded-[20px] border shadow-sm">
              {stats.recentActivity.map((entry) => (
                <li key={entry.id} className="flex items-start justify-between gap-4 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="ui-text-primary text-sm font-medium">
                      {ACTION_LABELS[entry.action] ?? entry.action}
                    </p>
                    <p className="ui-text-muted mt-0.5 truncate text-xs">
                      {entry.actor
                        ? entry.actor.display_name || entry.actor.email
                        : "System / removed account"}
                    </p>
                  </div>
                  <time className="ui-text-muted shrink-0 text-[11px]" dateTime={entry.created_at}>
                    {timeFormatter.format(new Date(entry.created_at))}
                  </time>
                </li>
              ))}
            </ul>
          )}
          {isOwner && (
            <p className="ui-text-muted mt-4 text-xs leading-5">
              {stats.adminTotal} administrator{stats.adminTotal === 1 ? "" : "s"} on the platform.{" "}
              <Link href="/admin/settings" className="ui-text-accent font-semibold underline-offset-4 hover:underline">
                Manage admins &amp; settings →
              </Link>
            </p>
          )}
        </section>
      </div>
    </div>
  );
}