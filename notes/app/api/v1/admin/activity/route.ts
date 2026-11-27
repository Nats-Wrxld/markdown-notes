import type { NextRequest } from "next/server";
import { handle, ok, requireContext } from "@/lib/api/handler";
import { parseQuery } from "@/lib/api/request";
import { paginationSchema, pageMeta } from "@/lib/contracts/common";
import { listActivity } from "@/lib/domain/admin";
import { toAuditEntryDto } from "@/lib/api/serialize";

export async function GET(request: NextRequest) {
  return handle(request, {}, async ({ context, request: req }) => {
    const query = parseQuery(req, paginationSchema);
    const result = await listActivity(
      requireContext(context),
      query.page,
      query.pageSize,
    );
    return ok(
      result.rows.map(toAuditEntryDto),
      pageMeta(query.page, query.pageSize, result.total),
    );
  });
}
