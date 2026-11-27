import type { NextRequest } from "next/server";
import { handle, ok } from "@/lib/api/handler";
import { getPublicSettings } from "@/lib/domain/settings";

/** Public, non-personalised configuration. Cached behind a short TTL. */
export async function GET(request: NextRequest) {
  return handle(request, { auth: "none" }, async () => {
    const settings = await getPublicSettings();
    return ok(settings);
  });
}
