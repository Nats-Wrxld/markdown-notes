import type { NextRequest } from "next/server";
import { handle, ok, requireContext } from "@/lib/api/handler";
import { parseQuery } from "@/lib/api/request";
import { adminNotesQuerySchema } from "@/lib/contracts/admin";
import { pageMeta } from "@/lib/contracts/common";
import { listNotesForAdmin } from "@/lib/domain/notes";
import { toAdminNoteDto } from "@/lib/api/serialize";

export async function GET(request: NextRequest) {
  return handle(request, {}, async ({ context, request: req }) => {
    const query = parseQuery(req, adminNotesQuerySchema);
    const result = await listNotesForAdmin(requireContext(context), query);
    return ok(
      result.rows.map(toAdminNoteDto),
      pageMeta(query.page, query.pageSize, result.total),
    );
  });
}
