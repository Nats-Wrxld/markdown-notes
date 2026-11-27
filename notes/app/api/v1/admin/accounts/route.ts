import type { NextRequest } from "next/server";
import { handle, ok, created, requireContext } from "@/lib/api/handler";
import { readJson } from "@/lib/api/request";
import { createAdminAccountSchema } from "@/lib/contracts/admin";
import { createAccount, listAdmins } from "@/lib/domain/admin";
import { toProfileDto } from "@/lib/api/serialize";

export async function GET(request: NextRequest) {
  return handle(request, {}, async ({ context }) => {
    const admins = await listAdmins(requireContext(context));
    return ok(admins.map(toProfileDto));
  });
}

export async function POST(request: NextRequest) {
  return handle(request, { mutation: true }, async ({ context, request: req }) => {
    const input = await readJson(req, createAdminAccountSchema);
    const account = await createAccount(requireContext(context), input);
    return created(
      { id: account.id, email: input.email, role: input.role },
      `/api/v1/admin/tutors/${account.id}`,
    );
  });
}
