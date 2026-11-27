import type { NextRequest } from "next/server";
import { handle, ok, requireContext } from "@/lib/api/handler";
import { parseId, readJson } from "@/lib/api/request";
import { accountRoleSchema } from "@/lib/contracts/admin";
import { updateAccountRole } from "@/lib/domain/admin";
import { toProfileDto } from "@/lib/api/serialize";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  return handle(request, { mutation: true }, async ({ context, request: req }) => {
    const { id } = await params;
    const input = await readJson(req, accountRoleSchema);
    const profile = await updateAccountRole(
      requireContext(context),
      parseId(id),
      input.role,
    );
    return ok(toProfileDto(profile));
  });
}
