import Link from "next/link";
import { Reveal } from "@/components/motion";
import { ThemeToggle } from "@/app/theme-provider";
import { BackgroundSettingsTrigger } from "@/app/background-settings";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <Reveal className="mb-8">
        <p className="ui-text-accent-soft text-[11px] font-bold uppercase tracking-[0.2em]">
          Preferences
        </p>
        <h1 className="ui-text-primary mt-2 font-serif text-[clamp(2rem,5vw,3rem)] font-medium leading-[1.08] tracking-[-0.03em]">
          Make it feel like yours
        </h1>
      </Reveal>

      <div className="space-y-6">
        <Reveal delay={0}>
          <section className="ui-surface-panel rounded-[24px] border p-7 shadow-sm sm:p-8">
            <h2 className="ui-text-primary font-serif text-xl font-medium">Theme</h2>
            <p className="ui-text-muted mt-1.5 mb-6 text-sm leading-6">
              Switch between warm paper light and a calm dark palette. Your choice is saved on this
              device.
            </p>
            <ThemeToggle />
          </section>
        </Reveal>

        <Reveal delay={0.08}>
          <section className="ui-surface-panel rounded-[24px] border p-7 shadow-sm sm:p-8">
            <h2 className="ui-text-primary font-serif text-xl font-medium">Background</h2>
            <p className="ui-text-muted mt-1.5 mb-6 text-sm leading-6">
              Choose a backdrop for your workspace — five hand-picked scenes, or keep it plain.
            </p>
            <BackgroundSettingsTrigger />
          </section>
        </Reveal>

        <Reveal delay={0.16}>
          <section className="ui-surface-panel rounded-[24px] border p-7 shadow-sm sm:p-8">
            <h2 className="ui-text-primary font-serif text-xl font-medium">Account</h2>
            <p className="ui-text-muted mt-1.5 text-sm leading-6">
              Display name, photo, and password live on your profile page.
            </p>
            <Link href="/profile" className="ui-button ui-button-secondary mt-5">
              Open profile →
            </Link>
          </section>
        </Reveal>
      </div>
    </div>
  );
}