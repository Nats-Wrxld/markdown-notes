import type { NextRequest } from "next/server";
import { handle, ok, requireContext } from "@/lib/api/handler";
import { readFormData } from "@/lib/api/request";
import { AppError } from "@/lib/domain/errors";
import { removeAvatar, uploadAvatar } from "@/lib/domain/profile";

export async function POST(request: NextRequest) {
  return handle(request, { mutation: true }, async ({ context, request: req }) => {
    const ctx = requireContext(context);
    const form = await readFormData(req);
    const file = form.get("avatar");
    if (!(file instanceof File) || file.size === 0) {
      throw new AppError("validation_error", "Choose an image to upload.");
    }
    const result = await uploadAvatar(ctx, file);
    return ok(result);
  });
}

export async function DELETE(request: NextRequest) {
  return handle(request, { mutation: true }, async ({ context }) => {
    await removeAvatar(requireContext(context));
    return ok({ avatarUrl: null });
  });
}
