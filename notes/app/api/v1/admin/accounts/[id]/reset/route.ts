import type { NextRequest } from "next/server";
import { handle, ok, requireContext } from "@/lib/api/handler";
import { parseId, requestOrigin } from "@/lib/api/request";
import { sendResetLink } from "@/lib/domain/admin";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  return handle(request, { mutation: true }, async ({ context, request: req }) => {
    const { id } = await params;
    const email = await sendResetLink(
      requireContext(context),
      parseId(id),
      requestOrigin(req),
    );
    return ok({ email });
  });
}
