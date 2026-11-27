import type { NextRequest } from "next/server";
import { handle, ok, requireContext } from "@/lib/api/handler";
import { readJson } from "@/lib/api/request";
import { changePasswordSchema } from "@/lib/contracts/profile";
import { changePassword } from "@/lib/domain/profile";

/** Uses the existing Supabase session's updateUser; the login flow is untouched. */
export async function PUT(request: NextRequest) {
  return handle(request, { mutation: true }, async ({ context, request: req }) => {
    const ctx = requireContext(context);
    const input = await readJson(req, changePasswordSchema);
    await changePassword(ctx, input.password);
    return ok({ updated: true });
  });
}
