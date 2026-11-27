import type { NextRequest } from "next/server";
import { handle, ok, noContent, requireContext } from "@/lib/api/handler";
import { parseId, readJson } from "@/lib/api/request";
import { updateNoteSchema } from "@/lib/contracts/note";
import {
  deleteNoteAsStaff,
  getNoteForAdmin,
  updateNoteAsStaff,
} from "@/lib/domain/notes";
import { toNoteDto, toProfileDto } from "@/lib/api/serialize";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  return handle(request, {}, async ({ context }) => {
    const { id } = await params;
    const result = await getNoteForAdmin(requireContext(context), parseId(id));
    return ok({
      note: toNoteDto(result.note),
      owner: toProfileDto(result.owner),
    });
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  return handle(request, { mutation: true }, async ({ context, request: req }) => {
    const { id } = await params;
    const input = await readJson(req, updateNoteSchema);
    const note = await updateNoteAsStaff(
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
    await deleteNoteAsStaff(requireContext(context), parseId(id));
    return noContent();
  });
}
