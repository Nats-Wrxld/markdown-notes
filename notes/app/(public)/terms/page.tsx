import Link from "next/link";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";

export const metadata = { title: "Terms of use" };

const SECTIONS = [
  {
    title: "1. About UrSpace",
    body: "UrSpace is a personal note-taking platform for tutors, operated by the UrSpace team. By creating an account you agree to these terms. If you do not agree, please do not use the service.",
  },
  {
    title: "2. Your account",
    body: "You are responsible for keeping your password or connected sign-in account (Google, GitHub) secure and for activity under your account. Provide accurate information when registering. Accounts may be suspended by administrators for misuse; suspended accounts retain their notes but lose access until reactivated.",
  },
  {
    title: "3. Your content",
    body: "You keep ownership of the notes you write. You grant UrSpace the limited right to store and display your notes so the service can function. Do not use UrSpace to store unlawful content or content that infringes others' rights.",
  },
  {
    title: "4. Administrative access",
    body: "Authorized administrators and the platform owner can view tutor notes for oversight and support, and may edit or delete notes where administratively necessary. This access is role-restricted and recorded in an audit log. It is disclosed at signup, on the landing page, and on your profile. UrSpace does not offer end-to-end encryption.",
  },
  {
    title: "5. Availability",
    body: "We work to keep UrSpace available and your notes safe, but the service is provided as-is without guarantees of uninterrupted availability. Features may change as the product evolves.",
  },
  {
    title: "6. Changes to these terms",
    body: "We may update these terms from time to time. Material changes will be communicated through a platform notice. Continued use after changes means you accept the updated terms.",
  },
  {
    title: "7. Contact",
    body: "Questions about these terms or your account should go through your platform administrator or the platform owner.",
  },
];

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-14 sm:px-8">
      <Link href="/" className="ui-text-accent text-xs font-semibold underline-offset-4 hover:underline">
        ← Back to UrSpace
      </Link>
      <Reveal>
        <h1 className="ui-text-primary mt-6 font-serif text-4xl font-medium tracking-[-0.02em]">
          Terms of use
        </h1>
        <p className="ui-text-muted mt-3 text-sm">
          Plain-language terms for using UrSpace. Last updated November 2026.
        </p>
      </Reveal>
      <Stagger className="mt-10 space-y-8">
        {SECTIONS.map((section) => (
          <StaggerItem key={section.title}>
            <section>
              <h2 className="ui-text-primary font-serif text-lg font-medium">{section.title}</h2>
              <p className="ui-text-secondary mt-2 text-sm leading-6">{section.body}</p>
            </section>
          </StaggerItem>
        ))}
      </Stagger>
    </main>
  );
}