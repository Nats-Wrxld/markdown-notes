import { getMyNotes, summarizeNotes } from "@/lib/notes";
import { AnimatedNumber, HoverLift, Reveal, Stagger, StaggerItem } from "@/components/motion";
import DashboardNotebook from "./notebook";
import ImportNotesBanner from "./import-notes";

export const metadata = { title: "Dashboard" };

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <HoverLift className="ui-surface-card h-full rounded-[20px] border px-5 py-4 sm:px-6 sm:py-5">
      <p className="ui-text-muted text-xs font-medium">{label}</p>
      <AnimatedNumber
        value={value}
        className="ui-text-primary mt-1 block font-serif text-3xl font-medium tracking-[-0.02em]"
      />
    </HoverLift>
  );
}

export default async function DashboardPage() {
  const notes = await getMyNotes();
  const stats = summarizeNotes(notes);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <Reveal className="mb-5 sm:mb-6">
        <p className="ui-text-accent-soft text-[11px] font-bold uppercase tracking-[0.2em]">
          Your personal notebook
        </p>
        <h1 className="ui-text-primary mt-2 font-serif text-[clamp(2rem,5vw,3rem)] font-medium leading-[1.08] tracking-[-0.03em]">
          Make room for what matters.
        </h1>
      </Reveal>

      <Stagger className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StaggerItem>
          <StatCard label="Total notes" value={stats.total} />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Added this week" value={stats.thisWeek} />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Tags in use" value={stats.tagCount} />
        </StaggerItem>
      </Stagger>

      <ImportNotesBanner serverNoteCount={notes.length} />

      <DashboardNotebook notes={notes} />
    </div>
  );
}