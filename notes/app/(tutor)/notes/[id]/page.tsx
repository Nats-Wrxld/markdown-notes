import { notFound } from "next/navigation";
import { getMyNote } from "@/lib/notes";
import NoteDetail from "./note-detail";

export const metadata = { title: "Note" };

export default async function NotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const note = await getMyNote(id);
  if (!note) {
    notFound();
  }

  return <NoteDetail note={note} />;
}