import { notFound } from "next/navigation";
import { serverApi } from "@/lib/api-client/server";
import NoteDetail from "./note-detail";

export const metadata = { title: "Note" };

export default async function NotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const note = await serverApi.notes.findMine(id);
  if (!note) {
    notFound();
  }

  return <NoteDetail note={note} />;
}