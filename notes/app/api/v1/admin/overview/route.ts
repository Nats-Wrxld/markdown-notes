import type { NextRequest } from "next/server";
import { handle, ok, requireContext } from "@/lib/api/handler";
import { getAdminOverview } from "@/lib/domain/notes";
import { toAdminStatsDto } from "@/lib/api/serialize";

export async function GET(request: NextRequest) {
  return handle(request, {}, async ({ context }) =>
    ok(toAdminStatsDto(await getAdminOverview(requireContext(context)))),
  );
}
