import type { NextRequest } from "next/server";
import { handle, ok, requireContext } from "@/lib/api/handler";
import { IMPORT_BODY_LIMIT, readJson } from "@/lib/api/request";
import { importNotesSchema } from "@/lib/contracts/note";
import { importMyNotes } from "@/lib/domain/notes";

export async function POST(request: NextRequest) {
  return handle(request, { mutation: true }, async ({ context, request: req }) => {
    const input = await readJson(req, importNotesSchema, IMPORT_BODY_LIMIT);
    const importedCount = await importMyNotes(
      requireContext(context),
      input.notes,
    );
    return ok({ importedCount });
  });
}
