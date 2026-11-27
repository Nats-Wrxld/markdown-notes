import type { NextRequest } from "next/server";
import { handle, ok, created, requireContext } from "@/lib/api/handler";
import { parseQuery, readJson } from "@/lib/api/request";
import {
  adminTutorsQuerySchema,
  createAdminAccountSchema,
} from "@/lib/contracts/admin";
import { pageMeta } from "@/lib/contracts/common";
import { createAccount, listTutors } from "@/lib/domain/admin";
import { toProfileDto } from "@/lib/api/serialize";

export async function GET(request: NextRequest) {
  return handle(request, {}, async ({ context, request: req }) => {
    const query = parseQuery(req, adminTutorsQuerySchema);
    const result = await listTutors(requireContext(context), query);
    return ok(result.rows.map(toProfileDto), pageMeta(query.page, query.pageSize, result.total));
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
