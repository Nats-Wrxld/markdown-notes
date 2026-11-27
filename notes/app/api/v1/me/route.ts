import type { NextRequest } from "next/server";
import { handle, ok, requireContext } from "@/lib/api/handler";
import { readJson } from "@/lib/api/request";
import { updateProfileSchema } from "@/lib/contracts/profile";
import { updateDisplayName } from "@/lib/domain/profile";
import { toProfileDto } from "@/lib/api/serialize";

export async function GET(request: NextRequest) {
  return handle(request, {}, async ({ context }) =>
    ok(toProfileDto(requireContext(context).profile)),
  );
}

export async function PATCH(request: NextRequest) {
  return handle(request, { mutation: true }, async ({ context, request: req }) => {
    const ctx = requireContext(context);
    const input = await readJson(req, updateProfileSchema);
    const profile = await updateDisplayName(ctx, input.displayName);
    return ok(toProfileDto(profile));
  });
}
