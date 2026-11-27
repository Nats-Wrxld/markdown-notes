import type { NextRequest } from "next/server";
import { handle, ok } from "@/lib/api/handler";
import { toProfileDto } from "@/lib/api/serialize";

/**
 * Session probe. Reads the existing Supabase cookie (or a bearer token); it
 * does not create, refresh or replace the login flow.
 */
export async function GET(request: NextRequest) {
  return handle(
    request,
    { auth: "optional", allowSuspended: true },
    async ({ context }) =>
      ok({
        user: context
          ? { id: context.profile.id, email: context.profile.email }
          : null,
        profile: context ? toProfileDto(context.profile) : null,
        via: context?.via ?? null,
      }),
  );
}
