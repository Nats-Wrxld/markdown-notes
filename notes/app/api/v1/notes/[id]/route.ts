import type { NextRequest } from "next/server";
import { handle, ok, noContent, requireContext } from "@/lib/api/handler";
import { parseId, readJson } from "@/lib/api/request";
import { updateNoteSchema } from "@/lib/contracts/note";
import {
  deleteMyNote,
  getMyNote,
  updateMyNote,
} from "@/lib/domain/notes";
import { toNoteDto } from "@/lib/api/serialize";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  return handle(request, {}, async ({ context }) => {
    const { id } = await params;
    const note = await getMyNote(requireContext(context), parseId(id));
    return ok(toNoteDto(note));
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  return handle(request, { mutation: true }, async ({ context, request: req }) => {
    const { id } = await params;
    const input = await readJson(req, updateNoteSchema);
    const note = await updateMyNote(
      requireContext(context),
      parseId(id),
      input,
    );
    return ok(toNoteDto(note));
  });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  return handle(request, { mutation: true }, async ({ context }) => {
    const { id } = await params;
    await deleteMyNote(requireContext(context), parseId(id));
    return noContent();
  });
}
