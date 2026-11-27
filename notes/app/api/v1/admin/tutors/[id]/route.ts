import type { NextRequest } from "next/server";
import { handle, ok, requireContext } from "@/lib/api/handler";
import { parseId, readJson } from "@/lib/api/request";
import { updateTutorSchema } from "@/lib/contracts/admin";
import { getTutor, renameTutor, setTutorStatus } from "@/lib/domain/admin";
import { toProfileDto } from "@/lib/api/serialize";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  return handle(request, {}, async ({ context }) => {
    const { id } = await params;
    const tutor = await getTutor(requireContext(context), parseId(id));
    return ok(toProfileDto(tutor));
  });
}

/** One resource, two optional fields; the UI sends them separately. */
export async function PATCH(request: NextRequest, { params }: Params) {
  return handle(request, { mutation: true }, async ({ context, request: req }) => {
    const ctx = requireContext(context);
    const { id } = await params;
    const targetId = parseId(id);
    const input = await readJson(req, updateTutorSchema);

    let profile = await getTutor(ctx, targetId);
    if (input.displayName !== undefined) {
      profile = await renameTutor(ctx, targetId, input.displayName);
    }
    if (input.accountStatus !== undefined) {
      profile = await setTutorStatus(ctx, targetId, input.accountStatus);
    }
    return ok(toProfileDto(profile));
  });
}
