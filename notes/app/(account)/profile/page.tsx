import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { Reveal } from "@/components/motion";
import { Badge } from "@/components/ui";
import AvatarManager from "./avatar-manager";
import { ChangePasswordForm, DisplayNameForm } from "./profile-forms";

export const metadata = { title: "Profile" };

function Section({
  title,
  description,
  children,
  delay = 0,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <Reveal delay={delay}>
      <section className="ui-surface-panel ui-shadow-panel rounded-[24px] border p-7 sm:p-8">
        <h2 className="ui-text-primary font-serif text-xl font-medium tracking-[-0.02em]">{title}</h2>
        <p className="ui-text-muted mt-1.5 text-sm leading-6">{description}</p>
        <div className="mt-6">{children}</div>
      </section>
    </Reveal>
  );
}

export default async function ProfilePage() {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  const memberSince = new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(
    new Date(profile.created_at),
  );
  const roleTone = profile.role === "owner" ? "accent" : profile.role === "admin" ? "warning" : "neutral";

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Reveal className="mb-8">
        <p className="ui-text-accent-soft text-[11px] font-bold uppercase tracking-[0.2em]">
          Your account
        </p>
        <h1 className="ui-text-primary mt-2 font-serif text-[clamp(2rem,5vw,3rem)] font-medium leading-[1.08] tracking-[-0.03em]">
          Profile &amp; settings
        </h1>
      </Reveal>

      <div className="space-y-6">
        <Section
          delay={0}
          title="Photo"
          description="A small portrait that appears next to your name across UrSpace."
        >
          <AvatarManager profile={profile} />
        </Section>

        <Section
          delay={0.08}
          title="Display name"
          description="How your name appears to administrators and on your notes."
        >
          <DisplayNameForm defaultValue={profile.display_name} />
        </Section>

        <Section
          delay={0.16}
          title="Password"
          description="Choose a strong password you don’t use anywhere else."
        >
          <ChangePasswordForm />
        </Section>

        <Section delay={0.24} title="Account details" description="Managed by the platform — contact an administrator to change these.">
          <dl className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <dt className="ui-text-muted font-medium">Email</dt>
              <dd className="ui-text-primary font-semibold">{profile.email}</dd>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <dt className="ui-text-muted font-medium">Role</dt>
              <dd>
                <Badge tone={roleTone}>{profile.role}</Badge>
              </dd>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <dt className="ui-text-muted font-medium">Status</dt>
              <dd>
                <Badge tone={profile.account_status === "active" ? "success" : "warning"}>
                  {profile.account_status}
                </Badge>
              </dd>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <dt className="ui-text-muted font-medium">Member since</dt>
              <dd className="ui-text-primary font-semibold">{memberSince}</dd>
            </div>
          </dl>
          {profile.role === "tutor" && (
            <p className="ui-text-muted mt-6 rounded-xl border px-4 py-3 text-xs leading-5">
              Privacy note: platform administrators and the owner can view tutor notes for
              oversight and support. Your notes are never visible to other tutors.
            </p>
          )}
        </Section>
      </div>
    </div>
  );
}