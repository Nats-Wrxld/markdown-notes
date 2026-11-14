import Link from "next/link";
import { getPlatformSettings, listAdmins } from "@/lib/admin";
import { requireOwner } from "@/lib/auth";
import Avatar from "@/components/avatar";
import { AccountStatusButton } from "@/components/admin/account-controls";
import CreateAccountForm from "@/components/admin/create-account-form";
import SettingsForm from "@/components/admin/settings-form";
import { Reveal } from "@/components/motion";
import { Badge, EmptyState } from "@/components/ui";

export const metadata = { title: "Platform settings" };

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

export default async function AdminSettingsPage() {
  await requireOwner();
  const [settings, admins] = await Promise.all([getPlatformSettings(), listAdmins()]);

  return (
    <div className="mx-auto w-full max-w-4xl">
      <Reveal className="mb-8">
        <p className="ui-text-accent-soft text-[11px] font-bold uppercase tracking-[0.2em]">
          Owner only
        </p>
        <h1 className="ui-text-primary mt-2 font-serif text-[clamp(2rem,5vw,3rem)] font-medium leading-[1.08] tracking-[-0.03em]">
          Platform settings
        </h1>
      </Reveal>

      <div className="space-y-8">
        <section className="ui-surface-panel rounded-[24px] border p-7 shadow-sm sm:p-8">
          <h2 className="ui-text-primary font-serif text-xl font-medium">Public access</h2>
          <p className="ui-text-muted mt-1.5 mb-6 text-sm">
            Control public registration and the notice shown on public pages.
          </p>
          <SettingsForm
            allowPublicSignup={settings.allowPublicSignup}
            platformNotice={settings.platformNotice}
          />
        </section>

        <section className="ui-surface-panel rounded-[24px] border p-7 shadow-sm sm:p-8">
          <h2 className="ui-text-primary font-serif text-xl font-medium">Administrators</h2>
          <p className="ui-text-muted mt-1.5 mb-6 text-sm">
            Admins manage tutors and notes. Only you can create, suspend, or reactivate admins.
          </p>
          {admins.length === 0 ? (
            <EmptyState
              title="No administrators yet"
              description="Create the first administrator below to help manage the platform."
            />
          ) : (
            <ul className="mb-8 space-y-3">
              {admins.map((admin) => (
                <li
                  key={admin.id}
                  className="ui-surface-subtle flex flex-wrap items-center gap-4 rounded-[20px] border px-5 py-4"
                >
                  <Avatar profile={admin} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="ui-text-primary block truncate text-sm font-semibold">
                      {admin.display_name || admin.email}
                    </span>
                    <span className="ui-text-muted block truncate text-xs">
                      {admin.email} · Joined {dateFormatter.format(new Date(admin.created_at))}
                    </span>
                  </span>
                  <Badge tone={admin.account_status === "active" ? "success" : "warning"}>
                    {admin.account_status}
                  </Badge>
                  <AccountStatusButton
                    targetId={admin.id}
                    currentStatus={admin.account_status}
                    label={admin.display_name || admin.email}
                  />
                </li>
              ))}
            </ul>
          )}
          <h3 className="ui-text-secondary mb-4 text-[13px] font-semibold">Create an account</h3>
          <CreateAccountForm canCreateAdmins />
        </section>

        <p className="ui-text-muted text-xs">
          Looking for sensitive-operation history?{" "}
          <Link href="/admin/activity" className="ui-text-accent font-semibold underline-offset-4 hover:underline">
            Open the audit log →
          </Link>
        </p>
      </div>
    </div>
  );
}