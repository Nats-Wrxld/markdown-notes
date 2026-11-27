import type { NextRequest } from "next/server";
import { handle, ok } from "@/lib/api/handler";

export async function GET(request: NextRequest) {
  return handle(request, { auth: "none" }, async () =>
    ok({ status: "ok", api: "v1" }),
  );
}
