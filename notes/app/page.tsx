import Link from "next/link";
import {
  BackgroundSettingsProvider,
  BackgroundSettingsTrigger,
} from "./background-settings";
import NoteForm from "./note-form";
import { ThemeProvider, ThemeToggle } from "./theme-provider";

export default function Home() {
  return (
    <ThemeProvider>
      <BackgroundSettingsProvider>
        <div className="urspace-app relative min-h-screen overflow-hidden">
          <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 pb-12 pt-6 sm:px-8 sm:pt-8 lg:px-12">
            <header className="flex items-center justify-between gap-3">
              <Link
                href="/"
                className="ui-surface-panel flex items-center gap-3 rounded-2xl border px-2 py-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b87553]"
                aria-label="UrSpace home"
              >
                <span className="flex size-10 items-center justify-center rounded-2xl bg-[#bd7958] text-white shadow-[0_6px_18px_rgba(158,98,68,0.2)]">
                  <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
                    <path d="M7 3.75h7.5L19 8.25v12H7a2 2 0 0 1-2-2v-12a2.5 2.5 0 0 1 2-2.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                    <path d="M14 4v5h5M9 13h6M9 16.5h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="ui-text-primary text-[21px] font-semibold tracking-[-0.055em] text-[#3d332d]">
                  UrS<span className="urspace-flip">p</span>ace
                </span>
              </Link>
              <div className="flex items-center gap-2">
                <div className="ui-status-pill hidden items-center gap-2 rounded-full border border-white/80 bg-white/70 px-4 py-2 text-xs font-medium text-[#786d65] shadow-sm sm:flex">
                  <span className="size-2 rounded-full bg-[#d39a76]" />
                  A little space for your thoughts
                </div>
                <ThemeToggle />
                <BackgroundSettingsTrigger />
              </div>
            </header>

            <section className="mx-auto w-full max-w-5xl flex-1 pt-14 sm:pt-20 lg:pt-24">
              <div className="ui-surface-panel mb-9 max-w-2xl rounded-[24px] border px-5 py-5 shadow-sm backdrop-blur-md sm:mb-12 sm:px-7 sm:py-7">
                <p className="ui-text-accent-soft mb-4 text-[11px] font-bold uppercase tracking-[0.2em] text-[#a56849]">
                  Your personal notebook
                </p>
                <h1 className="ui-text-primary text-[clamp(2.5rem,7vw,4.4rem)] font-medium leading-[1.05] tracking-[-0.065em] text-[#3d332d]">
                  Make room for
                  <br className="hidden sm:block" />{" "}
                  <span className="ui-text-accent font-serif italic text-[#b87553]">
                    what matters.
                  </span>
                </h1>
                <p className="ui-text-muted mt-5 max-w-lg text-[15px] leading-7 text-[#786d65] sm:text-base">
                  A calm corner to collect ideas, little reminders, and
                  everything you don&apos;t want to forget.
                </p>
              </div>

              <NoteForm />
            </section>

            <footer className="ui-surface-panel ui-text-muted mt-14 flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-xs text-[#91867f] shadow-sm">
              <svg viewBox="0 0 16 16" fill="none" className="ui-text-accent size-3.5 text-[#c68b68]" aria-hidden="true">
                <path d="M8 13.5s-5-2.8-5-6.4a2.7 2.7 0 0 1 5-1.3 2.7 2.7 0 0 1 5 1.3c0 3.6-5 6.4-5 6.4Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              </svg>
              Made for the thoughts worth keeping
            </footer>
          </main>
        </div>
      </BackgroundSettingsProvider>
    </ThemeProvider>
  );
}
