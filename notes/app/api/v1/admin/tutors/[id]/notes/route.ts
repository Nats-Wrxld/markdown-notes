import type { NextRequest } from "next/server";
import { handle, ok, requireContext } from "@/lib/api/handler";
import { parseId, parseQuery } from "@/lib/api/request";
import { adminNotesQuerySchema } from "@/lib/contracts/admin";
import { pageMeta } from "@/lib/contracts/common";
import { listNotesForTutor } from "@/lib/domain/notes";
import { toAdminNoteDto } from "@/lib/api/serialize";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  return handle(request, {}, async ({ context, request: req }) => {
    const { id } = await params;
    const query = parseQuery(req, adminNotesQuerySchema);
    const result = await listNotesForTutor(
      requireContext(context),
      parseId(id),
      query.page,
      query.pageSize,
    );
    return ok(
      result.rows.map(toAdminNoteDto),
      pageMeta(query.page, query.pageSize, result.total),
    );
  });
}
