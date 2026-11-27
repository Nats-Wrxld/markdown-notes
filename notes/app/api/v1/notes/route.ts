import type { NextRequest } from "next/server";
import { handle, ok, created, requireContext } from "@/lib/api/handler";
import { parseQuery, readJson } from "@/lib/api/request";
import {
  createNoteSchema,
  listNotesQuerySchema,
} from "@/lib/contracts/note";
import { createMyNote, listMyNotes } from "@/lib/domain/notes";
import { toNoteDto } from "@/lib/api/serialize";

export async function GET(request: NextRequest) {
  return handle(request, {}, async ({ context, request: req }) => {
    const query = parseQuery(req, listNotesQuerySchema);
    const page = await listMyNotes(requireContext(context), query);
    return ok(page.items.map(toNoteDto), {
      page: page.meta.page,
      pageSize: page.meta.pageSize,
      total: page.meta.total,
      pageCount: page.meta.pageCount,
      summary: page.summary,
    });
  });
}

export async function POST(request: NextRequest) {
  return handle(request, { mutation: true }, async ({ context, request: req }) => {
    const input = await readJson(req, createNoteSchema);
    const note = await createMyNote(requireContext(context), input);
    return created(toNoteDto(note), `/api/v1/notes/${note.id}`);
  });
}
